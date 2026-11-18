import type { InstallId } from '../../../domain/src/ids.ts';
import { describe, expect, it } from 'vitest';
import {
  assignExperimentVariant,
  EXPERIMENT_BUCKET_COUNT,
  experimentBucket,
  variantForBucket,
} from './assignment.ts';

const variants = [
  { id: 'A', weight: 5000 },
  { id: 'B', weight: 3000 },
  { id: 'C', weight: 2000 },
] as const;

function installId(index: number): InstallId {
  return `0192f000-0000-7000-8000-${index.toString(16).padStart(12, '0')}` as InstallId;
}

describe('FE03 weighted sticky assignment', () => {
  it('AC-03.2 over 100,000 random install IDs each variant gets its weight ±1%', () => {
    const counts = new Map<string, number>([
      ['A', 0],
      ['B', 0],
      ['C', 0],
    ]);

    for (let index = 0; index < 100_000; index += 1) {
      const variant = assignExperimentVariant(installId(index), 'E03', 1, variants);
      counts.set(variant, (counts.get(variant) ?? 0) + 1);
    }

    for (const variant of variants) {
      const share = (counts.get(variant.id) ?? 0) / 100_000;
      expect(share).toBeGreaterThanOrEqual(variant.weight / 10_000 - 0.01);
      expect(share).toBeLessThanOrEqual(variant.weight / 10_000 + 0.01);
    }
  });

  it('uses the FE03 bucket formula and keeps the bucket inside 0–9999', () => {
    const id = installId(42);
    const bucket = experimentBucket(id, 'E01', 3);
    expect(bucket).toBeGreaterThanOrEqual(0);
    expect(bucket).toBeLessThan(EXPERIMENT_BUCKET_COUNT);
    expect(assignExperimentVariant(id, 'E01', 3, variants)).toBe(
      variantForBucket(bucket, variants),
    );
  });

  it('is sticky for the same install, experiment and version', () => {
    const id = installId(7);
    const first = assignExperimentVariant(id, 'E01', 1, variants);
    for (let index = 0; index < 20; index += 1) {
      expect(assignExperimentVariant(id, 'E01', 1, variants)).toBe(first);
    }
  });

  it('maps the boundaries of the cumulative weights deterministically', () => {
    expect(variantForBucket(0, variants)).toBe('A');
    expect(variantForBucket(4999, variants)).toBe('A');
    expect(variantForBucket(5000, variants)).toBe('B');
    expect(variantForBucket(7999, variants)).toBe('B');
    expect(variantForBucket(8000, variants)).toBe('C');
    expect(variantForBucket(9999, variants)).toBe('C');
  });
});
