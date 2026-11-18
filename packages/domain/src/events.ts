import { z } from 'zod';
import {
  contextIdSchema,
  eventIdSchema,
  itemIdSchema,
  originIdSchema,
  roundIdSchema,
} from './ids.ts';

// The envelope is identical for every type (FE01 behaviour 1).
export const eventTypeSchema = z.enum([
  'ItemMet',
  'AnswerRecorded',
  'RoundStarted',
  'RoundEnded',
  'RoundParked',
  'RoundResumed',
  'SettingChanged',
  'ExperimentAssigned',
  'ExperimentExposed',
  'ParametersAdopted',
  'EmphasisAdded',
  'EmphasisEnded',
  'DailyChallengeCompleted',
  'ContentPackApplied',
  'ImportCompleted',
]);

export type EventType = z.infer<typeof eventTypeSchema>;

export const eventContextSchema = z.object({
  id: contextIdSchema,
  appVersion: z.string().min(1),
  contentPackVersion: z.string().min(1),
  graderVersions: z.record(z.string(), z.string()),
  platform: z.string().min(1),
});

export type EventContext = z.infer<typeof eventContextSchema>;

export const itemMetPayloadSchema = z.object({
  itemId: itemIdSchema,
  facet: z.string().min(1).optional(),
});

export const answerRecordedPayloadSchema = z.object({
  itemId: itemIdSchema,
  facet: z.string().min(1).optional(),
  roundId: roundIdSchema,
  rating: z.number().int().min(1).max(4),
  level: z.number().int().nonnegative(),
  format: z.string().min(1),
  response: z.unknown(),
  geometry: z.unknown(),
  aids: z.array(z.string()),
  hintsUsed: z.number().int().nonnegative(),
  surprise: z.boolean(),
  roundSeed: z.string().min(1),
});

export const roundStartedPayloadSchema = z.object({
  roundId: roundIdSchema,
  seed: z.string().min(1),
});

export const roundEndedPayloadSchema = z.object({
  roundId: roundIdSchema,
  reason: z.string().min(1),
});

export const roundParkedPayloadSchema = z.object({
  roundId: roundIdSchema,
  reason: z.string().min(1),
});

export const roundResumedPayloadSchema = z.object({
  roundId: roundIdSchema,
});

export const settingChangedPayloadSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

export const experimentAssignedPayloadSchema = z.object({
  experimentId: z.string().min(1),
  variant: z.string().min(1),
  // Sticky until the experiment version changes (FE03 behaviour 4).
  version: z.number().int().nonnegative(),
});

export const experimentExposedPayloadSchema = z.object({
  experimentId: z.string().min(1),
  variant: z.string().min(1),
  surface: z.string().min(1),
});

export const parametersAdoptedPayloadSchema = z.object({
  modelVersion: z.string().min(1),
  params: z.unknown(),
  reviewCount: z.number().int().nonnegative(),
  logLossBefore: z.number(),
  logLossAfter: z.number(),
});

export const emphasisAddedPayloadSchema = z.object({
  entryId: z.string().min(1),
  target: z.string().min(1),
  weight: z.number().positive(),
  source: z.string().min(1),
  start: z.number().int().nonnegative(),
  until: z.number().int().nonnegative().optional(),
});

export const emphasisEndedPayloadSchema = z.object({
  entryId: z.string().min(1),
  reason: z.string().min(1),
});

export const dailyChallengeCompletedPayloadSchema = z.object({
  date: z.string().min(1),
  challengeId: z.string().min(1),
  results: z.unknown(),
});

export const contentPackAppliedPayloadSchema = z.object({
  packVersion: z.string().min(1),
  dataFormat: z.string().min(1),
});

export const importCompletedPayloadSchema = z.object({
  added: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  sourceExportedAt: z.number().int().nonnegative(),
});

