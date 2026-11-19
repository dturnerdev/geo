import { EARTH_RADIUS_M, equalEarthRaw, normaliseLngLat } from '../../engine/src/geo/index.ts';
import type { CelestialBody, CelestialBodyMesh } from './types.ts';

const DEFAULT_LNG_SEGMENTS = 72;
const DEFAULT_LAT_SEGMENTS = 36;

function unitPoint(lng: number, lat: number): { x: number; y: number; z: number } {
  const phi = (lat * Math.PI) / 180;
  const lambda = (lng * Math.PI) / 180;
  return {
    x: Math.cos(phi) * Math.cos(lambda),
    y: Math.sin(phi),
    z: Math.cos(phi) * Math.sin(lambda),
  };
}

/**
 * Build the joined-sphere and flat-cut vertex arrays. Both positions share the
 * same topology and slot attribute so the vertex shader can blend them for the
 * morph (D153, ADR-0002 §7).
 */
export function buildCutMesh(
  radiusM: number,
  lngSegments = DEFAULT_LNG_SEGMENTS,
  latSegments = DEFAULT_LAT_SEGMENTS,
): CelestialBodyMesh {
  const columns = lngSegments + 1;
  const rows = latSegments + 1;
  const vertexCount = columns * rows;
  const positions = new Float32Array(vertexCount * 3);
  const flatPositions = new Float32Array(vertexCount * 3);
  const featureSlots = new Uint32Array(vertexCount);
  const indices = new Uint32Array(lngSegments * latSegments * 6);

  let vertex = 0;
  for (let row = 0; row < rows; row += 1) {
    const lat = -90 + (180 * row) / latSegments;
    for (let column = 0; column < columns; column += 1) {
      const lng = -180 + (360 * column) / lngSegments;
      const sphere = unitPoint(lng, lat);
      positions[vertex * 3] = sphere.x * radiusM;
      positions[vertex * 3 + 1] = sphere.y * radiusM;
      positions[vertex * 3 + 2] = sphere.z * radiusM;

      const flat = equalEarthRaw(normaliseLngLat(lng, lat));
      flatPositions[vertex * 3] = (flat?.x ?? 0) * radiusM;
      flatPositions[vertex * 3 + 1] = -(flat?.y ?? 0) * radiusM;
      flatPositions[vertex * 3 + 2] = 0;

      featureSlots[vertex] = 0;
      vertex += 1;
    }
  }

  let index = 0;
  for (let row = 0; row < latSegments; row += 1) {
    for (let column = 0; column < lngSegments; column += 1) {
      const topLeft = row * columns + column;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + columns;
      const bottomRight = bottomLeft + 1;

      indices[index] = topLeft;
      indices[index + 1] = bottomLeft;
      indices[index + 2] = topRight;
      indices[index + 3] = topRight;
      indices[index + 4] = bottomLeft;
      indices[index + 5] = bottomRight;
      index += 6;
    }
  }

  return {
    kind: 'sphere',
    positions,
    flatPositions,
    featureSlots,
    indices,
  };
}

/** Earth is the only MVP body; the controller never assumes that (D40). */
export function createEarthBody(radiusM = EARTH_RADIUS_M): CelestialBody {
  return {
    id: 'earth',
    radiusM,
    meshes: [buildCutMesh(radiusM)],
  };
}
