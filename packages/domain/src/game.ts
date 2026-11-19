import { z } from 'zod';
import { answerTypeSchema, type AnswerType } from './answers.ts';
import type { FeatureFlagId } from './flags.ts';
import type { ItemId } from './ids.ts';

// FE10 game framework types. Names whose shape the spec does not define stay
// opaque branded identifiers so no learner-visible vocabulary is invented
// (M2 plan spec question 3).

export type PrimitiveId = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8' | 'P9';
export type Level = 'R1' | 'R2' | 'R3' | 'R4';
export type Channel = 'visual' | 'audio' | 'spatial' | 'typed';

export type GameId = string & { readonly __brand: 'GameId' };
export type FacetId = string & { readonly __brand: 'FacetId' };
export type AssetKind = string & { readonly __brand: 'AssetKind' };
export type GraderId = string & { readonly __brand: 'GraderId' };
export type GeneratorId = string & { readonly __brand: 'GeneratorId' };

export const primitiveIdSchema = z.enum(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9']);
export const levelSchema = z.enum(['R1', 'R2', 'R3', 'R4']);
export const channelSchema = z.enum(['visual', 'audio', 'spatial', 'typed']);

export const gameIdSchema = z
  .string()
  .min(1)
  .transform((value): GameId => value as GameId);

// The grid uses F01–F34 with lettered sub-facets such as F13a. Only the ID
// shape is fixed here; facet meaning stays authored content.
export const facetIdSchema = z
  .string()
  .regex(/^F(?:0[1-9]|[12]\d|3[0-4])[a-z]?$/u)
  .transform((value): FacetId => value as FacetId);

export const assetKindSchema = z
  .string()
  .min(1)
  .transform((value): AssetKind => value as AssetKind);

export const graderIdSchema = z
  .string()
  .min(1)
  .transform((value): GraderId => value as GraderId);

export const generatorIdSchema = z
  .string()
  .min(1)
  .transform((value): GeneratorId => value as GeneratorId);

// Exact FE10 Interfaces block. The Behaviour list also names a game name, but
// the interface does not; the catalogue carries that metadata separately as an
// explicit Spec question (m2-play.md FE10).
export interface GameDefinition {
  id: GameId;
  primitive: PrimitiveId;
  facet: FacetId;
  level: Level;
  channels: readonly Channel[];
  load: 1 | 2 | 3;
  assets: readonly AssetKind[];
  grader: GraderId;
  generator: GeneratorId;
  flag: FeatureFlagId | null;
}

export const gameDefinitionSchema = z
  .object({
    id: gameIdSchema,
    primitive: primitiveIdSchema,
    facet: facetIdSchema,
    level: levelSchema,
    channels: z.array(channelSchema),
    load: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    assets: z.array(assetKindSchema),
    grader: graderIdSchema,
    generator: generatorIdSchema,
    flag: z.string().min(1).nullable(),
  })
  .strict();

export function parseGameDefinition(input: unknown): GameDefinition {
  return gameDefinitionSchema.parse(input);
}

export type HintId =
  'letter' | 'outline' | 'widerBeam' | 'continent' | 'firstPoint' | 'colourNames';

// The smallest primitive registry needed for catalogue validation and the
// default loads in the FE10 table. Grader and generator IDs are deliberately
// opaque and equal to the primitive until FE11 defines graded behaviour.
export interface PrimitiveSpec {
  readonly id: PrimitiveId;
  readonly type: string;
  readonly answerType: AnswerType;
  readonly defaultLoad: 1 | 2 | 3;
  readonly hints: readonly HintId[];
  readonly grader: GraderId;
  readonly generator: GeneratorId;
}

function spec(
  id: PrimitiveId,
  type: string,
  answerType: AnswerType,
  defaultLoad: 1 | 2 | 3,
  hints: readonly HintId[],
): PrimitiveSpec {
  return {
    id,
    type,
    answerType,
    defaultLoad,
    hints,
    grader: id as GraderId,
    generator: id as GeneratorId,
  };
}

export const PRIMITIVE_SPECS: Readonly<Record<PrimitiveId, PrimitiveSpec>> = {
  P1: spec('P1', 'tap-region', 'region', 1, ['outline', 'continent']),
  P2: spec('P2', 'place-point', 'point', 2, ['outline']),
  P3: spec('P3', 'choice', 'choice', 1, ['continent', 'colourNames']),
  P4: spec('P4', 'type-answer', 'text', 2, ['letter']),
  P5: spec('P5', 'drag-place', 'assignment', 2, ['outline', 'firstPoint']),
  P6: spec('P6', 'put-in-order', 'sequence', 2, ['firstPoint']),
  P7: spec('P7', 'chain', 'sequence', 3, ['firstPoint']),
  P8: spec('P8', 'aim-beam', 'bearing', 2, ['widerBeam']),
  P9: spec('P9', 'draw-path', 'path', 3, ['outline', 'firstPoint']),
};

export function isPrimitiveId(value: unknown): value is PrimitiveId {
  return typeof value === 'string' && value in PRIMITIVE_SPECS;
}

export function isFacetId(value: unknown): value is FacetId {
  return typeof value === 'string' && facetIdSchema.safeParse(value).success;
}

// Question is only named by FE10; its exact shape is not specified. Keep the
// generated boundary structural: identity, the authored game slot, and the
// label set the renderer must hide. No coordinates, answers or lookalike data
// are invented because ContentView cannot supply them.
export interface QuestionOption {
  readonly id: string;
  readonly item: ItemId | null;
}

export interface Question {
  readonly id: string;
  readonly game: GameId;
  readonly item: ItemId;
  readonly primitive: PrimitiveId;
  readonly facet: FacetId;
  readonly level: Level;
  readonly seed: number;
  readonly answerType: AnswerType;
  readonly options: readonly QuestionOption[];
  readonly hiddenLabels: readonly ItemId[];
}

export type GenerateError =
  | { readonly kind: 'item-not-in-view' }
  | { readonly kind: 'not-enough-options'; readonly needed: number; readonly available: number }
  | { readonly kind: 'invalid-seed' };

export const questionSchema = z
  .object({
    id: z.string().min(1),
    game: z.string().min(1),
    item: z.string().min(1),
    primitive: primitiveIdSchema,
    facet: z.string().min(1),
    level: levelSchema,
    seed: z.number().finite(),
    answerType: answerTypeSchema,
    options: z.array(
      z
        .object({
          id: z.string().min(1),
          item: z.string().min(1).nullable(),
        })
        .strict(),
    ),
    hiddenLabels: z.array(z.string().min(1)),
  })
  .strict();
