import { CapacitorSQLite } from '@capacitor-community/sqlite';
import type { SqlDriver, SqlRow, SqlValue } from '../../../packages/storage/src/sqlite-driver.ts';

export interface AndroidSqliteOptions {
  readonly databaseName?: string;
}

function bindable(values: readonly SqlValue[]): (string | number | bigint | null | Uint8Array)[] {
  return values.map((value) => value);
}

function asRows(value: unknown): readonly SqlRow[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const rows: SqlRow[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      continue;
    }
    const row: Record<string, SqlValue> = {};
    for (const [key, cell] of Object.entries(item as Record<string, unknown>)) {
      if (
        typeof cell === 'string' ||
        typeof cell === 'number' ||
        typeof cell === 'bigint' ||
        cell === null ||
        cell instanceof Uint8Array
      ) {
        row[key] = cell;
      }
    }
    rows.push(row);
  }
  return rows;
}

// Real Android driver: @capacitor-community/sqlite, WAL journal, app-private
// storage. The SQL EventStore implementation itself lives in @geo/storage.
export async function createCapacitorSqliteDriver(
  options: AndroidSqliteOptions = {},
): Promise<SqlDriver> {
  const database = options.databaseName ?? 'geo-events';
  await CapacitorSQLite.createConnection({
    database,
    version: 1,
    encrypted: false,
    mode: 'no-encryption',
    readonly: false,
  });
  await CapacitorSQLite.open({ database, readonly: false });
  await CapacitorSQLite.execute({
    database,
    statements: 'PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;',
    transaction: false,
  });

  return {
    async execute(sql, values = []) {
      if (values.length === 0) {
        await CapacitorSQLite.execute({
          database,
          statements: sql,
          transaction: false,
        });
        return;
      }
      await CapacitorSQLite.run({
        database,
        statement: sql,
        values: bindable(values),
        transaction: false,
      });
    },
    async select(sql, values = []) {
      const result = await CapacitorSQLite.query({
        database,
        statement: sql,
        values: bindable(values),
      });
      return asRows(result.values);
    },
    async transaction(operation) {
      await CapacitorSQLite.beginTransaction({ database, readonly: false });
      try {
        const result = await operation();
        await CapacitorSQLite.commitTransaction({ database });
        return result;
      } catch (cause) {
        try {
          await CapacitorSQLite.rollbackTransaction({ database });
        } catch {
          // Keep the original failure; a rollback error must not mask it.
        }
        throw cause;
      }
    },
    async close() {
      await CapacitorSQLite.close({ database, readonly: false });
      await CapacitorSQLite.closeConnection({ database, readonly: false });
    },
  };
}
