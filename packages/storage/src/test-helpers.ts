import {
  CURRENT_EVENT_SCHEMA,
  domainEventSchema,
  type DomainEvent,
  type EventPayloadOf,
  type EventType,
} from '@geo/domain';

let counter = 0;

export function makeEvent<TType extends EventType>(
  type: TType,
  payload: EventPayloadOf<TType>,
  at = 1_700_000_000_000,
): DomainEvent {
  counter += 1;
  return domainEventSchema.parse({
    id: `0192f000-0000-7000-8000-${counter.toString(16).padStart(12, '0')}`,
    type,
    schema: CURRENT_EVENT_SCHEMA[type],
    at,
    tz: 'Europe/London',
    origin: '0192f000-0000-7000-8000-0000000000aa',
    contextId: 1,
    payload,
  });
}

export function answerEvent(at: number, itemId = 'country-fr'): DomainEvent {
  return makeEvent(
    'AnswerRecorded',
    {
      itemId,
      roundId: 'round-1',
      rating: 3,
      level: 1,
      format: 'tap',
      response: { lng: 2.35, lat: 48.85 },
      geometry: { distanceMetres: 1200 },
      aids: [],
      hintsUsed: 0,
      surprise: false,
      roundSeed: 'seed-1',
      responseTimeMs: 1_200,
    },
    at,
  );
}
