import { projectEvents, type DomainEvent, type OriginId, type ProjectedState } from '@geo/domain';
import type { EventStore } from '@geo/storage';

export interface RestoreOptions {
  readonly projectionVersion: number;
  readonly installOrigin?: OriginId;
}

export interface RestoreResult {
  readonly state: ProjectedState;
  readonly source: 'snapshot' | 'rebuilt';
}

// Snapshots are a disposable cache keyed by (projection version, last event id).
// Any mismatch discards the snapshot and rebuilds from the log (FE01 behaviour 6).
export async function restoreProjection(
  store: EventStore,
  options: RestoreOptions,
): Promise<RestoreResult> {
  const snapshot = await store.loadSnapshot();
  const events: DomainEvent[] = [];
  for await (const event of store.readAll()) {
    events.push(event);
  }

  const last = events.at(-1);
  const snapshotMatches =
    snapshot !== null &&
    snapshot.projectionVersion === options.projectionVersion &&
    last !== undefined &&
    snapshot.lastEventId === last.id;

  if (snapshotMatches && snapshot !== null) {
    return { state: snapshot.state, source: 'snapshot' };
  }

  return {
    state: projectEvents(events, {
      ...(options.installOrigin === undefined ? {} : { installOrigin: options.installOrigin }),
    }),
    source: 'rebuilt',
  };
}
