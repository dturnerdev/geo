import type { Result } from '../../../domain/src/result.ts';
import { err, ok } from '../../../domain/src/result.ts';

// WGS 84 decimal degrees (D112–D114). The brand keeps an unchecked number pair
// from crossing a boundary as a coordinate (07 §8).
export type LngLat = Readonly<{ lng: number; lat: number }> & {
  readonly __brand: 'LngLat';
};

export type LngLatError =
  | { readonly kind: 'not-finite' }
  | { readonly kind: 'out-of-range' }
  | { readonly kind: 'too-many-decimals' };

const DECIMAL_SCALE = 1_000_000;

function hasAtMostSixDecimals(value: number): boolean {
  const scaled = value * DECIMAL_SCALE;
  const nearest = Math.round(scaled);
  // Allow a tiny floating-point residue: values that were rounded to six
  // decimals before branding must pass, while a seventh decimal must not.
  return Math.abs(scaled - nearest) <= 1e-3;
}

/** Validate a coordinate pair at an external boundary (FE06, 07 §8). */
export function lngLat(lng: number, lat: number): Result<LngLat, LngLatError> {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return err({ kind: 'not-finite' });
  }
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    return err({ kind: 'out-of-range' });
  }
  if (!hasAtMostSixDecimals(lng) || !hasAtMostSixDecimals(lat)) {
    return err({ kind: 'too-many-decimals' });
  }
  return ok({ lng, lat } as LngLat);
}

/** Round to the stored precision before constructing a branded value. */
export function roundLngLat(lng: number, lat: number): LngLat {
  return {
    lng: Math.round(lng * DECIMAL_SCALE) / DECIMAL_SCALE,
    lat: Math.round(lat * DECIMAL_SCALE) / DECIMAL_SCALE,
  } as LngLat;
}

/** Normalise a longitude to [-180, 180] without changing its position. */
export function normaliseLng(lng: number): number {
  if (!Number.isFinite(lng)) {
    return 0;
  }
  const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 ? 180 : wrapped;
}

export function clampLat(lat: number): number {
  if (!Number.isFinite(lat)) {
    return 0;
  }
  return Math.min(90, Math.max(-90, lat));
}

/**
 * Construct a valid coordinate from computed values at an internal boundary.
 * Longitudes wrap and latitudes clamp, so a renderer never passes an invalid
 * `LngLat` inward (FE06 Interfaces).
 */
export function normaliseLngLat(lng: number, lat: number): LngLat {
  return roundLngLat(normaliseLng(lng), clampLat(lat));
}

export function isLngLat(value: unknown): value is LngLat {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as { lng?: unknown; lat?: unknown };
  return (
    typeof candidate.lng === 'number' &&
    typeof candidate.lat === 'number' &&
    Number.isFinite(candidate.lng) &&
    Number.isFinite(candidate.lat) &&
    candidate.lng >= -180 &&
    candidate.lng <= 180 &&
    candidate.lat >= -90 &&
    candidate.lat <= 90
  );
}
