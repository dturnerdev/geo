import type { ExperimentId, VariantId } from '../../../domain/src/flags.ts';
import type { InstallId } from '../../../domain/src/ids.ts';
import { hash32 } from '../random.ts';

export const EXPERIMENT_BUCKET_COUNT = 10_000;

export interface VariantWeight {
  readonly id: VariantId;
  readonly weight: number;
}

// bucket = hash32(installId + ':' + experimentId + ':' + version) mod 10000
// (FE03 behaviour 4). The string is built exactly as specified so every
// platform assigns the same bucket.
export function experimentBucket(
  installId: InstallId,
  experimentId: ExperimentId,
  version: number,
): number {
  return hash32(`${installId}:${experimentId}:${version}`) % EXPERIMENT_BUCKET_COUNT;
}

// Maps a bucket to a variant by cumulative weight. Weights are bucket parts and
// sum to 10,000 in a validated experiment definition.
export function variantForBucket(bucket: number, variants: readonly VariantWeight[]): VariantId {
  if (variants.length === 0) {
    throw new RangeError('an experiment needs at least one variant');
  }

  const total = variants.reduce((sum, variant) => sum + variant.weight, 0);
  if (total <= 0) {
    throw new RangeError('experiment weights must be positive');
  }

  const clamped = Math.min(Math.max(Math.trunc(bucket), 0), EXPERIMENT_BUCKET_COUNT - 1);
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight;
    if (clamped < cumulative) {
      return variant.id;
    }
  }
  const last = variants[variants.length - 1];
  if (last === undefined) {
    throw new RangeError('an experiment needs at least one variant');
  }
  return last.id;
}

export function assignExperimentVariant(
  installId: InstallId,
  experimentId: ExperimentId,
  version: number,
  variants: readonly VariantWeight[],
): VariantId {
  return variantForBucket(experimentBucket(installId, experimentId, version), variants);
}
