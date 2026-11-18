import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type {
  AnswerRecordedPayload,
  DomainEvent,
  EventPayloadOf,
  EventType,
} from '../../../domain/src/index.ts';
import { DAY_MS } from './analysis.ts';
import { calibrationBins } from './calibration.ts';
import { computeMetrics } from './compute.ts';

let counter = 0;

function makeEvent<TType extends EventType>(
  type: TType,
  payload: EventPayloadOf<TType>,
  at: number,
  tz = 'UTC',
): DomainEvent {
  counter += 1;
  return {
    id: `0192f000-0000-7000-8000-${counter.toString(16).padStart(12, '0')}`,
    type,
    schema: 1,
    at,
    tz,
    origin: '0192f000-0000-7000-8000-0000000000aa',
    contextId: 1,
    payload,
  } as unknown as DomainEvent;
}

function answer(at: number, overrides: Partial<AnswerRecordedPayload> = {}): DomainEvent {
  return makeEvent(
    'AnswerRecorded',
    {
      itemId: 'country-fr',
      facet: 'capital',
      roundId: 'round-1',
      rating: 3,
      level: 1,
      format: 'tap',
      response: { responseTimeMs: 1_000 },
      geometry: {},
      aids: [],
      hintsUsed: 0,
      surprise: false,
      roundSeed: 'seed-1',
      ...overrides,
    },
    at,
  );
}

const NOW = 200 * DAY_MS;

function goldenFixture(): readonly DomainEvent[] {
  const events: DomainEvent[] = [
    makeEvent('ExperimentAssigned', { experimentId: 'E01', variant: 'A', version: 1 }, 0),
    makeEvent('ExperimentExposed', { experimentId: 'E01', variant: 'A', surface: 'round' }, 0),
  ];
  for (let index = 0; index < 20; index += 1) {
    events.push(
      answer(index * DAY_MS, {
        itemId: 'alpha',
        surprise: true,
        format: index === 0 ? 'tap' : index % 2 === 0 ? 'type' : 'choice',
      }),
    );
  }
  for (let index = 0; index < 31; index += 1) {
    events.push(
      answer(index * DAY_MS, {
        itemId: 'beta',
        format: `format-${index}`,
      }),
    );
  }
  for (let index = 0; index < 200; index += 1) {
    events.push(answer(index * DAY_MS, { itemId: 'gamma' }));
  }
  return events;
}

const GOLDEN_NOW = 210 * DAY_MS;

