import type { DiagnosticsLog, EventStore } from '@geo/storage';
import type { InstallIdentity } from './identity.ts';

// The only operation that removes events. It also drops snapshots, settings,
// diagnostics and then generates a new install id and origin (FE01 behaviour
// 11, AC-01.12, FE04 item 7).
export async function deleteEverything(
  store: EventStore,
  createIdentity: () => InstallIdentity,
  diagnostics?: DiagnosticsLog,
): Promise<InstallIdentity> {
  await store.wipe();
  diagnostics?.clear();
  return createIdentity();
}
