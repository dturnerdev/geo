import {
  CURRENT_EVENT_SCHEMA,
  domainEventSchema,
  type ContextId,
  type DomainEvent,
  type EventPayloadOf,
  type EventType,
  type EventId,
} from '@geo/domain';
import { MonotonicClock, SystemClock, type Clock } from './clock.ts';
import type { InstallIdentity } from './identity.ts';
import { createEventId } from './ids.ts';

export interface EventFactoryOptions {
  readonly clock?: Clock;
  readonly identity: InstallIdentity;
  readonly contextId: ContextId;
  readonly lastAt?: number;
}

export interface EventOverrides {
  readonly at?: number;
  readonly tz?: string;
  readonly id?: EventId;
  readonly contextId?: ContextId;
}

// Only app-shell creates envelopes, reads the clock and the zone (07 §4).
export class EventFactory {
  private readonly clock: Clock;
  private readonly identity: InstallIdentity;
  private readonly contextId: ContextId;
  private readonly monotonic: MonotonicClock;

  constructor(options: EventFactoryOptions) {
    this.clock = options.clock ?? new SystemClock();
    this.identity = options.identity;
    this.contextId = options.contextId;
    this.monotonic = new MonotonicClock(options.lastAt ?? -1);
  }

  observeLastAt(at: number): void {
    this.monotonic.observe(at);
  }

  create<TType extends EventType>(
    type: TType,
    payload: EventPayloadOf<TType>,
    overrides: EventOverrides = {},
  ): DomainEvent {
    const at = this.monotonic.next(overrides.at ?? this.clock.now());
    const event = {
      id: overrides.id ?? createEventId(at),
      type,
      schema: CURRENT_EVENT_SCHEMA[type],
      at,
      tz: overrides.tz ?? this.clock.zone(),
      origin: this.identity.origin,
      contextId: overrides.contextId ?? this.contextId,
      payload,
    };
    return domainEventSchema.parse(event);
  }
}
