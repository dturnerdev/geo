import type { DomainEvent } from '@geo/domain';
import type { EventStore, StoreError } from '@geo/storage';

export type AppendOutcome =
  | { readonly status: 'saved' }
  | {
      readonly status: 's21';
      readonly error: StoreError;
      readonly pending: readonly DomainEvent[];
    };

// Never drop an answer silently: keep it in memory, retry once, then show S21
// with an export option (FE01 behaviour 12, AC-01.13).
export async function appendWithRetry(
  store: EventStore,
  events: readonly DomainEvent[],
): Promise<AppendOutcome> {
  const first = await store.append(events);
  if (first.ok) {
    return { status: 'saved' };
  }

  const second = await store.append(events);
  if (second.ok) {
    return { status: 'saved' };
  }

  return { status: 's21', error: second.error, pending: [...events] };
}

// Holds unsaved events for the lifetime of the app session so a later flush can
// finish the write after the user makes space or grants storage.
export class PendingEventBuffer {
  private events: DomainEvent[] = [];

  get pending(): readonly DomainEvent[] {
    return this.events;
  }

  retain(events: readonly DomainEvent[]): void {
    this.events.push(...events);
  }

  async flush(store: EventStore): Promise<AppendOutcome> {
    if (this.events.length === 0) {
      return { status: 'saved' };
    }
    const outcome = await appendWithRetry(store, this.events);
    if (outcome.status === 'saved') {
      this.events = [];
    } else {
      this.events = [...outcome.pending];
    }
    return outcome;
  }
}
