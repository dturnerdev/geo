import {
  EARTH_RADIUS_M,
  normaliseLngLat,
  toDegrees,
  toRadians,
} from '../../engine/src/geo/index.ts';
import type { LngLat } from '../../engine/src/geo/index.ts';
import type { CameraState, CameraTarget, ViewMode } from './types.ts';

// Renderer zoom limits. FE09 owns the eventual thresholds; these clamp a
// camera target so a malformed value can never invert the view.
export const MIN_CAMERA_DISTANCE_M = EARTH_RADIUS_M * 0.25;
export const MAX_CAMERA_DISTANCE_M = EARTH_RADIUS_M * 2.5;

export const CAMERA_FLIGHT_MIN_MS = 600;
export const CAMERA_FLIGHT_MAX_MS = 1_200;
export const REDUCED_MOTION_FLIGHT_MS = 150;

export interface Vector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normaliseDegrees(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const wrapped = value % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

/** Normalise angular wrap at the renderer boundary (FE06 Interfaces). */
export function normaliseCameraTarget(target: CameraTarget): CameraTarget {
  const distance = Number.isFinite(target.distanceM)
    ? clamp(target.distanceM, MIN_CAMERA_DISTANCE_M, MAX_CAMERA_DISTANCE_M)
    : EARTH_RADIUS_M;
  return {
    centre: target.centre,
    distanceM: distance,
    azimuthDeg: normaliseDegrees(target.azimuthDeg),
    elevationDeg: clamp(Number.isFinite(target.elevationDeg) ? target.elevationDeg : 0, -85, 85),
  };
}

export function cameraState(target: CameraTarget, mode: ViewMode): CameraState {
  return { ...normaliseCameraTarget(target), mode };
}

export function orbitCamera(
  target: CameraTarget,
  deltaAzimuthDeg: number,
  deltaElevationDeg: number,
): CameraTarget {
  return normaliseCameraTarget({
    ...target,
    azimuthDeg: target.azimuthDeg + deltaAzimuthDeg,
    elevationDeg: target.elevationDeg + deltaElevationDeg,
  });
}

/** A zoom factor above 1 moves the camera closer. */
export function zoomCamera(target: CameraTarget, factor: number): CameraTarget {
  return normaliseCameraTarget({
    ...target,
    distanceM: target.distanceM / Math.max(0.01, factor),
  });
}

/** `motion.camera`: 600–1,200 ms scaled by distance, with reduce motion (06 §7). */
export function cameraFlightDurationMs(
  from: CameraTarget,
  to: CameraTarget,
  reduceMotion: boolean,
): number {
  if (reduceMotion) {
    return REDUCED_MOTION_FLIGHT_MS;
  }
  const start = unitVector(from.centre);
  const end = unitVector(to.centre);
  const dot = clamp(start.x * end.x + start.y * end.y + start.z * end.z, -1, 1);
  const angular = Math.acos(dot) / Math.PI;
  const zoom =
    Math.abs(Math.log(to.distanceM / from.distanceM)) /
    Math.log(MAX_CAMERA_DISTANCE_M / MIN_CAMERA_DISTANCE_M);
  const mixed = clamp(Math.max(angular, zoom), 0, 1);
  return Math.round(CAMERA_FLIGHT_MIN_MS + (CAMERA_FLIGHT_MAX_MS - CAMERA_FLIGHT_MIN_MS) * mixed);
}

export function unitVector(point: LngLat): Vector3 {
  const lat = toRadians(point.lat);
  const lng = toRadians(point.lng);
  return {
    x: Math.cos(lat) * Math.cos(lng),
    y: Math.sin(lat),
    z: Math.cos(lat) * Math.sin(lng),
  };
}

export function pointFromUnit(vector: Vector3): LngLat {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
  const x = vector.x / length;
  const y = vector.y / length;
  const z = vector.z / length;
  return normaliseLngLat(toDegrees(Math.atan2(z, x)), toDegrees(Math.asin(clamp(y, -1, 1))));
}

function add(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scale(vector: Vector3, factor: number): Vector3 {
  return { x: vector.x * factor, y: vector.y * factor, z: vector.z * factor };
}

function dot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalise(vector: Vector3): Vector3 {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (length === 0) {
    return { x: 0, y: 1, z: 0 };
  }
  return scale(vector, 1 / length);
}

interface CameraFrame {
  readonly position: Vector3;
  readonly forward: Vector3;
  readonly right: Vector3;
  readonly up: Vector3;
}

const WORLD_UP: Vector3 = { x: 0, y: 1, z: 0 };

function cameraFrame(target: CameraTarget): CameraFrame {
  const normalised = normaliseCameraTarget(target);
  const surface = unitVector(normalised.centre);

  let north = normalise(add(WORLD_UP, scale(surface, -dot(WORLD_UP, surface))));
  if (Math.hypot(north.x, north.y, north.z) < 1e-6) {
    north = normalise(cross(surface, { x: 0, y: 0, z: 1 }));
  }
  const elevation = toRadians(normalised.elevationDeg);
  const azimuth = toRadians(normalised.azimuthDeg);
  const baseOffset = add(scale(surface, Math.cos(elevation)), scale(north, Math.sin(elevation)));
  const offset = add(
    scale(baseOffset, Math.cos(azimuth)),
    scale(cross(surface, baseOffset), Math.sin(azimuth)),
  );

  const altitudeRadii = normalised.distanceM / EARTH_RADIUS_M;
  const position = add(surface, scale(offset, altitudeRadii));
  const forward = normalise(add(surface, scale(position, -1)));
  let right = cross(forward, WORLD_UP);
  if (Math.hypot(right.x, right.y, right.z) < 1e-6) {
    right = cross(forward, { x: 0, y: 0, z: 1 });
  }
  right = normalise(right);

  return { position, forward, right, up: normalise(cross(right, forward)) };
}

/** Camera position in earth radii, matching the picking frame. */
export function cameraPositionFor(target: CameraTarget): Vector3 {
  return cameraFrame(target).position;
}

/** Surface point the camera looks at, in unit-sphere coordinates. */
export function cameraLookAtFor(target: CameraTarget): Vector3 {
  return unitVector(normaliseCameraTarget(target).centre);
}

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
  readonly visible: boolean;
}

export const DEFAULT_FIELD_OF_VIEW_DEG = 45;

/** Project a surface coordinate to CSS pixels, with back-face culling. */
export function projectToScreen(
  point: LngLat,
  target: CameraTarget,
  width: number,
  height: number,
  fieldOfViewDeg = DEFAULT_FIELD_OF_VIEW_DEG,
): ScreenPoint {
  const frame = cameraFrame(target);
  const world = unitVector(point);
  const visibleFromCamera = dot(world, frame.position) >= 1;
  const relative = add(world, scale(frame.position, -1));
  const depth = dot(relative, frame.forward);
  if (depth <= 0 || !visibleFromCamera) {
    return { x: Number.NaN, y: Number.NaN, visible: false };
  }
  const halfFov = Math.tan(toRadians(fieldOfViewDeg) / 2);
  const aspect = width / Math.max(1, height);
  const cameraX = dot(relative, frame.right);
  const cameraY = dot(relative, frame.up);
  const ndcX = cameraX / depth / (halfFov * aspect);
  const ndcY = cameraY / depth / halfFov;
  return {
    x: (ndcX + 1) * 0.5 * width,
    y: (1 - ndcY) * 0.5 * height,
    visible: true,
  };
}

export interface RaySphereHit {
  readonly point: Vector3;
}

/** Nearest positive ray–unit-sphere intersection, or null for a tap in space. */
export function raySphereIntersection(origin: Vector3, direction: Vector3): RaySphereHit | null {
  const a = dot(direction, direction);
  if (a === 0) {
    return null;
  }
  const b = 2 * dot(origin, direction);
  const c = dot(origin, origin) - 1;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return null;
  }
  const root = Math.sqrt(discriminant);
  const near = (-b - root) / (2 * a);
  const far = (-b + root) / (2 * a);
  const t = near > 0 ? near : far > 0 ? far : null;
  if (t === null) {
    return null;
  }
  return { point: add(origin, scale(direction, t)) };
}

