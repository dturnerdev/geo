import { describe, expect, it } from 'vitest';
import { runEventStoreSuite } from './event-store-suite.ts';
import { InMemoryStore } from './in-memory-store.ts';
import { SqliteNativeStore, SqliteWasmStore } from './sqlite-stores.ts';
import { answerEvent } from './test-helpers.ts';

runEventStoreSuite('InMemoryStore', () => new InMemoryStore());

// The SQLite adapters are platform stubs until their dependencies are approved.
// They are exercised with a logical backend so their EventStore surface and
// transaction sequencing are covered here.
runEventStoreSuite(
  'SqliteNativeStore (stub backend)',
  () => new SqliteNativeStore(new InMemoryStore()),
);
runEventStoreSuite(
  'SqliteWasmStore (stub backend)',
  () => new SqliteWasmStore(new InMemoryStore()),
);

describe('InMemoryStore failure paths', () => {
  it('returns full and leaves the store unchanged when a write fails', async () => {
    const store = new InMemoryStore({ failWrites: 1 });
    const result = await store.append([answerEvent(1_000)]);
    expect(result).toEqual({ ok: false, error: { kind: 'full' } });
    expect(await store.count()).toBe(0);
  });

  it('rejects a duplicate id in append without committing the batch', async () => {
    const store = new InMemoryStore();
    const event = answerEvent(1_000);
    expect((await store.append([event])).ok).toBe(true);
    const duplicate = await store.append([answerEvent(2_000), event]);
    expect(duplicate).toEqual({ ok: false, error: { kind: 'corrupt' } });
    expect(await store.count()).toBe(1);
  });

  it('rejects a batch with a corrupt id without committing the other rows', async () => {
    const store = new InMemoryStore();
    const event = { ...answerEvent(1_000), id: 'not-a-uuid' } as unknown as ReturnType<
      typeof answerEvent
    >;
    expect((await store.append([event])).ok).toBe(false);
    expect(await store.count()).toBe(0);
  });
});