describe('FE04 metrics', () => {
  it('AC-04.1 golden fixture logs produce exact expected metric values on web', () => {
    const report = computeMetrics(goldenFixture(), { retiredItemIds: [] }, GOLDEN_NOW);
    expect(report.durableKnowledge).toBe(3);
    expect(report.surpriseAccuracy).toBe(1);
    expect(report.efficiencyPerHour).toBeCloseTo(43.02788844621514, 12);
    expect(report.calibration).not.toBeNull();
    expect(report.calibration?.logLoss).toBeCloseTo(0.021655192644494677, 12);
    expect(report.calibration?.rmseBins).toBeCloseTo(0.017485957721908085, 12);
    expect(report.transfer).toBe(1);
    expect([...report.byVariant.keys()]).toEqual(['E01']);
    expect([...(report.byVariant.get('E01')?.keys() ?? [])]).toEqual(['A']);
    expect(report.byVariant.get('E01')?.get('A')?.durableKnowledge).toBe(3);
  });

  it.skip('AC-04.1 golden fixture logs produce exact expected metric values on Android', () => {
    // Needs the Galaxy A07 4G reference replay harness (device worker).
  });

  it('AC-04.2 same-day answers are excluded from calibration', () => {
    const base: DomainEvent[] = [];
    for (let day = 0; day < 199; day += 1) {
      base.push(answer(day * DAY_MS + 12 * 60 * 60 * 1000));
    }
    // One extra answer on the same local day as the previous one.
    const withSameDay = [...base, answer(198 * DAY_MS + 13 * 60 * 60 * 1000)];
    expect(computeMetrics(withSameDay, {}, NOW).calibration).toBeNull();

    const differentDay = [...withSameDay, answer(199 * DAY_MS + 12 * 60 * 60 * 1000)];
    expect(computeMetrics(differentDay, {}, NOW).calibration).not.toBeNull();
  });

  it('AC-04.3 "Show me" answers never count as incorrect in any metric', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            rating: fc.integer({ min: 1, max: 4 }),
            surprise: fc.boolean(),
            format: fc.constantFrom('tap', 'type', 'choice'),
            day: fc.integer({ min: 0, max: 400 }),
          }),
          { maxLength: 40 },
        ),
        (entries) => {
          const normal = entries.map((entry) =>
            answer(entry.day * DAY_MS + 12 * 60 * 60 * 1000, {
              rating: entry.rating,
              surprise: entry.surprise,
              format: entry.format,
            }),
          );
          const shown = entries.map((entry) =>
            answer(entry.day * DAY_MS + 12 * 60 * 60 * 1000, {
              rating: 1,
              surprise: entry.surprise,
              format: entry.format,
              aids: ['showMe'],
            }),
          );
          const withShowMe = [...normal, ...shown].sort((left, right) => left.at - right.at);
          const normalReport = computeMetrics(normal, {}, NOW);
          const shownReport = computeMetrics(withShowMe, {}, NOW);

          expect(shownReport.surpriseAccuracy).toBe(normalReport.surpriseAccuracy);
          expect(shownReport.transfer).toBe(normalReport.transfer);
          expect(shownReport.calibration).toEqual(normalReport.calibration);
          expect(shownReport.durableKnowledge).toBe(normalReport.durableKnowledge);
        },
      ),
      { numRuns: 40 },
    );
  });

  it('AC-04.4 a metric below its minimum sample returns null', () => {
    const report = computeMetrics([answer(DAY_MS, { surprise: true })], {}, NOW);
    expect(report.durableKnowledge).toBe(0);
    expect(report.surpriseAccuracy).toBeNull();
    expect(report.efficiencyPerHour).toBeNull();
    expect(report.calibration).toBeNull();
    expect(report.transfer).toBeNull();
  });

  it('AC-04.9 metrics for a 10,000-event log compute in under a second locally', () => {
    const events: DomainEvent[] = [];
    for (let index = 0; index < 10_000; index += 1) {
      events.push(
        answer(index * 60_000, {
          itemId: `item-${index}`,
          rating: index % 4 === 0 ? 1 : 3,
          format: index % 3 === 0 ? 'tap' : index % 3 === 1 ? 'type' : 'choice',
        }),
      );
    }
    const started = performance.now();
    computeMetrics(events, {}, NOW);
    expect(performance.now() - started).toBeLessThan(1_000);
  });

  it.skip('AC-04.9 metrics for a 10,000-event log compute in under a second on the Galaxy A07 4G, off the main thread', () => {
    // Needs the Redmi A5/Galaxy A07 4G device harness and the web Worker host.
  });

  it('AC-04.11 with 199 answers calibration is null; with 200 it has a value and every used bin has at least 20 answers', () => {
    const events: DomainEvent[] = [];
    for (let day = 0; day < 200; day += 1) {
      events.push(answer(day * DAY_MS + 12 * 60 * 60 * 1000));
    }
    expect(computeMetrics(events.slice(0, 199), {}, NOW).calibration).toBeNull();
    expect(computeMetrics(events, {}, NOW).calibration).not.toBeNull();

    const samples = events.map((_, index) => {
      const actual: 0 | 1 = index % 2 === 0 ? 1 : 0;
      return {
        predicted: 0.25 + (index % 4) * 0.2,
        actual,
      };
    });
    const bins = calibrationBins(samples);
    for (const bin of bins) {
      expect(bin.count).toBeGreaterThanOrEqual(20);
    }
  });

  it('counts retired items out of durable knowledge only', () => {
    const events = goldenFixture();
    const report = computeMetrics(events, { retiredItemIds: ['alpha'] }, GOLDEN_NOW);
    expect(report.durableKnowledge).toBe(2);
    expect(report.surpriseAccuracy).toBe(1);
  });
});