/** Ray through a CSS-pixel point on a globe-mode canvas. */
export function globeRayFromScreen(
  target: CameraTarget,
  width: number,
  height: number,
  x: number,
  y: number,
  fieldOfViewDeg = DEFAULT_FIELD_OF_VIEW_DEG,
): { readonly origin: Vector3; readonly direction: Vector3 } {
  const frame = cameraFrame(target);
  const halfFov = Math.tan(toRadians(fieldOfViewDeg) / 2);
  const aspect = width / Math.max(1, height);
  const ndcX = (x / Math.max(1, width)) * 2 - 1;
  const ndcY = 1 - (y / Math.max(1, height)) * 2;
  const direction = normalise(
    add(
      add(scale(frame.right, ndcX * halfFov * aspect), scale(frame.up, ndcY * halfFov)),
      frame.forward,
    ),
  );
  return { origin: frame.position, direction };
}

/** Globe-mode tap: ray–sphere intersection; a tap in space returns null. */
export function globeScreenToLngLat(
  target: CameraTarget,
  width: number,
  height: number,
  x: number,
  y: number,
  fieldOfViewDeg = DEFAULT_FIELD_OF_VIEW_DEG,
): LngLat | null {
  const ray = globeRayFromScreen(target, width, height, x, y, fieldOfViewDeg);
  const hit = raySphereIntersection(ray.origin, ray.direction);
  return hit === null ? null : pointFromUnit(hit.point);
}
