import type { DomainEvent, EventId, ProjectedState, Result } from '@geo/domain';

// Store failures map onto the screens named by FE01 (S19, S21).
export type StoreError =
  { kind: 'full' } | { kind: 'blocked' } | { kind: 'corrupt' } | { kind: 'locked-elsewhere' };

// Disposable cache keyed by (projection version, last event id).
export interface Snapshot {
  readonly projectionVersion: number;
  readonly lastEventId: EventId;
  readonly state: ProjectedState;
}

export interface ImportReport {
  readonly added: number;
  readonly skipped: number;
}

export interface EventStore {
  append(events: readonly DomainEvent[]): Promise<Result<void, StoreError>>;
  readAll(): AsyncIterable<DomainEvent>; // ordered by (at, id), upgraded
  count(): Promise<number>;
  hasIds(ids: readonly EventId[]): Promise<ReadonlySet<EventId>>;
  loadSnapshot(): Promise<Snapshot | null>;
  saveSnapshot(snapshot: Snapshot): Promise<void>;
  importBatch(events: readonly DomainEvent[]): Promise<Result<ImportReport, StoreError>>; // one transaction
  wipe(): Promise<void>;
}
