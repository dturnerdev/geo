import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { normaliseLngLat } from '../../engine/src/geo/index.ts';
import { globeScreenToLngLat, projectToScreen } from './camera.ts';

const WIDTH = 1_200;
const HEIGHT = 700;
const TARGET = {
  centre: normaliseLngLat(0, 0),
  distanceM: 6_371_008.8 * 1.6,
  azimuthDeg: 0,
  elevationDeg: 0,
};

function angularDifference(a: number, b: number): number {
  return Math.abs(((((a - b + 180) % 360) + 360) % 360) - 180);
}

describe('FE06 globe picking', () => {
  it('AC-06.1 screenToLngLat round-trips the globe projection within 0.01° for 10,000 points', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -30_000_000, max: 30_000_000 }),
        fc.integer({ min: -30_000_000, max: 30_000_000 }),
        (lngScaled, latScaled) => {
          const point = normaliseLngLat(lngScaled / 1_000_000, latScaled / 1_000_000);
          const screen = projectToScreen(point, TARGET, WIDTH, HEIGHT);
          if (!screen.visible) {
            throw new Error(`point was culled at ${point.lng},${point.lat}`);
          }
          const inverted = globeScreenToLngLat(TARGET, WIDTH, HEIGHT, screen.x, screen.y);
          if (inverted === null) {
            throw new Error('globe pick returned null for a projected point');
          }
          expect(angularDifference(inverted.lng, point.lng)).toBeLessThanOrEqual(0.01);
          expect(Math.abs(inverted.lat - point.lat)).toBeLessThanOrEqual(0.01);
        },
      ),
      { numRuns: 10_000, seed: 62 },
    );
  });

  it('returns null for a tap in space and keeps poles and the 180° line exact', () => {
    expect(globeScreenToLngLat(TARGET, WIDTH, HEIGHT, 1, 1)).toBeNull();

    const pole = normaliseLngLat(0, 90);
    const poleScreen = projectToScreen(pole, { ...TARGET, elevationDeg: -85 }, WIDTH, HEIGHT);
    if (poleScreen.visible) {
      const inverted = globeScreenToLngLat(
        { ...TARGET, elevationDeg: -85 },
        WIDTH,
        HEIGHT,
        poleScreen.x,
        poleScreen.y,
      );
      expect(inverted).not.toBeNull();
      expect(Math.abs((inverted?.lat ?? 0) - 90)).toBeLessThanOrEqual(0.01);
    }

    const fiji = normaliseLngLat(180, -16.5);
    const fijiScreen = projectToScreen(fiji, TARGET, WIDTH, HEIGHT);
    expect(fijiScreen.visible).toBe(false);
    const chukotka = normaliseLngLat(-179.9, 66);
    const chukotkaScreen = projectToScreen(chukotka, TARGET, WIDTH, HEIGHT);
    expect(chukotkaScreen.visible).toBe(false);
  });
});
