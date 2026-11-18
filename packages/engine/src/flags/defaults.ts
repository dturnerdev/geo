import type {
  ExperimentDefinition,
  FeatureFlagId,
  FlagSnapshot,
  VariantId,
} from '../../../domain/src/flags.ts';

// Code defaults are the last step of the FE03 precedence list. Flags that a
// pack does not define still resolve here, never to an accidental true.
export const AUTO_CONTINUE_FLAG: FeatureFlagId = 'autoContinue';
export const DEFAULT_EXPERIMENT_VARIANT: VariantId = 'A';

export const CODE_FLAG_DEFAULTS: Readonly<Record<FeatureFlagId, boolean>> = {
  autoContinue: false,
  chapterEnd: true,
  dailyChallenge: false,
  experimentalGames: false,
  modelTrial: false,
  points: false,
  tester: false,
};

export function codeDefaultFlag(flag: FeatureFlagId): boolean {
  return CODE_FLAG_DEFAULTS[flag] ?? false;
}

export function defaultVariantFor(experiment: ExperimentDefinition | undefined): VariantId {
  if (experiment === undefined) {
    return DEFAULT_EXPERIMENT_VARIANT;
  }
  return (
    experiment.variants.find((variant) => variant.id === DEFAULT_EXPERIMENT_VARIANT)?.id ??
    experiment.variants[0]?.id ??
    DEFAULT_EXPERIMENT_VARIANT
  );
}

// D158: "No time pressure" always forces tap to continue, overriding E01.
export function autoContinueEnabled(snapshot: Pick<FlagSnapshot, 'flags'>): boolean {
  return snapshot.flags[AUTO_CONTINUE_FLAG] === true;
}
