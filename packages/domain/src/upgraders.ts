import { err, ok, type Result } from './result.ts';
import {
  CURRENT_EVENT_SCHEMA,
  domainEventSchema,
  eventTypeSchema,
  rawEventEnvelopeSchema,
  type DomainEvent,
  type EventType,
  type RawEventEnvelope,
} from './events.ts';

export type PayloadUpgrader = (payload: unknown, envelope: RawEventEnvelope) => unknown;

// Pure upgradeVnToVn+1 functions, keyed by the version they read from. Historic
// entries stay here for ever (FE01 behaviour 5, D137).
export const PAYLOAD_UPGRADERS: Readonly<
  Record<EventType, Readonly<Record<number, PayloadUpgrader>>>
> = {
  ItemMet: {},
  AnswerRecorded: {},
  RoundStarted: {},
  RoundEnded: {},
  RoundParked: {},
  RoundResumed: {},
  SettingChanged: {},
  ExperimentAssigned: {},
  ExperimentExposed: {},
  ParametersAdopted: {},
  EmphasisAdded: {},
  EmphasisEnded: {},
  DailyChallengeCompleted: {},
  ContentPackApplied: {},
  ImportCompleted: {},
};

export type UpgradeError =
  | { readonly kind: 'invalid'; readonly issue: string }
  | {
      readonly kind: 'newer-schema';
      readonly type: EventType;
      readonly schema: number;
      readonly supported: number;
    }
  | {
      readonly kind: 'missing-upgrader';
      readonly type: EventType;
      readonly fromVersion: number;
    };

// Reads an older stored row through the upgrade chain, then validates the
// current payload with Zod. Stored rows are never rewritten.
export function upgradeDomainEvent(raw: unknown): Result<DomainEvent, UpgradeError> {
  const envelope = rawEventEnvelopeSchema.safeParse(raw);
  if (!envelope.success) {
    return err({ kind: 'invalid', issue: envelope.error.message });
  }

  const event = envelope.data;
  if (!eventTypeSchema.safeParse(event.type).success) {
    return err({ kind: 'invalid', issue: `unknown event type "${String(event.type)}"` });
  }

  const supported = CURRENT_EVENT_SCHEMA[event.type];
  if (event.schema > supported) {
    return err({
      kind: 'newer-schema',
      type: event.type,
      schema: event.schema,
      supported,
    });
  }

  let payload = event.payload;
  for (let version = event.schema; version < supported; version += 1) {
    const upgrader = PAYLOAD_UPGRADERS[event.type][version];
    if (upgrader === undefined) {
      return err({
        kind: 'missing-upgrader',
        type: event.type,
        fromVersion: version,
      });
    }
    payload = upgrader(payload, event);
  }

  const upgraded = domainEventSchema.safeParse({
    ...event,
    schema: supported,
    payload,
  });
  if (!upgraded.success) {
    return err({ kind: 'invalid', issue: upgraded.error.message });
  }
  return ok(upgraded.data);
}
