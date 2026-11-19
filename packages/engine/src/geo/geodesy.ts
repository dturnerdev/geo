import type { LngLat } from './lng-lat.ts';
import { normaliseLngLat } from './lng-lat.ts';

// Game maths on a sphere, R = 6,371.0088 km (D115).
export const EARTH_RADIUS_M = 6_371_008.8;

const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;

export function toRadians(degrees: number): number {
  return degrees * DEGREES_TO_RADIANS;
}

export function toDegrees(radians: number): number {
  return radians * RADIANS_TO_DEGREES;
}

/** Great-circle distance in metres (D115). */
export function greatCircleDistanceM(from: LngLat, to: LngLat): number {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLat = lat2 - lat1;
  const deltaLng = toRadians(to.lng - from.lng);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

/** Initial bearing clockwise from true north, in degrees [0, 360). */
export function initialBearingDeg(from: LngLat, to: LngLat): number {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  const bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/** Point reached from `origin` along a bearing after a distance. */
export function destinationPoint(origin: LngLat, bearingDeg: number, distanceM: number): LngLat {
  const angular = distanceM / EARTH_RADIUS_M;
  const bearing = toRadians(bearingDeg);
  const lat1 = toRadians(origin.lat);
  const lng1 = toRadians(origin.lng);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );
  return normaliseLngLat(toDegrees(lng2), toDegrees(lat2));
}

function unitVector(point: LngLat): readonly [number, number, number] {
  const lat = toRadians(point.lat);
  const lng = toRadians(point.lng);
  return [Math.cos(lat) * Math.cos(lng), Math.sin(lat), Math.cos(lat) * Math.sin(lng)];
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(-1, value));
}

/**
 * Interpolate along the great circle between two points. Used for arcs, and
 * for splitting a flat-map arc at its edge (FE06 Behaviour 7).
 */
export function interpolateGreatCircle(from: LngLat, to: LngLat, t: number): LngLat {
  const clamped = Math.min(1, Math.max(0, t));
  if (clamped === 0) {
    return from;
  }
  if (clamped === 1) {
    return to;
  }

  const a = unitVector(from);
  const b = unitVector(to);
  const dot = clampUnit(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]);
  const angle = Math.acos(dot);

  if (angle < 1e-12) {
    return clamped < 0.5 ? from : to;
  }

  const sinAngle = Math.sin(angle);
  if (Math.abs(sinAngle) < 1e-12) {
    // Antipodal points have no unique great circle; interpolate through the
    // north pole so the result stays deterministic.
    const latitude = from.lat + (to.lat - from.lat) * clamped;
    return normaliseLngLat(from.lng, latitude);
  }

  const weightA = Math.sin((1 - clamped) * angle) / sinAngle;
  const weightB = Math.sin(clamped * angle) / sinAngle;
  const x = a[0] * weightA + b[0] * weightB;
  const y = a[1] * weightA + b[1] * weightB;
  const z = a[2] * weightA + b[2] * weightB;
  const lat = toDegrees(Math.asin(clampUnit(y)));
  const lng = toDegrees(Math.atan2(z, x));
  return normaliseLngLat(lng, lat);
}

/** Split an arc where it leaves the flat map's [-180, 180] longitude range. */
export function splitArcAtMapEdge(
  from: LngLat,
  to: LngLat,
  segments = 48,
): readonly (readonly LngLat[])[] {
  const lines: LngLat[][] = [];
  let current: LngLat[] = [];
  let previous = interpolateGreatCircle(from, to, 0);

  for (let index = 0; index <= segments; index += 1) {
    const point = interpolateGreatCircle(from, to, index / segments);
    if (current.length === 0) {
      current.push(point);
    } else if (Math.abs(point.lng - previous.lng) > 180) {
      // The arc crossed the antimeridian between the two samples.
      current.push(previous);
      lines.push(current);
      current = [point];
    } else {
      current.push(point);
    }
    previous = point;
  }

  if (current.length > 0) {
    lines.push(current);
  }

  return lines;
}
