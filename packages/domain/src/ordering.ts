import type { DomainEvent } from './events.ts';

// Ordering is always (at, id) (FE01 behaviour 4, 07 §6).
export function compareEventOrder(
  left: Pick<DomainEvent, 'at' | 'id'>,
  right: Pick<DomainEvent, 'at' | 'id'>,
): number {
  if (left.at !== right.at) {
    return left.at < right.at ? -1 : 1;
  }
  if (left.id === right.id) {
    return 0;
  }
  return left.id < right.id ? -1 : 1;
}

export function sortEvents<TEvent extends Pick<DomainEvent, 'at' | 'id'>>(
  events: readonly TEvent[],
): TEvent[] {
  return [...events].sort(compareEventOrder);
}
