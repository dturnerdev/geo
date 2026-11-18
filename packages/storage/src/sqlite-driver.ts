// Minimal async SQL surface shared by the web and native SQLite drivers. The
// EventStore logic lives in one place; only this seam differs per platform.
export type SqlValue = string | number | bigint | null | Uint8Array;

export type SqlRow = Readonly<Record<string, SqlValue>>;

export interface SqlDriver {
  // Runs one or more statements without returning rows.
  execute(sql: string, values?: readonly SqlValue[]): Promise<void>;
  select(sql: string, values?: readonly SqlValue[]): Promise<readonly SqlRow[]>;
  // Runs the callback inside one database transaction. Any throw rolls back.
  transaction<T>(operation: () => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
