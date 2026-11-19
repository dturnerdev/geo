import { z } from 'zod';
import type { ItemId } from './ids.ts';

// FE10 behaviour 5 keeps every MVP answer type in the domain, even where no
// authored game uses it yet (D41). The FE10 Interfaces block does not define
// their individual fields, so these schemas stay structural and add no scoring
// semantics; graders own that in FE11.

// Same WGS 84 coordinate shape as FE06. domain may not import engine, so the
// branded structural type is repeated here (07 §4, m1-map.md FE06 Interfaces).
export type LngLat = Readonly<{ lng: number; lat: number }> & {
  readonly __brand: 'LngLat';
};

export const lngLatSchema = z
  .object({
    lng: z.number().finite().min(-180).max(180),
    lat: z.number().finite().min(-90).max(90),
  })
  .strict()
  .transform((value): LngLat => ({ lng: value.lng, lat: value.lat }) as LngLat);

export type AnswerType =
  | 'region'
  | 'set'
  | 'point'
  | 'choice'
  | 'text'
  | 'assignment'
  | 'sequence'
  | 'bearing'
  | 'path'
  | 'multiValue'
  | 'dateRange'
  | 'comparison'
  | 'audio';

export const answerTypeSchema = z.enum([
  'region',
  'set',
  'point',
  'choice',
  'text',
  'assignment',
  'sequence',
  'bearing',
  'path',
  'multiValue',
  'dateRange',
  'comparison',
  'audio',
]);

export interface RoleValue {
  readonly value: string;
  readonly role: string;
}

export interface DateRangeAnswer {
  readonly kind: 'dateRange';
  readonly from: string;
  readonly to: string;
}

export interface ComparisonAnswer {
  readonly kind: 'comparison';
  readonly left: string;
  readonly right: string;
  readonly relation: 'less' | 'more' | 'equal';
}

export type Answer =
  | { readonly kind: 'region'; readonly at: LngLat | null; readonly itemIds: readonly ItemId[] }
  | { readonly kind: 'set'; readonly itemIds: readonly ItemId[] }
  | { readonly kind: 'point'; readonly at: LngLat }
  | { readonly kind: 'choice'; readonly optionId: string }
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'assignment'; readonly pairs: readonly (readonly [string, string])[] }
  | { readonly kind: 'sequence'; readonly ids: readonly string[] }
  | { readonly kind: 'bearing'; readonly degrees: number; readonly shot: 1 | 2 }
  | { readonly kind: 'path'; readonly points: readonly LngLat[] }
  | { readonly kind: 'multiValue'; readonly values: readonly RoleValue[] }
  | DateRangeAnswer
  | ComparisonAnswer
  | { readonly kind: 'audio'; readonly clipId: string };

const roleValueSchema = z
  .object({
    value: z.string().min(1),
    role: z.string().min(1),
  })
  .strict();

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);

export const regionAnswerSchema = z
  .object({
    kind: z.literal('region'),
    at: lngLatSchema.nullable(),
    itemIds: z.array(z.string().min(1)),
  })
  .strict();

export const setAnswerSchema = z
  .object({
    kind: z.literal('set'),
    itemIds: z.array(z.string().min(1)),
  })
  .strict();

export const pointAnswerSchema = z
  .object({
    kind: z.literal('point'),
    at: lngLatSchema,
  })
  .strict();

export const choiceAnswerSchema = z
  .object({
    kind: z.literal('choice'),
    optionId: z.string().min(1),
  })
  .strict();

export const textAnswerSchema = z
  .object({
    kind: z.literal('text'),
    value: z.string(),
  })
  .strict();

export const assignmentAnswerSchema = z
  .object({
    kind: z.literal('assignment'),
    pairs: z.array(z.tuple([z.string().min(1), z.string().min(1)])),
  })
  .strict();

export const sequenceAnswerSchema = z
  .object({
    kind: z.literal('sequence'),
    ids: z.array(z.string().min(1)),
  })
  .strict();

export const bearingAnswerSchema = z
  .object({
    kind: z.literal('bearing'),
    degrees: z.number().finite().min(0).lt(360),
    shot: z.union([z.literal(1), z.literal(2)]),
  })
  .strict();

export const pathAnswerSchema = z
  .object({
    kind: z.literal('path'),
    points: z.array(lngLatSchema),
  })
  .strict();

export const multiValueAnswerSchema = z
  .object({
    kind: z.literal('multiValue'),
    values: z.array(roleValueSchema),
  })
  .strict();

export const dateRangeAnswerSchema = z
  .object({
    kind: z.literal('dateRange'),
    from: isoDateSchema,
    to: isoDateSchema,
  })
  .strict();

export const comparisonAnswerSchema = z
  .object({
    kind: z.literal('comparison'),
    left: z.string().min(1),
    right: z.string().min(1),
    relation: z.enum(['less', 'more', 'equal']),
  })
  .strict();

export const audioAnswerSchema = z
  .object({
    kind: z.literal('audio'),
    clipId: z.string().min(1),
  })
  .strict();

export const answerSchema = z.discriminatedUnion('kind', [
  regionAnswerSchema,
  setAnswerSchema,
  pointAnswerSchema,
  choiceAnswerSchema,
  textAnswerSchema,
  assignmentAnswerSchema,
  sequenceAnswerSchema,
  bearingAnswerSchema,
  pathAnswerSchema,
  multiValueAnswerSchema,
  dateRangeAnswerSchema,
  comparisonAnswerSchema,
  audioAnswerSchema,
]);

// One schema per answer type, so AC-10.6 can exercise every entry without
// relying on authored content.
export const answerSchemas: Readonly<Record<AnswerType, z.ZodType>> = {
  region: regionAnswerSchema,
  set: setAnswerSchema,
  point: pointAnswerSchema,
  choice: choiceAnswerSchema,
  text: textAnswerSchema,
  assignment: assignmentAnswerSchema,
  sequence: sequenceAnswerSchema,
  bearing: bearingAnswerSchema,
  path: pathAnswerSchema,
  multiValue: multiValueAnswerSchema,
  dateRange: dateRangeAnswerSchema,
  comparison: comparisonAnswerSchema,
  audio: audioAnswerSchema,
};

// Exact FE10 RawResponse union. The primitive component returns one of these
// and never grades (FE10 Interfaces, D118).
export type RawResponse =
  | { kind: 'region'; at: LngLat | null; itemIds: readonly string[] }
  | { kind: 'point'; at: LngLat }
  | { kind: 'choice'; optionId: string }
  | { kind: 'text'; value: string }
  | { kind: 'assignment'; pairs: readonly (readonly [string, string])[] }
  | { kind: 'sequence'; ids: readonly string[] }
  | { kind: 'bearing'; degrees: number; shot: 1 | 2 }
  | { kind: 'path'; points: readonly LngLat[] }
  | { kind: 'showMe' };

export const rawResponseSchema = z.discriminatedUnion('kind', [
  regionAnswerSchema,
  pointAnswerSchema,
  choiceAnswerSchema,
  textAnswerSchema,
  assignmentAnswerSchema,
  sequenceAnswerSchema,
  bearingAnswerSchema,
  pathAnswerSchema,
  z.object({ kind: z.literal('showMe') }).strict(),
]);
