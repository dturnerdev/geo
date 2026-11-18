import { InMemoryStore, SqliteWasmStore, type EventStore } from '@geo/storage';
import { createWorkerSqlDriver, spawnSqliteWasmWorker } from './sqlite-worker-client.ts';

export type WebStorageStatus =
  | {
      readonly kind: 'ready';
      readonly store: EventStore;
      readonly opfs: true;
      readonly close: () => Promise<void>;
    }
  | {
      readonly kind: 'opfs-unavailable';
      readonly store: EventStore;
      readonly opfs: false;
      readonly screen: 'S21';
      readonly close: () => Promise<void>;
    };

interface StorageManagerLike {
  getDirectory?: () => Promise<unknown>;
  persist?: () => Promise<boolean>;
}

// FE01 behaviour 7: OPFS may be unavailable in private browsing. The app then
// explains that progress cannot be saved and offers to continue without saving.
export async function opfsAvailable(): Promise<boolean> {
  const storage = (globalThis.navigator as { storage?: StorageManagerLike } | undefined)?.storage;
  if (storage?.getDirectory === undefined) {
    return false;
  }
  try {
    await storage.getDirectory();
    return true;
  } catch {
    return false;
  }
}

// Web production storage: @sqlite.org/sqlite-wasm inside a dedicated Worker,
// using the persisted OPFS SAH-pool VFS. The Worker owns all SQLite access.
export async function createWebEventStore(): Promise<WebStorageStatus> {
  const available = await opfsAvailable();
  if (!available) {
    return {
      kind: 'opfs-unavailable',
      store: new InMemoryStore(),
      opfs: false,
      screen: 'S21',
      close: () => Promise.resolve(),
    };
  }

  const worker = spawnSqliteWasmWorker();
  const driver = createWorkerSqlDriver(worker);
  try {
    // Forces the Worker to open the OPFS pool before we claim storage is ready.
    await driver.select('SELECT 1 AS ready');
    return {
      kind: 'ready',
      store: new SqliteWasmStore(driver),
      opfs: true,
      // A Web Lock takeover must close the previous holder's OPFS access
      // handles before the next tab can open the same database (D108).
      close: () => driver.close(),
    };
  } catch {
    await driver.close();
    return {
      kind: 'opfs-unavailable',
      store: new InMemoryStore(),
      opfs: false,
      screen: 'S21',
      close: () => Promise.resolve(),
    };
  }
}

// Ask for persistent storage after the first completed round, never at launch
// (FE01 behaviour 7).
export async function requestPersistentStorage(): Promise<boolean> {
  const storage = (globalThis.navigator as { storage?: StorageManagerLike } | undefined)?.storage;
  if (storage?.persist === undefined) {
    return false;
  }
  try {
    return await storage.persist();
  } catch {
    return false;
  }
}
