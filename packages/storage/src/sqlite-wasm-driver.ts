import initSqlite, {
  type Database,
  type SqlValue as WasmSqlValue,
  type Sqlite3Static,
} from '@sqlite.org/sqlite-wasm';
import type { SqlDriver, SqlRow, SqlValue } from './sqlite-driver.ts';

// The WASM module is loaded once per JavaScript realm (main thread in Node
// tests, dedicated Worker in the browser).
let loading: Promise<Sqlite3Static> | null = null;

export function loadSqliteWasm(): Promise<Sqlite3Static> {
  if (loading === null) {
    loading = initSqlite();
  }
  return loading;
}

function fromWasm(value: WasmSqlValue): SqlValue {
  if (value instanceof Int8Array || value instanceof ArrayBuffer) {
    return new Uint8Array(value instanceof ArrayBuffer ? value : value.buffer.slice(0));
  }
  return value;
}

function toRow(row: Record<string, WasmSqlValue>): SqlRow {
  const converted: Record<string, SqlValue> = {};
  for (const [key, value] of Object.entries(row)) {
    converted[key] = fromWasm(value);
  }
  return converted;
}

function driverFor(db: Database): SqlDriver {
  let closed = false;
  return {
    execute(sql, values = []) {
      db.exec({ sql, bind: values });
      return Promise.resolve();
    },
    select(sql, values = []) {
      const rows = db.exec({
        sql,
        bind: values,
        rowMode: 'object',
        returnValue: 'resultRows',
      });
      return Promise.resolve(rows.map(toRow));
    },
    async transaction(operation) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const result = await operation();
        db.exec('COMMIT');
        return result;
      } catch (cause) {
        try {
          db.exec('ROLLBACK');
        } catch {
          // Keep the original failure; a rollback error must not mask it.
        }
        throw cause;
      }
    },
    close() {
      if (!closed) {
        closed = true;
        db.close();
      }
      return Promise.resolve();
    },
  };
}

// Node and simple tests: a real in-memory SQLite database.
export async function createSqliteWasmMemoryDriver(): Promise<SqlDriver> {
  const sqlite3 = await loadSqliteWasm();
  return driverFor(new sqlite3.oo1.DB(':memory:', 'ct'));
}

export interface SahPoolOptions {
  readonly databaseName?: string;
  readonly directory?: string;
  readonly initialCapacity?: number;
}

// Browser production driver. Must run inside a dedicated Worker: OPFS SAH-pool
// access is unavailable on the main thread. Storage persists across sessions.
export async function createSqliteWasmSahPoolDriver(
  options: SahPoolOptions = {},
): Promise<SqlDriver> {
  const sqlite3 = await loadSqliteWasm();
  const pool = await sqlite3.installOpfsSAHPoolVfs({
    name: 'opfs-sahpool',
    directory: options.directory ?? '.geo-sqlite',
    initialCapacity: options.initialCapacity ?? 6,
  });
  const db = new pool.OpfsSAHPoolDb(options.databaseName ?? 'geo-events.db');
  const driver = driverFor(db);
  await driver.execute('PRAGMA journal_mode = WAL');
  return driver;
}