export type ItemMetPayload = z.infer<typeof itemMetPayloadSchema>;
export type AnswerRecordedPayload = z.infer<typeof answerRecordedPayloadSchema>;
export type RoundStartedPayload = z.infer<typeof roundStartedPayloadSchema>;
export type RoundEndedPayload = z.infer<typeof roundEndedPayloadSchema>;
export type RoundParkedPayload = z.infer<typeof roundParkedPayloadSchema>;
export type RoundResumedPayload = z.infer<typeof roundResumedPayloadSchema>;
export type SettingChangedPayload = z.infer<typeof settingChangedPayloadSchema>;
export type ExperimentAssignedPayload = z.infer<typeof experimentAssignedPayloadSchema>;
export type ExperimentExposedPayload = z.infer<typeof experimentExposedPayloadSchema>;
export type ParametersAdoptedPayload = z.infer<typeof parametersAdoptedPayloadSchema>;
export type EmphasisAddedPayload = z.infer<typeof emphasisAddedPayloadSchema>;
export type EmphasisEndedPayload = z.infer<typeof emphasisEndedPayloadSchema>;
export type DailyChallengeCompletedPayload = z.infer<typeof dailyChallengeCompletedPayloadSchema>;
export type ContentPackAppliedPayload = z.infer<typeof contentPackAppliedPayloadSchema>;
export type ImportCompletedPayload = z.infer<typeof importCompletedPayloadSchema>;

// Each type owns its payload schema version. A payload change means a new
// schema version, an upgrader and a fixture kept for ever (FE01, D137).
export const CURRENT_EVENT_SCHEMA = {
  ItemMet: 1,
  AnswerRecorded: 1,
  RoundStarted: 1,
  RoundEnded: 1,
  RoundParked: 1,
  RoundResumed: 1,
  SettingChanged: 1,
  ExperimentAssigned: 2,
  ExperimentExposed: 1,
  ParametersAdopted: 1,
  EmphasisAdded: 1,
  EmphasisEnded: 1,
  DailyChallengeCompleted: 1,
  ContentPackApplied: 1,
  ImportCompleted: 1,
} as const satisfies Readonly<Record<EventType, number>>;

const envelope = {
  id: eventIdSchema,
  at: z.number().int().nonnegative(),
  tz: z.string().min(1),
  origin: originIdSchema,
  contextId: contextIdSchema,
};

function variant<TType extends EventType, TPayload extends z.ZodType>(
  type: TType,
  schema: TPayload,
) {
  return z.object({
    ...envelope,
    type: z.literal(type),
    schema: z.literal(CURRENT_EVENT_SCHEMA[type]),
    payload: schema,
  });
}

export const domainEventSchema = z.discriminatedUnion('type', [
  variant('ItemMet', itemMetPayloadSchema),
  variant('AnswerRecorded', answerRecordedPayloadSchema),
  variant('RoundStarted', roundStartedPayloadSchema),
  variant('RoundEnded', roundEndedPayloadSchema),
  variant('RoundParked', roundParkedPayloadSchema),
  variant('RoundResumed', roundResumedPayloadSchema),
  variant('SettingChanged', settingChangedPayloadSchema),
  variant('ExperimentAssigned', experimentAssignedPayloadSchema),
  variant('ExperimentExposed', experimentExposedPayloadSchema),
  variant('ParametersAdopted', parametersAdoptedPayloadSchema),
  variant('EmphasisAdded', emphasisAddedPayloadSchema),
  variant('EmphasisEnded', emphasisEndedPayloadSchema),
  variant('DailyChallengeCompleted', dailyChallengeCompletedPayloadSchema),
  variant('ContentPackApplied', contentPackAppliedPayloadSchema),
  variant('ImportCompleted', importCompletedPayloadSchema),
]);

export type DomainEvent = z.infer<typeof domainEventSchema>;
export type DomainEventOf<TType extends EventType> = Extract<DomainEvent, { type: TType }>;
export type EventPayloadOf<TType extends EventType> = DomainEventOf<TType>['payload'];

// Envelope-only shape, used while upgrading an older payload (FE01 behaviour 5).
export const rawEventEnvelopeSchema = z.object({
  ...envelope,
  type: eventTypeSchema,
  schema: z.number().int().positive(),
  payload: z.unknown(),
});

export type RawEventEnvelope = z.infer<typeof rawEventEnvelopeSchema>;
