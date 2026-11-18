import { CALIBRATION_MIN_BIN_SAMPLE, CALIBRATION_MIN_SAMPLE } from '../tuning.ts';
import type { CalibrationReport } from './types.ts';

export interface CalibrationSample {
  readonly predicted: number;
  readonly actual: 0 | 1;
}

export interface CalibrationBin {
  readonly lowerBound: number;
  readonly upperBound: number;
  readonly count: number;
  readonly predictedSum: number;
  readonly actualSum: number;
}

const BIN_COUNT = 10;
const MIN_PROBABILITY = 1e-15;

function binIndex(predicted: number): number {
  return Math.min(BIN_COUNT - 1, Math.max(0, Math.floor(predicted * BIN_COUNT)));
}

// Equal-width probability bins. Bins smaller than the placeholder minimum
// merge with a neighbour until every used bin is large enough (FE04 item 4).
export function calibrationBins(samples: readonly CalibrationSample[]): readonly CalibrationBin[] {
  const bins: CalibrationBin[] = Array.from({ length: BIN_COUNT }, (_, index) => ({
    lowerBound: index / BIN_COUNT,
    upperBound: (index + 1) / BIN_COUNT,
    count: 0,
    predictedSum: 0,
    actualSum: 0,
  }));

  for (const sample of samples) {
    const index = binIndex(sample.predicted);
    const bin = bins[index];
    if (bin === undefined) {
      continue;
    }
    bins[index] = {
      ...bin,
      count: bin.count + 1,
      predictedSum: bin.predictedSum + sample.predicted,
      actualSum: bin.actualSum + sample.actual,
    };
  }

  const active = bins.filter((bin) => bin.count > 0);
  while (active.length > 1) {
    const smallIndex = active.findIndex((bin) => bin.count < CALIBRATION_MIN_BIN_SAMPLE);
    if (smallIndex === -1) {
      break;
    }
    const neighbourIndex = smallIndex > 0 ? smallIndex - 1 : smallIndex + 1;
    const keepIndex = Math.min(smallIndex, neighbourIndex);
    const dropIndex = Math.max(smallIndex, neighbourIndex);
    const keep = active[keepIndex];
    const drop = active[dropIndex];
    if (keep === undefined || drop === undefined) {
      break;
    }
    active[keepIndex] = {
      lowerBound: Math.min(keep.lowerBound, drop.lowerBound),
      upperBound: Math.max(keep.upperBound, drop.upperBound),
      count: keep.count + drop.count,
      predictedSum: keep.predictedSum + drop.predictedSum,
      actualSum: keep.actualSum + drop.actualSum,
    };
    active.splice(dropIndex, 1);
  }

  return active;
}

function clampProbability(value: number): number {
  return Math.min(1 - MIN_PROBABILITY, Math.max(MIN_PROBABILITY, value));
}

// Below the minimum sample a metric returns null, never 0 (AC-04.4).
export function computeCalibration(
  samples: readonly CalibrationSample[],
): CalibrationReport | null {
  if (samples.length < CALIBRATION_MIN_SAMPLE) {
    return null;
  }

  let logLoss = 0;
  for (const sample of samples) {
    const probability = clampProbability(sample.predicted);
    logLoss += sample.actual === 1 ? -Math.log(probability) : -Math.log(1 - probability);
  }
  logLoss /= samples.length;

  const bins = calibrationBins(samples);
  let squaredError = 0;
  for (const bin of bins) {
    const predictedMean = bin.predictedSum / bin.count;
    const actualMean = bin.actualSum / bin.count;
    squaredError += (predictedMean - actualMean) ** 2;
  }
  const rmseBins = bins.length === 0 ? 0 : Math.sqrt(squaredError / bins.length);

  return { logLoss, rmseBins };
}
