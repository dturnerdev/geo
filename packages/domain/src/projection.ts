import type {
  AnswerRecordedPayload,
  ContentPackAppliedPayload,
  DomainEvent,
  EmphasisAddedPayload,
  ParametersAdoptedPayload,
} from './events.ts';
import type { EventId, OriginId } from './ids.ts';
import { sortEvents } from './ordering.ts';

export interface SettingValue {
  readonly value: unknown;
  readonly at: number;
  readonly eventId: EventId;
}

export interface ExperimentValue {
  readonly variant: string;
  readonly at: number;
  readonly eventId: EventId;
}

export interface ParametersValue {
  readonly payload: ParametersAdoptedPayload;
  readonly at: number;
  readonly eventId: EventId;
}

export interface EmphasisValue {
  readonly payload: EmphasisAddedPayload;
  readonly at: number;
  readonly eventId: EventId;
}

export interface ContentPackValue {
  readonly payload: ContentPackAppliedPayload;
  readonly at: number;
  readonly eventId: EventId;
}

export type RoundStatus = 'started' | 'parked' | 'ended';

// A projection is derived from the log only. Snapshots cache it but never
// become the source of truth (07 §1 rule 3).
export interface ProjectedState {
  readonly answers: readonly AnswerRecordedPayload[];
  readonly itemsMet: Readonly<Record<string, number>>;
  readonly settings: Readonly<Record<string, SettingValue>>;
  readonly experiments: Readonly<Record<string, ExperimentValue>>;
  readonly parameters: ParametersValue | null;
  readonly emphases: Readonly<Record<string, EmphasisValue>>;
  readonly rounds: Readonly<Record<string, RoundStatus>>;
  readonly contentPack: ContentPackValue | null;
}

export interface ProjectionOptions {
  // Imported ExperimentAssigned events from other origins are kept in the log
  // but ignored for assignment (FE01 behaviour 10.6, D164).
  readonly installOrigin?: OriginId;
}

export function emptyProjection(): ProjectedState {
  return {
    answers: [],
    itemsMet: {},
    settings: {},
    experiments: {},
    parameters: null,
    emphases: {},
    rounds: {},
    contentPack: null,
  };
}

export function projectEvents(
  events: readonly DomainEvent[],
  options: ProjectionOptions = {},
): ProjectedState {
  const ordered = sortEvents(events);
  const answers: AnswerRecordedPayload[] = [];
  const itemsMet: Record<string, number> = {};
  const settings: Record<string, SettingValue> = {};
  const experiments: Record<string, ExperimentValue> = {};
  const emphases: Record<string, EmphasisValue> = {};
  const rounds: Record<string, RoundStatus> = {};
  let parameters: ParametersValue | null = null;
  let contentPack: ContentPackValue | null = null;
  for (const event of ordered) {
    switch (event.type) {
      case 'ItemMet':
        itemsMet[event.payload.itemId] = (itemsMet[event.payload.itemId] ?? 0) + 1;
        break;
      case 'AnswerRecorded':
        answers.push(event.payload);
        break;
      case 'SettingChanged':
        // Last writer wins by `at`; (at, id) order breaks a tie.
        settings[event.payload.key] = {
          value: event.payload.value,
          at: event.at,
          eventId: event.id,
        };
        break;
      case 'ExperimentAssigned':
        if (options.installOrigin === undefined || options.installOrigin === event.origin) {
          experiments[event.payload.experimentId] = {
            variant: event.payload.variant,
            at: event.at,
            eventId: event.id,
          };
        }
        break;
      case 'ParametersAdopted':
        parameters = { payload: event.payload, at: event.at, eventId: event.id };
        break;
      case 'EmphasisAdded':
        emphases[event.payload.entryId] = {
          payload: event.payload,
          at: event.at,
          eventId: event.id,
        };
        break;
      case 'EmphasisEnded':
        delete emphases[event.payload.entryId];
        break;
      case 'RoundStarted':
        rounds[event.payload.roundId] = 'started';
        break;
      case 'RoundParked':
        rounds[event.payload.roundId] = 'parked';
        break;
      case 'RoundEnded':
        rounds[event.payload.roundId] = 'ended';
        break;
      case 'ContentPackApplied':
        contentPack = { payload: event.payload, at: event.at, eventId: event.id };
        break;
      case 'ImportCompleted':
        break;
      case 'RoundResumed':
      case 'ExperimentExposed':
      case 'DailyChallengeCompleted':
        break;
    }
  }

  return {
    answers,
    itemsMet,
    settings,
    experiments,
    parameters,
    emphases,
    rounds,
    contentPack,
  };
}

// The union of two logs, deduplicated by event id and ordered by (at, id).
export function mergeEventLogs(
  left: readonly DomainEvent[],
  right: readonly DomainEvent[],
): DomainEvent[] {
  const byId = new Map<EventId, DomainEvent>();
  for (const event of [...left, ...right]) {
    if (!byId.has(event.id)) {
      byId.set(event.id, event);
    }
  }
  return sortEvents([...byId.values()]);
}
