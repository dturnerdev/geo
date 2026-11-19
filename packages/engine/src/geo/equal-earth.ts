import type { GeoProjection } from 'd3-geo';
import { geoEqualEarth } from 'd3-geo';
import type { LngLat } from './lng-lat.ts';
import { normaliseLngLat } from './lng-lat.ts';

// Equal Earth, centred on 0°, no horizontal wrapping (D153).
export interface EqualEarthPoint {
  readonly x: number;
  readonly y: number;
}

export interface EqualEarthView {
  readonly width: number;
  readonly height: number;
  /** Project a coordinate into CSS-pixel space; null outside the map sphere. */
  project(point: LngLat): EqualEarthPoint | null;
  /** Invert a CSS-pixel point; null outside the drawn flat map. */
  invert(x: number, y: number): LngLat | null;
  /** True when a pixel is inside the projected sphere. */
  contains(x: number, y: number): boolean;
}

interface RawBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

const SAMPLE_LNG_STEP = 2;
const SAMPLE_LAT_STEP = 2;

function rawProjection(): GeoProjection {
  return geoEqualEarth().center([0, 0]).rotate([0, 0, 0]).scale(1).translate([0, 0]);
}

function rawBounds(projection: GeoProjection): RawBounds {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let lng = -180; lng <= 180; lng += SAMPLE_LNG_STEP) {
    for (let lat = -90; lat <= 90; lat += SAMPLE_LAT_STEP) {
      const point = projection([lng, lat]);
      if (point === null) {
        continue;
      }
      minX = Math.min(minX, point[0]);
      maxX = Math.max(maxX, point[0]);
      minY = Math.min(minY, point[1]);
      maxY = Math.max(maxY, point[1]);
    }
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Fit Equal Earth into a viewport while preserving its aspect ratio. The map
 * is centred; no horizontal wrapping is applied (D153).
 */
export function createEqualEarthView(width: number, height: number, padding = 0): EqualEarthView {
  const projection = rawProjection();
  const bounds = rawBounds(projection);
  const safeWidth = Math.max(1, width - padding * 2);
  const safeHeight = Math.max(1, height - padding * 2);
  const rawWidth = bounds.maxX - bounds.minX;
  const rawHeight = bounds.maxY - bounds.minY;
  const scale = Math.min(safeWidth / rawWidth, safeHeight / rawHeight);
  const mapWidth = rawWidth * scale;
  const mapHeight = rawHeight * scale;
  const offsetX = (width - mapWidth) / 2;
  const offsetY = (height - mapHeight) / 2;

  const rawToScreen = (rawX: number, rawY: number): EqualEarthPoint => ({
    x: offsetX + (rawX - bounds.minX) * scale,
    y: offsetY + (rawY - bounds.minY) * scale,
  });

  const screenToRaw = (x: number, y: number): readonly [number, number] => [
    (x - offsetX) / scale + bounds.minX,
    (y - offsetY) / scale + bounds.minY,
  ];

  return {
    width,
    height,
    project(point: LngLat): EqualEarthPoint | null {
      const raw = projection([point.lng, point.lat]);
      return raw === null ? null : rawToScreen(raw[0], raw[1]);
    },
    invert(x: number, y: number): LngLat | null {
      if (!projection.invert) {
        return null;
      }
      if (x < offsetX || x > offsetX + mapWidth || y < offsetY || y > offsetY + mapHeight) {
        return null;
      }
      const raw = screenToRaw(x, y);
      const inverted = projection.invert(raw);
      if (inverted === null) {
        return null;
      }
      const [lng, lat] = inverted;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        return null;
      }
      return normaliseLngLat(lng, lat);
    },
    contains(x: number, y: number): boolean {
      return (
        x >= offsetX &&
        x <= offsetX + mapWidth &&
        y >= offsetY &&
        y <= offsetY + mapHeight &&
        projection.invert !== undefined &&
        projection.invert(screenToRaw(x, y)) !== null
      );
    },
  };
}

/** Raw Equal Earth coordinates at unit scale, used for the flat cut mesh. */
export function equalEarthRaw(point: LngLat): EqualEarthPoint | null {
  const projected = rawProjection()([point.lng, point.lat]);
  return projected === null ? null : { x: projected[0], y: projected[1] };
}
