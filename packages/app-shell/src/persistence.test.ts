import { projectEvents, type DomainEvent } from '@geo/domain';
import { InMemoryStore } from '@geo/storage';
import { describe, expect, it } from 'vitest';
import { appendWithRetry, PendingEventBuffer } from './append.ts';
import { MonotonicClock } from './clock.ts';
import { restoreProjection } from './restore.ts';
import { deleteEverything } from './wipe.ts';
import { makeAnswer, testFactory, testIdentity } from './test-helpers.ts';

describe('persistence behaviour', () => {
  it.skip('AC-01.2 requires Android and web E2E process-kill harness', () => {
    // Skipped: no device or browser E2E runner in this worktree.
  });

  it.skip('AC-01.3 requires the Galaxy A07 4G reference device', () => {
    // Skipped: reference hardware is not available locally.
  });

  it.skip('AC-01.4 requires the Galaxy A07 4G reference device', () => {
    // Skipped: reference hardware is not available locally.
  });

  it.skip('AC-01.14 time in the background is not counted', () => {
    // Skipped: response-time measurement belongs to the play UI and round
    // controller, which is carried forward to M2.
  });

  it('AC-01.14 append rejects a missing, non-whole or negative responseTimeMs', async () => {
    const { factory } = testFactory();
    const valid = makeAnswer(factory, 1_000);
    const payload: Record<string, unknown> = { ...valid.payload };

    const missing: Record<string, unknown> = { ...payload };
    delete missing['responseTimeMs'];
    const invalidPayloads: readonly unknown[] = [
      missing,
      { ...payload, responseTimeMs: 1.5 },
      { ...payload, responseTimeMs: -1 },
      { ...payload, responseTimeMs: Number.NaN },
      { ...payload, responseTimeMs: '1200' },
    ];

    for (const invalidPayload of invalidPayloads) {
      const store = new InMemoryStore();
      const event = { ...valid, payload: invalidPayload } as unknown as DomainEvent;
      const result = await store.append([event]);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('corrupt');
      }
      expect(await store.count()).toBe(0);
    }
  });

  it('rebuilds 10,000 events on this host without loading a snapshot', async () => {
    const store = new InMemoryStore();
    const { factory, identity } = testFactory();
    const events: DomainEvent[] = [];
    for (let index = 0; index < 10_000; index += 1) {
      events.push(makeAnswer(factory, 1_000 + index, `item-${index % 100}`));
    }
    await store.append(events);

    const started = performance.now();
    const restored = await restoreProjection(store, {
      projectionVersion: 1,
      installOrigin: identity.origin,
    });
    const elapsed = performance.now() - started;

    expect(restored.source).toBe('rebuilt');
    expect(restored.state.answers).toHaveLength(10_000);
    expect(elapsed).toBeLessThan(2_000);
  });

  it('AC-01.12 after Delete everything the store is empty and the install id differs', async () => {
    const store = new InMemoryStore();
    const { factory, identity, context } = testFactory();
    const event = makeAnswer(factory, 1_000);
    await store.append([event]);
    await store.saveSnapshot({
      projectionVersion: 1,
      lastEventId: event.id,
      state: projectEvents([event]),
    });
    expect(await store.count()).toBe(1);

    const before = identity;
    const after = await deleteEverything(store, () => testIdentity(Date.UTC(2026, 10, 18)));

    expect(await store.count()).toBe(0);
    expect(await store.loadSnapshot()).toBeNull();
    expect(after.installId).not.toBe(before.installId);
    expect(after.origin).not.toBe(before.origin);
    expect(context.id).toBe(1);
  });

  it('AC-01.13 a simulated full disk shows S21 and keeps the pending answer in memory', async () => {
    // Two failures cover the initial attempt plus the single retry.
    const store = new InMemoryStore({ failWrites: 2 });
    const { factory } = testFactory();
    const answer = makeAnswer(factory, 1_000);

    const buffer = new PendingEventBuffer();
    const first = await appendWithRetry(store, [answer]);
    expect(first.status).toBe('s21');
    if (first.status === 's21') {
      expect(first.error).toEqual({ kind: 'full' });
      buffer.retain(first.pending);
    }

    expect(buffer.pending).toEqual([answer]);
    expect(await store.count()).toBe(0);

    const flushed = await buffer.flush(store);
    expect(flushed.status).toBe('saved');
    expect(buffer.pending).toHaveLength(0);
    expect(await store.count()).toBe(1);
  });

  it('keeps at monotonic when the device clock moves backwards', () => {
    const clock = new MonotonicClock(5_000);
    expect(clock.next(4_000)).toBe(5_000);
    expect(clock.next(6_000)).toBe(6_000);
    expect(clock.next(1_000)).toBe(6_000);
  });

  it('discards a snapshot whose projection version or last event id does not match', async () => {
    const store = new InMemoryStore();
    const { factory } = testFactory();
    const first = makeAnswer(factory, 1_000);
    const second = makeAnswer(factory, 2_000);
    await store.append([first, second]);

    await store.saveSnapshot({
      projectionVersion: 99,
      lastEventId: second.id,
      state: projectEvents([first, second]),
    });
    const wrongVersion = await restoreProjection(store, { projectionVersion: 1 });
    expect(wrongVersion.source).toBe('rebuilt');

    await store.saveSnapshot({
      projectionVersion: 1,
      lastEventId: first.id,
      state: projectEvents([first]),
    });
    const wrongLast = await restoreProjection(store, { projectionVersion: 1 });
    expect(wrongLast.source).toBe('rebuilt');
    expect(wrongLast.state.answers).toHaveLength(2);
  });

  it('uses a matching snapshot as a cache', async () => {
    const store = new InMemoryStore();
    const { factory } = testFactory();
    const event = makeAnswer(factory, 1_000);
    await store.append([event]);
    const state = projectEvents([event]);
    await store.saveSnapshot({
      projectionVersion: 1,
      lastEventId: event.id,
      state,
    });

    const restored = await restoreProjection(store, { projectionVersion: 1 });
    expect(restored.source).toBe('snapshot');
    expect(restored.state).toEqual(state);
  });
});
