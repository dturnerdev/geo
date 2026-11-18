import { projectEvents, sortEvents, type DomainEvent, type EventContext } from '@geo/domain';
import { InMemoryStore } from '@geo/storage';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyImport, parseImportFile } from './import.ts';
import { exportProgress, exportProgressJsonLines, type ExportHeader } from './export.ts';
import { sha256Hex } from './sha256.ts';
import { makeAnswer, makeSetting, testFactory, testIdentity } from './test-helpers.ts';

function seedStore(): {
  readonly store: InMemoryStore;
  readonly events: readonly DomainEvent[];
  readonly context: EventContext;
  readonly contexts: ReadonlyMap<EventContext['id'], EventContext>;
} {
  const { factory, context } = testFactory();
  const events = [
    factory.create('RoundStarted', { roundId: 'round-1', seed: 'seed-1' }, { at: 1_000 }),
    factory.create('ItemMet', { itemId: 'country-fr' }, { at: 1_001 }),
    makeAnswer(factory, 1_002, 'country-fr'),
    makeAnswer(factory, 1_003, 'country-de'),
    makeSetting(factory, 1_004, 'units', 'metric'),
    factory.create(
      'ExperimentAssigned',
      { experimentId: 'E01', variant: 'A', version: 1 },
      { at: 1_005 },
    ),
    factory.create(
      'ParametersAdopted',
      {
        modelVersion: 'FSRS-6',
        params: { stability: 1 },
        reviewCount: 20,
        logLossBefore: 0.9,
        logLossAfter: 0.8,
      },
      { at: 1_006 },
    ),
    factory.create(
      'EmphasisAdded',
      {
        entryId: 'emphasis-1',
        target: 'Europe',
        weight: 2,
        source: 'topic',
        start: 1_006,
      },
      { at: 1_007 },
    ),
  ];
  const store = new InMemoryStore();
  return { store, events, context, contexts: new Map([[context.id, context]]) };
}

function makeImportOptions(): Parameters<typeof applyImport>[2] {
  const { factory } = testFactory();
  return {
    makeImportCompleted: (payload) => factory.create('ImportCompleted', payload, { at: 9_000 }),
  };
}

