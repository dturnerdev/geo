import { SqliteNativeStore } from '../../../packages/storage/src/sqlite-stores.ts';
import {
  createCapacitorSqliteDriver,
  type AndroidSqliteOptions,
} from './capacitor-sqlite-driver.ts';

// Platform entry point used by the app shell on Android. The database lives in
// app-private storage with cloud backup excluded by the manifest (D109).
export async function createAndroidEventStore(
  options: AndroidSqliteOptions = {},
): Promise<SqliteNativeStore> {
  return new SqliteNativeStore(await createCapacitorSqliteDriver(options));
}
