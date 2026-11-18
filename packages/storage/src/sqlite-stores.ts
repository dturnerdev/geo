// Platform SQLite adapters. Both use the same EventStore implementation and
// differ only in the driver passed by the platform shell:
// - SqliteNativeStore: @capacitor-community/sqlite, WAL, app-private storage.
// - SqliteWasmStore: @sqlite.org/sqlite-wasm, persisted OPFS SAH pool in a
//   dedicated Worker on web.
export { SqliteNativeStore, SqliteWasmStore } from './sqlite-backend-store.ts';
export {
  createSqliteWasmMemoryDriver,
  createSqliteWasmSahPoolDriver,
  loadSqliteWasm,
  type SahPoolOptions,
} from './sqlite-wasm-driver.ts';
export type { SqlDriver, SqlRow, SqlValue } from './sqlite-driver.ts';