describe('export and import', () => {
  it('AC-01.5 export then import into an empty store gives an equal projection', async () => {
    const original = seedStore();
    expect((await original.store.append(original.events)).ok).toBe(true);

    const exported = await exportProgress(original.store, {
      appVersion: '0.0.0',
      exportedAt: 1_500,
      contexts: original.contexts,
    });
    expect(exported.ok).toBe(true);
    if (!exported.ok) {
      return;
    }

    const imported = new InMemoryStore();
    const parsed = await parseImportFile(imported, exported.value);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    const applied = await applyImport(imported, parsed.value, makeImportOptions());
    expect(applied.ok).toBe(true);

    const before = projectEvents(original.events);
    const afterEvents: DomainEvent[] = [];
    for await (const event of imported.readAll()) {
      afterEvents.push(event);
    }
    expect(projectEvents(afterEvents)).toEqual(before);
  });

  it('AC-01.6 importing the same file twice adds 0 events and leaves state unchanged', async () => {
    const original = seedStore();
    await original.store.append(original.events);
    const exported = await exportProgress(original.store, {
      appVersion: '0.0.0',
      exportedAt: 1_500,
      contexts: original.contexts,
    });
    if (!exported.ok) {
      throw new Error('export failed');
    }

    const target = new InMemoryStore();
    const first = await parseImportFile(target, exported.value);
    if (!first.ok) {
      throw new Error('first parse failed');
    }
    const firstApply = await applyImport(target, first.value, makeImportOptions());
    expect(firstApply.ok).toBe(true);

    const countAfterFirst = await target.count();
    const projectionAfterFirst = projectEvents(first.value.events);
    const second = await parseImportFile(target, exported.value);
    if (!second.ok) {
      throw new Error('second parse failed');
    }
    expect(second.value.preview.newEvents).toBe(0);
    const secondApply = await applyImport(target, second.value, makeImportOptions());
    expect(secondApply.ok).toBe(true);
    if (secondApply.ok) {
      expect(secondApply.value.report).toEqual({ added: 0, skipped: first.value.events.length });
      expect(secondApply.value.completedEvent).toBeNull();
    }
    expect(await target.count()).toBe(countAfterFirst);
    expect(projectionAfterFirst).toEqual(projectEvents(second.value.events));
  });

  it('AC-01.7 merging two logs equals projecting their union in (at, id) order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 0, max: 30 }), { maxLength: 15 }),
        fc.array(fc.integer({ min: 0, max: 30 }), { maxLength: 15 }),
        async (leftTimes, rightTimes) => {
          const left = testFactory();
          const right = testFactory();
          const leftEvents = leftTimes.map((time, index) =>
            makeAnswer(left.factory, 1_000 + time, `left-${index}`),
          );
          const rightEvents = rightTimes.map((time, index) =>
            makeSetting(right.factory, 1_000 + time, `key-${index}`, index),
          );

          const store = new InMemoryStore();
          await store.append(leftEvents);
          await store.importBatch(rightEvents);

          const stored: DomainEvent[] = [];
          for await (const event of store.readAll()) {
            stored.push(event);
          }

          expect(projectEvents(stored)).toEqual(
            projectEvents(sortEvents([...leftEvents, ...rightEvents])),
          );
        },
      ),
      { numRuns: 30, verbose: true },
    );
  });

  it('AC-01.8 rejects a corrupt line, wrong checksum or newer format without changing the store', async () => {
    const original = seedStore();
    await original.store.append(original.events);
    const lines = await exportProgressJsonLines(original.store, {
      appVersion: '0.0.0',
      exportedAt: 1_500,
      contexts: original.contexts,
    });
    if (!lines.ok) {
      throw new Error('export failed');
    }

    const parts = lines.value.trimEnd().split('\n');
    const header = JSON.parse(parts[0] ?? '{}') as ExportHeader;
    const bodyLines = parts.slice(1);

    const withHeader = (next: ExportHeader, body: readonly string[]): Uint8Array =>
      new TextEncoder().encode(`${JSON.stringify(next)}\n${body.join('\n')}\n`);

    const corruptBody = [...bodyLines];
    corruptBody[0] = '{"id":"not-json"';
    const corruptHeader = { ...header, sha256: sha256Hex(corruptBody.join('\n')) };

    const wrongChecksum = { ...header, sha256: '0'.repeat(64) };
    const newerFormat = { ...header, formatVersion: header.formatVersion + 1 };

    for (const bytes of [
      withHeader(corruptHeader, corruptBody),
      withHeader(wrongChecksum, bodyLines),
      withHeader(newerFormat, bodyLines),
    ]) {
      const store = new InMemoryStore();
      const parsed = await parseImportFile(store, bytes);
      expect(parsed.ok).toBe(false);
      expect(await store.count()).toBe(0);
    }

    const newer = await parseImportFile(new InMemoryStore(), withHeader(newerFormat, bodyLines));
    expect(newer.ok).toBe(false);
    if (!newer.ok) {
      expect(newer.error.kind).toBe('newer-format');
    }
  });

  it('writes the documented filename and header shape', async () => {
    const { store, contexts } = seedStore();
    const lines = await exportProgressJsonLines(store, {
      appVersion: '1.2.3',
      exportedAt: Date.UTC(2026, 10, 18),
      contexts,
    });
    expect(lines.ok).toBe(true);
    if (!lines.ok) {
      return;
    }
    const header = JSON.parse(lines.value.split('\n')[0] ?? '{}') as ExportHeader;
    expect(header.format).toBe('geo-export');
    expect(header.formatVersion).toBe(1);
    expect(header.appVersion).toBe('1.2.3');
    expect(header.eventCount).toBe(0);
    expect(header.sha256).toBe(sha256Hex(''));
  });
});

describe('sha256', () => {
  it('matches the published empty-string vector', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

describe('install identity', () => {
  it('creates distinct install and origin ids', () => {
    const identity = testIdentity();
    expect(identity.installId).not.toBe(identity.origin);
  });
});
