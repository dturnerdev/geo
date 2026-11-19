// Minimal ambient declaration for the pinned d3-geo build (no @types package is
// allowed; the brief records that d3-geo ships no types). Only the surface used
// by engine/geo is declared (07 §2).
declare module 'd3-geo' {
  export interface GeoProjection {
    (point: readonly [number, number]): readonly [number, number] | null;
    invert?(point: readonly [number, number]): readonly [number, number] | null;
    scale(value: number): GeoProjection;
    translate(value: readonly [number, number]): GeoProjection;
    center(value: readonly [number, number]): GeoProjection;
    rotate(value: readonly [number, number, number]): GeoProjection;
  }

  export function geoEqualEarth(): GeoProjection;
}
