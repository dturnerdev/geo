import {
  domainEventSchema,
  sortEvents,
  upgradeDomainEvent,
  type DomainEvent,
  type EventId,
  type Result,
} from '@geo/domain';
import type { EventStore, ImportReport, Snapshot, StoreError } from './types.ts';

export interface InMemoryStoreOptions {
  readonly initialEvents?: readonly DomainEvent[];
  readonly initialSnapshot?: Snapshot;
  // Simulates a full disk for a number of append/import calls (AC-01.13).
  readonly failWrites?: number;
}

interface StoredRow {
  readonly event: DomainEvent;
}

function error(kind: StoreError['kind']): Result<never, StoreError> {
  return { ok: false, error: { kind } };
}

// Adapter used by tests and by the platform stubs while SQLite is wired. It
// holds the same logical transaction and ordering rules as the real stores.
export class InMemoryStore implements EventStore {
  private readonly rows = new Map<EventId, StoredRow>();
  private snapshot: Snapshot | null;
  private writesRemaining: number;

  constructor(options: InMemoryStoreOptions = {}) {
    this.snapshot = options.initialSnapshot ?? null;
    this.writesRemaining = options.failWrites ?? 0;
    for (const event of options.initialEvents ?? []) {
      this.rows.set(event.id, { event });
    }
  }

  private takeWriteFailure(): boolean {
    if (this.writesRemaining <= 0) {
      return false;
    }
    this.writesRemaining -= 1;
    return true;
  }

  append(events: readonly DomainEvent[]): Promise<Result<void, StoreError>> {
    if (this.takeWriteFailure()) {
      return Promise.resolve(error('full'));
    }

    const validated: DomainEvent[] = [];
    const batchIds = new Set<EventId>();
    for (const candidate of events) {
      const parsed = domainEventSchema.safeParse(candidate);
      if (!parsed.success) {
        return Promise.resolve(error('corrupt'));
      }
      if (this.rows.has(parsed.data.id) || batchIds.has(parsed.data.id)) {
        return Promise.resolve(error('corrupt'));
      }
      batchIds.add(parsed.data.id);
      validated.push(parsed.data);
    }

    // One transaction: nothing is committed unless every event is valid.
    for (const event of validated) {
      this.rows.set(event.id, { event });
    }
    return Promise.resolve({ ok: true, value: undefined });
  }

  async *readAll(): AsyncIterable<DomainEvent> {
    await Promise.resolve();
    const ordered = sortEvents([...this.rows.values()].map((row) => row.event));
    for (const row of ordered) {
      const upgraded = upgradeDomainEvent(row);
      if (!upgraded.ok) {
        throw new Error(`stored event is corrupt: ${upgraded.error.kind}`);
      }
      yield upgraded.value;
    }
  }

  count(): Promise<number> {
    return Promise.resolve(this.rows.size);
  }

  hasIds(ids: readonly EventId[]): Promise<ReadonlySet<EventId>> {
    const present = new Set<EventId>();
    for (const id of ids) {
      if (this.rows.has(id)) {
        present.add(id);
      }
    }
    return Promise.resolve(present);
  }

  loadSnapshot(): Promise<Snapshot | null> {
    return Promise.resolve(this.snapshot);
  }

  saveSnapshot(snapshot: Snapshot): Promise<void> {
    this.snapshot = snapshot;
    return Promise.resolve();
  }

  importBatch(events: readonly DomainEvent[]): Promise<Result<ImportReport, StoreError>> {
    if (this.takeWriteFailure()) {
      return Promise.resolve(error('full'));
    }

    const validated: DomainEvent[] = [];
    for (const candidate of events) {
      const parsed = domainEventSchema.safeParse(candidate);
      if (!parsed.success) {
        return Promise.resolve(error('corrupt'));
      }
      validated.push(parsed.data);
    }

    // One transaction, insert only ids that are not already present.
    let added = 0;
    let skipped = 0;
    const known = new Set<EventId>(this.rows.keys());
    for (const event of validated) {
      if (known.has(event.id)) {
        skipped += 1;
        continue;
      }
      known.add(event.id);
      this.rows.set(event.id, { event });
      added += 1;
    }
    return Promise.resolve({ ok: true, value: { added, skipped } });
  }

  wipe(): Promise<void> {
    this.rows.clear();
    this.snapshot = null;
    return Promise.resolve();
  }
}
