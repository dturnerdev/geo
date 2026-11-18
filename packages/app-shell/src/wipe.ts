import type { EventStore } from '@geo/storage';
import type { InstallIdentity } from './identity.ts';

// The only operation that removes events. It also drops snapshots and settings,
// then generates a new install id and origin (FE01 behaviour 11, AC-01.12).
export async function deleteEverything(
  store: EventStore,
  createIdentity: () => InstallIdentity,
): Promise<InstallIdentity> {
  await store.wipe();
  return createIdentity();
}
