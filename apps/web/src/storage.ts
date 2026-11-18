import { InMemoryStore, SqliteWasmStore, type EventStore } from '@geo/storage';

export type WebStorageStatus =
  | { readonly kind: 'ready'; readonly store: EventStore; readonly opfs: true }
  | {
      readonly kind: 'opfs-unavailable';
      readonly store: EventStore;
      readonly opfs: false;
      readonly screen: 'S21';
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

// The platform SQLite driver is a clearly scoped stub until
// @sqlite.org/sqlite-wasm is approved. Until then this keeps the same logical
// transaction contract but in memory, and never claims durability.
export async function createWebEventStore(): Promise<WebStorageStatus> {
  const available = await opfsAvailable();
  if (!available) {
    return {
      kind: 'opfs-unavailable',
      store: new InMemoryStore(),
      opfs: false,
      screen: 'S21',
    };
  }
  return {
    kind: 'ready',
    store: new SqliteWasmStore(new InMemoryStore()),
    opfs: true,
  };
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
