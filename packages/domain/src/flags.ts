import { z } from 'zod';

// FE03 build channels. Public builds always resolve experiments to their
// default variant (FE03 behaviour 2, D110).
export const buildChannelSchema = z.enum(['internal', 'closed', 'public']);
export type BuildChannel = z.infer<typeof buildChannelSchema>;

export type FeatureFlagId = string;
export type ExperimentId = string;
export type VariantId = string;

// Known experiments get a narrow variant type for callers, so the developer
// panel and feature code cannot pass an arbitrary variant string around.
export interface ExperimentVariantMap {
  readonly E01: 'A' | 'B';
  readonly E03: 'A' | 'B' | 'C';
  readonly E04: VariantId;
  readonly E06: VariantId;
  readonly E07: VariantId;
  readonly E08: 'A' | 'B';
  readonly E09: 'A' | 'B';
}

export type VariantOf<E extends ExperimentId> = E extends keyof ExperimentVariantMap
  ? ExperimentVariantMap[E]
  : VariantId;

// Sources follow FE03 behaviour 3, highest precedence first. `unknown` is only
// for a name the panel does not know about.
export type ValueSource =
  'compliance' | 'developer-override' | 'experiment' | 'pack' | 'code-default' | 'unknown';

// Exact FE03 interface. The engine never reads flags; app-shell passes it a
// resolved FlagSnapshot per round instead (FE03 Interfaces).
export interface FlagReader {
  isOn(flag: FeatureFlagId): boolean;
  variant<E extends ExperimentId>(experiment: E): VariantOf<E>;
  explain(flagOrExperiment: string): ValueSource;
}

export interface FlagSnapshot {
  readonly channel: BuildChannel;
  readonly flags: Readonly<Record<FeatureFlagId, boolean>>;
  readonly variants: Readonly<Record<ExperimentId, VariantId>>;
  readonly sources: Readonly<Record<string, ValueSource>>;
}

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, 'must be an ISO calendar date (YYYY-MM-DD)');

export const flagDefinitionSchema = z
  .object({
    id: z.string().min(1),
    default: z.boolean(),
    description: z.string().min(1),
    owner: z.string().min(1),
    reviewDate: isoDateSchema,
  })
  .strict();

export type FlagDefinition = z.infer<typeof flagDefinitionSchema>;

// Pack chunks may carry the older, minimal flag shape while authored content
// uses the complete FE03 definition.
export const packFlagSchema = z
  .object({
    id: z.string().min(1),
    default: z.boolean(),
    description: z.string().min(1).optional(),
    owner: z.string().min(1).optional(),
    reviewDate: isoDateSchema.optional(),
  })
  .strict();

export type PackFlag = z.infer<typeof packFlagSchema>;

export const experimentVariantSchema = z
  .object({
    id: z.string().min(1),
    // Weights are bucket parts; all variants in an experiment sum to 10,000
    // (FE03 behaviour 4).
    weight: z.number().int().positive().max(10_000),
    // Optional flag value the variant applies when the experiment is linked to
    // a flag (FE03 precedence 3 before 4).
    flagValue: z.boolean().optional(),
  })
  .strict();

export type ExperimentVariant = z.infer<typeof experimentVariantSchema>;

export const experimentDefinitionSchema = z
  .object({
    id: z.string().regex(/^E\d{2}$/u, 'must be an experiment ID such as E01'),
    version: z.number().int().positive(),
    variants: z.array(experimentVariantSchema).min(1),
    flag: z.string().min(1).optional(),
    register: z.string().regex(/^experiments\/E\d{2}\.md$/u),
  })
  .strict()
  .superRefine((experiment, context) => {
    const total = experiment.variants.reduce((sum, variant) => sum + variant.weight, 0);
    if (total !== 10_000) {
      context.addIssue({
        code: 'custom',
        path: ['variants'],
        message: 'variant weights must sum to 10000',
      });
    }

    const seen = new Set<string>();
    for (const [index, variant] of experiment.variants.entries()) {
      if (seen.has(variant.id)) {
        context.addIssue({
          code: 'custom',
          path: ['variants', index, 'id'],
          message: `duplicate variant "${variant.id}"`,
        });
      }
      seen.add(variant.id);
    }

    if (!seen.has('A')) {
      context.addIssue({
        code: 'custom',
        path: ['variants'],
        message: 'the default variant A is required',
      });
    }

    if (experiment.register !== `experiments/${experiment.id}.md`) {
      context.addIssue({
        code: 'custom',
        path: ['register'],
        message: `register must be experiments/${experiment.id}.md`,
      });
    }
  });

export type ExperimentDefinition = z.infer<typeof experimentDefinitionSchema>;

export const flagExperimentDefinitionsSchema = z
  .object({
    flags: z.array(flagDefinitionSchema).default([]),
    experiments: z.array(experimentDefinitionSchema).default([]),
  })
  .strict()
  .superRefine((definitions, context) => {
    const flagIds = new Set<string>();
    for (const [index, flag] of definitions.flags.entries()) {
      if (flagIds.has(flag.id)) {
        context.addIssue({
          code: 'custom',
          path: ['flags', index, 'id'],
          message: `duplicate flag "${flag.id}"`,
        });
      }
      flagIds.add(flag.id);
    }

    const experimentIds = new Set<string>();
    for (const [index, experiment] of definitions.experiments.entries()) {
      if (experimentIds.has(experiment.id)) {
        context.addIssue({
          code: 'custom',
          path: ['experiments', index, 'id'],
          message: `duplicate experiment "${experiment.id}"`,
        });
      }
      experimentIds.add(experiment.id);

      if (experiment.flag !== undefined && !flagIds.has(experiment.flag)) {
        context.addIssue({
          code: 'custom',
          path: ['experiments', index, 'flag'],
          message: `experiment "${experiment.id}" names an unknown flag "${experiment.flag}"`,
        });
      }
    }
  });

export type FlagExperimentDefinitions = z.infer<typeof flagExperimentDefinitionsSchema>;

export function parseFlagExperimentDefinitions(input: unknown): FlagExperimentDefinitions {
  return flagExperimentDefinitionsSchema.parse(input);
}
