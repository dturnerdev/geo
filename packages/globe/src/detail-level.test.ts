import { describe, expect, it } from 'vitest';
import {
  DETAIL_HYSTERESIS_ZOOM_LEVELS,
  createDetailLevelSelector,
  nextDetailLevel,
  zoomLevelForDistance,
  type DetailLevel,
  type DetailLevelThresholds,
} from './detail-level.ts';

const THRESHOLDS: DetailLevelThresholds = { L1: 1, L2: 2 };
const REFERENCE = 100;

function distanceFor(zoomLevel: number): number {
  return REFERENCE / 2 ** zoomLevel;
}

function changes(levels: readonly DetailLevel[]): number {
  let count = 0;
  for (let index = 1; index < levels.length; index += 1) {
    if (levels[index] !== levels[index - 1]) {
      count += 1;
    }
  }
  return count;
}

describe('FE09 detail level selection', () => {
  it('AC-09.4 level changes do not flicker when the camera sits on a boundary', () => {
    const selector = createDetailLevelSelector({
      thresholds: THRESHOLDS,
      referenceDistanceM: REFERENCE,
    });
    const jitter = [-0.01, 0.01, -0.01, 0.01, -0.02, 0.02, 0, 0.01, -0.01];

    const aroundL1 = jitter.map((offset) => selector.select(distanceFor(THRESHOLDS.L1 + offset)));
    expect(changes(aroundL1)).toBeLessThanOrEqual(1);
    expect(aroundL1.at(-1)).toBe('L1');

    const aroundL2 = jitter.map((offset) => selector.select(distanceFor(THRESHOLDS.L2 + offset)));
    expect(changes(aroundL2)).toBeLessThanOrEqual(1);
    expect(aroundL2.at(-1)).toBe('L2');
  });

  it('AC-09.9 zooming within 0.25 levels of a threshold changes the level at most once', () => {
    const band = [-0.24, -0.1, 0, 0.1, 0.24, 0.1, 0, -0.1, -0.24];

    for (const initialLevel of ['L0', 'L1'] as const) {
      const selector = createDetailLevelSelector({
        thresholds: THRESHOLDS,
        referenceDistanceM: REFERENCE,
        initialLevel,
      });
      const visited = band.map((offset) => selector.select(distanceFor(THRESHOLDS.L1 + offset)));
      expect(changes(visited)).toBeLessThanOrEqual(1);
    }

    const fromL2 = createDetailLevelSelector({
      thresholds: THRESHOLDS,
      referenceDistanceM: REFERENCE,
      initialLevel: 'L2',
    });
    const visited = band.map((offset) => fromL2.select(distanceFor(THRESHOLDS.L2 + offset)));
    expect(changes(visited)).toBeLessThanOrEqual(1);
  });

  it('rises at the threshold and falls only beyond the hysteresis band', () => {
    expect(nextDetailLevel('L0', THRESHOLDS.L1 - 0.01, THRESHOLDS)).toBe('L0');
    expect(nextDetailLevel('L0', THRESHOLDS.L1, THRESHOLDS)).toBe('L1');
    expect(nextDetailLevel('L1', THRESHOLDS.L1 - 0.24, THRESHOLDS)).toBe('L1');
    expect(nextDetailLevel('L1', THRESHOLDS.L1 - 0.25, THRESHOLDS)).toBe('L1');
    expect(nextDetailLevel('L1', THRESHOLDS.L1 - 0.26, THRESHOLDS)).toBe('L0');

    expect(nextDetailLevel('L1', THRESHOLDS.L2, THRESHOLDS)).toBe('L2');
    expect(nextDetailLevel('L2', THRESHOLDS.L2 - 0.24, THRESHOLDS)).toBe('L2');
    expect(nextDetailLevel('L2', THRESHOLDS.L2 - 0.26, THRESHOLDS)).toBe('L1');
    expect(nextDetailLevel('L2', THRESHOLDS.L1 - 0.26, THRESHOLDS)).toBe('L0');
  });

  it('treats one zoom level as a doubling of camera distance', () => {
    expect(zoomLevelForDistance(REFERENCE, REFERENCE)).toBe(0);
    expect(zoomLevelForDistance(REFERENCE / 2, REFERENCE)).toBe(1);
    expect(zoomLevelForDistance(REFERENCE / 4, REFERENCE)).toBe(2);
    expect(DETAIL_HYSTERESIS_ZOOM_LEVELS).toBe(0.25);
  });

  it('rejects invalid thresholds and distances', () => {
    expect(() => zoomLevelForDistance(0, REFERENCE)).toThrow(TypeError);
    expect(() =>
      createDetailLevelSelector({
        thresholds: { L1: 2, L2: 1 },
        referenceDistanceM: REFERENCE,
      }),
    ).toThrow(TypeError);
    expect(() => nextDetailLevel('L0', 0, THRESHOLDS, -0.1)).toThrow(TypeError);
  });
});
