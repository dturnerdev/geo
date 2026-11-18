import type { DomainEvent, EventId, Result } from '@geo/domain';
import type { EventStore, ImportReport, Snapshot, StoreError } from './types.ts';

// The Android and web adapters are stubs until their SQLite dependencies are
// approved and wired. They accept an EventStore backend so the shared suite can
// prove the adapter surface, transaction sequencing and ordering contract now.
// The real driver supplies an EventStore backed by:
// - Android: @capacitor-community/sqlite, WAL mode, app-private storage (D109).
// - Web: @sqlite.org/sqlite-wasm with opfs-sahpool in a dedicated Worker.
function requireBackend(backend: EventStore | null): EventStore {
  if (backend === null) {
    throw new Error('SQLite backend is not configured for this platform');
  }
  return backend;
}

export class SqliteNativeStore implements EventStore {
  private readonly backend: EventStore | null;

  constructor(backend: EventStore | null = null) {
    this.backend = backend;
  }

  append(events: readonly DomainEvent[]): Promise<Result<void, StoreError>> {
    return requireBackend(this.backend).append(events);
  }

  readAll(): AsyncIterable<DomainEvent> {
    return requireBackend(this.backend).readAll();
  }

  count(): Promise<number> {
    return requireBackend(this.backend).count();
  }

  hasIds(ids: readonly EventId[]): Promise<ReadonlySet<EventId>> {
    return requireBackend(this.backend).hasIds(ids);
  }

  loadSnapshot(): Promise<Snapshot | null> {
    return requireBackend(this.backend).loadSnapshot();
  }

  saveSnapshot(snapshot: Snapshot): Promise<void> {
    return requireBackend(this.backend).saveSnapshot(snapshot);
  }

  importBatch(events: readonly DomainEvent[]): Promise<Result<ImportReport, StoreError>> {
    return requireBackend(this.backend).importBatch(events);
  }

  wipe(): Promise<void> {
    return requireBackend(this.backend).wipe();
  }
}

export class SqliteWasmStore implements EventStore {
  private readonly backend: EventStore | null;

  constructor(backend: EventStore | null = null) {
    this.backend = backend;
  }

  append(events: readonly DomainEvent[]): Promise<Result<void, StoreError>> {
    return requireBackend(this.backend).append(events);
  }

  readAll(): AsyncIterable<DomainEvent> {
    return requireBackend(this.backend).readAll();
  }

  count(): Promise<number> {
    return requireBackend(this.backend).count();
  }

  hasIds(ids: readonly EventId[]): Promise<ReadonlySet<EventId>> {
    return requireBackend(this.backend).hasIds(ids);
  }

  loadSnapshot(): Promise<Snapshot | null> {
    return requireBackend(this.backend).loadSnapshot();
  }

  saveSnapshot(snapshot: Snapshot): Promise<void> {
    return requireBackend(this.backend).saveSnapshot(snapshot);
  }

  importBatch(events: readonly DomainEvent[]): Promise<Result<ImportReport, StoreError>> {
    return requireBackend(this.backend).importBatch(events);
  }

  wipe(): Promise<void> {
    return requireBackend(this.backend).wipe();
  }
}
