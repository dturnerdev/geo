import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createEqualEarthView, lngLat, normaliseLng, normaliseLngLat } from './index.ts';

const VIEW_WIDTH = 1_200;
const VIEW_HEIGHT = 700;

function angularDifference(a: number, b: number): number {
  return Math.abs(((((a - b + 180) % 360) + 360) % 360) - 180);
}

describe('engine/geo coordinates and Equal Earth', () => {
  it('AC-06.1 screenToLngLat round-trips the flat projection within 0.01° for 10,000 points', () => {
    const view = createEqualEarthView(VIEW_WIDTH, VIEW_HEIGHT);
    fc.assert(
      fc.property(
        fc.integer({ min: -180_000_000, max: 180_000_000 }),
        fc.integer({ min: -90_000_000, max: 90_000_000 }),
        (lngScaled, latScaled) => {
          const point = normaliseLngLat(lngScaled / 1_000_000, latScaled / 1_000_000);
          const projected = view.project(point);
          if (projected === null) {
            throw new Error(`projection returned null for ${point.lng},${point.lat}`);
          }
          const inverted = view.invert(projected.x, projected.y);
          if (inverted === null) {
            throw new Error(`inverse returned null at ${projected.x},${projected.y}`);
          }
          expect(angularDifference(inverted.lng, point.lng)).toBeLessThanOrEqual(0.01);
          expect(Math.abs(inverted.lat - point.lat)).toBeLessThanOrEqual(0.01);
        },
      ),
      { numRuns: 10_000, seed: 61 },
    );
  });

  it('handles poles, the 180° line, Fiji and Chukotka on the flat map', () => {
    const view = createEqualEarthView(VIEW_WIDTH, VIEW_HEIGHT);
    const edges = [
      normaliseLngLat(180, 90),
      normaliseLngLat(-180, -90),
      normaliseLngLat(180, -16.5),
      normaliseLngLat(-179.8, -16.5),
      normaliseLngLat(179.9, 66),
      normaliseLngLat(-179.9, 66),
    ];

    for (const point of edges) {
      const flat = view.project(point);
      expect(flat).not.toBeNull();
      if (flat !== null) {
        const inverted = view.invert(flat.x, flat.y);
        expect(inverted).not.toBeNull();
      }
    }
  });

  it('validates coordinate boundaries and rounds internal values to six decimals', () => {
    expect(lngLat(181, 0)).toEqual({ ok: false, error: { kind: 'out-of-range' } });
    expect(lngLat(0, 91)).toEqual({ ok: false, error: { kind: 'out-of-range' } });
    expect(lngLat(Number.NaN, 0)).toEqual({ ok: false, error: { kind: 'not-finite' } });
    expect(lngLat(1.1234567, 0)).toEqual({ ok: false, error: { kind: 'too-many-decimals' } });
    const valid = lngLat(-0.127758, 51.507351);
    expect(valid.ok).toBe(true);
    expect(normaliseLng(540)).toBe(180);
    expect(normaliseLngLat(180.000001, 0)).toEqual({ lng: -179.999999, lat: 0 });
  });

  it('keeps the flat map centred on 0° with no horizontal wrapping', () => {
    const view = createEqualEarthView(VIEW_WIDTH, VIEW_HEIGHT);
    const west = view.project(normaliseLngLat(-179, 0));
    const east = view.project(normaliseLngLat(179, 0));
    expect(west).not.toBeNull();
    expect(east).not.toBeNull();
    if (west !== null && east !== null) {
      expect(west.x).toBeLessThan(east.x);
      expect(view.invert(-10, VIEW_HEIGHT / 2)).toBeNull();
    }
  });
});
