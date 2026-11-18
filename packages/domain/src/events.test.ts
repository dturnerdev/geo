import { describe, expect, it } from 'vitest';
import {
  CURRENT_EVENT_SCHEMA,
  domainEventSchema,
  eventContextSchema,
  type DomainEvent,
  type EventPayloadOf,
  type EventType,
} from './index.ts';
import { upgradeDomainEvent } from './upgraders.ts';

let sequence = 0;

export function fixtureEvent<TType extends EventType>(
  type: TType,
  payload: EventPayloadOf<TType>,
  at = 1_700_000_000_000,
): DomainEvent {
  sequence += 1;
  const suffix = sequence.toString(16).padStart(12, '0');
  return domainEventSchema.parse({
    id: `0192f000-0000-7000-8000-${suffix}`,
    type,
    schema: CURRENT_EVENT_SCHEMA[type],
    at,
    tz: 'Europe/London',
    origin: '0192f000-0000-7000-8000-0000000000aa',
    contextId: 1,
    payload,
  });
}

export function fixtureEvents(): readonly DomainEvent[] {
  return [
    fixtureEvent('ItemMet', { itemId: 'country-fr' }),
    fixtureEvent('AnswerRecorded', {
      itemId: 'country-fr',
      roundId: 'round-1',
      rating: 3,
      level: 1,
      format: 'tap',
      response: { lng: 2.35, lat: 48.85 },
      geometry: { distanceMetres: 1200 },
      aids: [],
      hintsUsed: 0,
      surprise: false,
      roundSeed: 'seed-1',
    }),
    fixtureEvent('RoundStarted', { roundId: 'round-1', seed: 'seed-1' }),
    fixtureEvent('RoundEnded', { roundId: 'round-1', reason: 'complete' }),
    fixtureEvent('RoundParked', { roundId: 'round-1', reason: 'background' }),
    fixtureEvent('RoundResumed', { roundId: 'round-1' }),
    fixtureEvent('SettingChanged', { key: 'units', value: 'metric' }),
    fixtureEvent('ExperimentAssigned', { experimentId: 'E01', variant: 'A' }),
    fixtureEvent('ExperimentExposed', {
      experimentId: 'E01',
      variant: 'A',
      surface: 'map',
    }),
    fixtureEvent('ParametersAdopted', {
      modelVersion: 'FSRS-6',
      params: { stability: 1 },
      reviewCount: 20,
      logLossBefore: 0.9,
      logLossAfter: 0.8,
    }),
    fixtureEvent('EmphasisAdded', {
      entryId: 'emphasis-1',
      target: 'Europe',
      weight: 2,
      source: 'topic',
      start: 1_700_000_000_000,
    }),
    fixtureEvent('EmphasisEnded', { entryId: 'emphasis-1', reason: 'expired' }),
    fixtureEvent('DailyChallengeCompleted', {
      date: '2026-11-18',
      challengeId: 'daily-1',
      results: [{ itemId: 'country-fr', correct: true }],
    }),
    fixtureEvent('ContentPackApplied', { packVersion: '1.0.0', dataFormat: '1' }),
    fixtureEvent('ImportCompleted', { added: 1, skipped: 0, sourceExportedAt: 1 }),
  ];
}

export const fixtureContext = eventContextSchema.parse({
  id: 1,
  appVersion: '0.0.0',
  contentPackVersion: '1.0.0',
  graderVersions: { tap: '1' },
  platform: 'test',
});

describe('event fixtures', () => {
  it('AC-01.9 every current payload version reads through the upgraders', () => {
    const fixtures = fixtureEvents();
    expect(fixtures).toHaveLength(15);

    for (const fixture of fixtures) {
      const upgraded = upgradeDomainEvent(fixture);
      expect(upgraded.ok, fixture.type).toBe(true);
      if (upgraded.ok) {
        expect(upgraded.value).toEqual(fixture);
        expect(upgraded.value.schema).toBe(CURRENT_EVENT_SCHEMA[fixture.type]);
      }
    }
  });

  it('rejects a payload schema from a newer app version', () => {
    const fixture = fixtureEvents()[0];
    if (fixture === undefined) {
      throw new Error('fixture missing');
    }
    const upgraded = upgradeDomainEvent({ ...fixture, schema: fixture.schema + 1 });
    expect(upgraded.ok).toBe(false);
    if (!upgraded.ok) {
      expect(upgraded.error.kind).toBe('newer-schema');
    }
  });

  it('rejects a payload that does not match its Zod schema', () => {
    const upgraded = upgradeDomainEvent({
      id: '0192f000-0000-7000-8000-000000000001',
      type: 'AnswerRecorded',
      schema: 1,
      at: 1,
      tz: 'UTC',
      origin: '0192f000-0000-7000-8000-0000000000aa',
      contextId: 1,
      payload: { rating: 'not-a-number' },
    });
    expect(upgraded.ok).toBe(false);
  });
});
