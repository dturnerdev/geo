import {
  domainEventSchema,
  eventIdSchema,
  upgradeDomainEvent,
  type DomainEvent,
  type EventId,
  type Result,
} from '@geo/domain';
import type { SqlDriver, SqlRow } from './sqlite-driver.ts';
import type { EventStore, ImportReport, Snapshot, StoreError } from './types.ts';

const SCHEMA: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY NOT NULL,
    at INTEGER NOT NULL,
    envelope TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS events_order ON events (at ASC, id ASC)`,
  `CREATE TABLE IF NOT EXISTS snapshot (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    projection_version INTEGER NOT NULL,
    last_event_id TEXT NOT NULL,
    state TEXT NOT NULL
  )`,
];

const ID_BATCH_SIZE = 500;

function storeError(cause: unknown): StoreError {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (/SQLITE_FULL|database or disk is full|disk i\/o error|no space left/i.test(message)) {
    return { kind: 'full' };
  }
  if (/SQLITE_BUSY|SQLITE_LOCKED|database is locked|database table is locked/i.test(message)) {
    return { kind: 'locked-elsewhere' };
  }
  if (/SQLITE_CORRUPT|database disk image is malformed|file is encrypted/i.test(message)) {
    return { kind: 'corrupt' };
  }
  if (/SQLITE_READONLY|SQLITE_PERM|SQLITE_AUTH|not authorized|permission denied/i.test(message)) {
    return { kind: 'blocked' };
  }
  return { kind: 'corrupt' };
}

function failure(kind: StoreError['kind']): Result<never, StoreError> {
  return { ok: false, error: { kind } };
}

class DuplicateEventError extends Error {}

function parseRow(row: SqlRow): DomainEvent {
  const envelope = row['envelope'];
  if (typeof envelope !== 'string') {
    throw new Error('stored event envelope is not text');
  }
  const upgraded = upgradeDomainEvent(JSON.parse(envelope) as unknown);
  if (!upgraded.ok) {
    throw new Error(`stored event is corrupt: ${upgraded.error.kind}`);
  }
  return upgraded.value;
}

// One SQL implementation shared by both platform adapters. The driver decides
// whether the database is OPFS-backed WASM on web or Capacitor SQLite on
// Android; the transaction and ordering contract stays identical (FE01).
class SqlEventStore implements EventStore {
  private readonly driver: SqlDriver;
  private ready: Promise<void> | null = null;

  constructor(driver: SqlDriver) {
    this.driver = driver;
  }

  private initialise(): Promise<void> {
    if (this.ready === null) {
      this.ready = (async () => {
        for (const statement of SCHEMA) {
          await this.driver.execute(statement);
        }
      })();
    }
    return this.ready;
  }

  private validate(events: readonly DomainEvent[]): Result<readonly DomainEvent[], StoreError> {
    const validated: DomainEvent[] = [];
    for (const candidate of events) {
      const parsed = domainEventSchema.safeParse(candidate);
      if (!parsed.success) {
        return failure('corrupt');
      }
      validated.push(parsed.data);
    }
    return { ok: true, value: validated };
  }

  private async exists(id: EventId): Promise<boolean> {
    const rows = await this.driver.select('SELECT 1 AS present FROM events WHERE id = ?', [id]);
    return rows.length > 0;
  }

  private async insert(event: DomainEvent): Promise<void> {
    await this.driver.execute('INSERT INTO events (id, at, envelope) VALUES (?, ?, ?)', [
      event.id,
      event.at,
      JSON.stringify(event),
    ]);
  }

  async append(events: readonly DomainEvent[]): Promise<Result<void, StoreError>> {
    try {
      await this.initialise();
      const validated = this.validate(events);
      if (!validated.ok) {
        return validated;
      }

      const batchIds = new Set<EventId>();
      for (const event of validated.value) {
        if (batchIds.has(event.id)) {
          return failure('corrupt');
        }
        batchIds.add(event.id);
      }

      await this.driver.transaction(async () => {
        for (const event of validated.value) {
          if (await this.exists(event.id)) {
            throw new DuplicateEventError();
          }
          await this.insert(event);
        }
      });
      return { ok: true, value: undefined };
    } catch (cause) {
      return { ok: false, error: storeError(cause) };
    }
  }

  async *readAll(): AsyncIterable<DomainEvent> {
    await this.initialise();
    const rows = await this.driver.select('SELECT envelope FROM events ORDER BY at ASC, id ASC');
    for (const row of rows) {
      yield parseRow(row);
    }
  }

  async count(): Promise<number> {
    await this.initialise();
    const rows = await this.driver.select('SELECT COUNT(*) AS total FROM events');
    const total = rows[0]?.['total'];
    return typeof total === 'bigint' ? Number(total) : typeof total === 'number' ? total : 0;
  }

  async hasIds(ids: readonly EventId[]): Promise<ReadonlySet<EventId>> {
    await this.initialise();
    const unique = [...new Set(ids)];
    const found = new Set<EventId>();
    for (let offset = 0; offset < unique.length; offset += ID_BATCH_SIZE) {
      const chunk = unique.slice(offset, offset + ID_BATCH_SIZE);
      const placeholders = chunk.map(() => '?').join(', ');
      const rows = await this.driver.select(
        `SELECT id FROM events WHERE id IN (${placeholders})`,
        chunk,
      );
      for (const row of rows) {
        const parsedId = eventIdSchema.safeParse(row['id']);
        if (parsedId.success && chunk.includes(parsedId.data)) {
          found.add(parsedId.data);
        }
      }
    }
    const present = new Set<EventId>();
    for (const id of unique) {
      if (found.has(id)) {
        present.add(id);
      }
    }
    return present;
  }

  async loadSnapshot(): Promise<Snapshot | null> {
    await this.initialise();
    const rows = await this.driver.select(
      'SELECT projection_version, last_event_id, state FROM snapshot WHERE id = 1',
    );
    const row = rows[0];
    if (row === undefined) {
      return null;
    }
    const projectionVersion = row['projection_version'];
    const lastEventId = eventIdSchema.safeParse(row['last_event_id']);
    const state = row['state'];
    if (
      typeof projectionVersion !== 'number' ||
      !lastEventId.success ||
      typeof state !== 'string'
    ) {
      return null;
    }
    try {
      return {
        projectionVersion,
        lastEventId: lastEventId.data,
        state: JSON.parse(state) as Snapshot['state'],
      };
    } catch {
      // A snapshot is a disposable cache; an unreadable one is discarded.
      return null;
    }
  }

  async saveSnapshot(snapshot: Snapshot): Promise<void> {
    await this.initialise();
    await this.driver.execute(
      `INSERT INTO snapshot (id, projection_version, last_event_id, state)
       VALUES (1, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         projection_version = excluded.projection_version,
         last_event_id = excluded.last_event_id,
         state = excluded.state`,
      [snapshot.projectionVersion, snapshot.lastEventId, JSON.stringify(snapshot.state)],
    );
  }

  async importBatch(events: readonly DomainEvent[]): Promise<Result<ImportReport, StoreError>> {
    try {
      await this.initialise();
      const validated = this.validate(events);
      if (!validated.ok) {
        return validated;
      }

      const report = await this.driver.transaction(async () => {
        let added = 0;
        let skipped = 0;
        const known = new Set<EventId>();
        for (const event of validated.value) {
          if (known.has(event.id) || (await this.exists(event.id))) {
            skipped += 1;
            continue;
          }
          known.add(event.id);
          await this.insert(event);
          added += 1;
        }
        return { added, skipped };
      });
      return { ok: true, value: report };
    } catch (cause) {
      return { ok: false, error: storeError(cause) };
    }
  }

  async wipe(): Promise<void> {
    await this.initialise();
    await this.driver.transaction(async () => {
      await this.driver.execute('DELETE FROM events');
      await this.driver.execute('DELETE FROM snapshot');
    });
  }
}

// Android adapter: pass a driver backed by @capacitor-community/sqlite.
export class SqliteNativeStore extends SqlEventStore {}
// Web adapter: pass a driver backed by @sqlite.org/sqlite-wasm.
export class SqliteWasmStore extends SqlEventStore {}
