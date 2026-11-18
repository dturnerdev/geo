import { describe, expect, it } from 'vitest';
import { runEventStoreSuite } from './event-store-suite.ts';
import { InMemoryStore } from './in-memory-store.ts';
import {
  createSqliteWasmMemoryDriver,
  SqliteNativeStore,
  SqliteWasmStore,
} from './sqlite-stores.ts';
import { answerEvent } from './test-helpers.ts';

runEventStoreSuite('InMemoryStore', () => new InMemoryStore());

// Real SQLite through @sqlite.org/sqlite-wasm in Node. The same SQL
// EventStore implementation backs the web (OPFS SAH-pool) and Android
// (@capacitor-community/sqlite) drivers.
runEventStoreSuite(
  'SqliteWasmStore',
  async () => new SqliteWasmStore(await createSqliteWasmMemoryDriver()),
);
runEventStoreSuite(
  'SqliteNativeStore',
  async () => new SqliteNativeStore(await createSqliteWasmMemoryDriver()),
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

describe('SqliteWasmStore real driver', () => {
  it('AC-01.1 rolls back an append batch that hits a duplicate', async () => {
    const store = new SqliteWasmStore(await createSqliteWasmMemoryDriver());
    const event = answerEvent(1_000);
    expect((await store.append([event])).ok).toBe(true);

    const duplicate = await store.append([answerEvent(2_000), event]);
    expect(duplicate).toEqual({ ok: false, error: { kind: 'corrupt' } });
    expect(await store.count()).toBe(1);
  });

  it('AC-01.1 rejects a corrupt event without writing any row', async () => {
    const store = new SqliteWasmStore(await createSqliteWasmMemoryDriver());
    const event = {
      ...answerEvent(2_000),
      payload: { rating: 'bad' },
    } as unknown as ReturnType<typeof answerEvent>;

    const result = await store.append([event]);
    expect(result).toEqual({ ok: false, error: { kind: 'corrupt' } });
    expect(await store.count()).toBe(0);
  });
});
