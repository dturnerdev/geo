import { err, ok, type Result } from '@geo/domain';
import {
  createRegionChunkId,
  detailMeshSchema,
  type DetailLevel,
  type DetailError,
  type DetailMesh,
  type DetailSource,
  type GeometryChunk,
  type GeometryPack,
  type RegionChunkId,
} from './geometry.ts';

// L0 and L1 are whole-map chunks, but the FE09 `DetailSource` signature always
// takes a region. This non-learner-visible sentinel stands in for those levels;
// only L2 looks it up.
export const WHOLE_MAP_REGION: RegionChunkId = createRegionChunkId('world');

const DETAIL_LEVELS: readonly DetailLevel[] = ['L0', 'L1', 'L2'];

function highestLevel(geometry: GeometryPack): DetailLevel {
  if (geometry.regionChunks.length > 0) {
    return 'L2';
  }
  if (geometry.chunks.some((chunk) => chunk.level === 'L1')) {
    return 'L1';
  }
  return 'L0';
}

function wholeMapChunk(geometry: GeometryPack, level: DetailLevel): GeometryChunk | null {
  return geometry.chunks.find((chunk) => chunk.level === level) ?? null;
}

function regionChunk(geometry: GeometryPack, region: RegionChunkId): GeometryChunk | null {
  return geometry.regionChunks.find((chunk) => chunk.id === region)?.geometry ?? null;
}

/** Validate the mesh a source hands back across its boundary (07 §7 rule 3). */
export function detailMeshFromChunk(chunk: GeometryChunk): Result<DetailMesh, DetailError> {
  const parsed = detailMeshSchema.safeParse(chunk.mesh);
  if (!parsed.success) {
    return err({ kind: 'invalid' });
  }
  const { spherePositions, flatPositions, indices, featureSlots } = parsed.data;
  if (
    spherePositions.length % 3 !== 0 ||
    flatPositions.length % 3 !== 0 ||
    spherePositions.length !== flatPositions.length
  ) {
    return err({ kind: 'invalid' });
  }
  const vertexCount = spherePositions.length / 3;
  if (
    featureSlots.length !== vertexCount ||
    indices.length % 3 !== 0 ||
    indices.some((index) => index < 0 || index >= vertexCount)
  ) {
    return err({ kind: 'invalid' });
  }
  return ok(parsed.data);
}

/**
 * The MVP detail source: chunks bundled with the app or already cached by the
 * web service worker (FE09 behaviour 4 and 6, 04 §8.2). It never requests a
 * network host itself; app-shell replaces the geometry snapshot after a pack
 * is applied at a pause.
 */
export class BuiltInDetailSource implements DetailSource {
  readonly maxLevel: DetailLevel;

  private readonly geometry: GeometryPack;
  private readonly wholeMapRegion: RegionChunkId;

  constructor(geometry: GeometryPack, wholeMapRegion: RegionChunkId = WHOLE_MAP_REGION) {
    this.geometry = geometry;
    this.wholeMapRegion = wholeMapRegion;
    this.maxLevel = highestLevel(geometry);
  }

  isAvailable(level: DetailLevel, region: RegionChunkId): boolean {
    if (level === 'L0' || level === 'L1') {
      return wholeMapChunk(this.geometry, level) !== null;
    }
    return region === this.wholeMapRegion ? false : regionChunk(this.geometry, region) !== null;
  }

  load(level: DetailLevel, region: RegionChunkId): Promise<Result<DetailMesh, DetailError>> {
    const chunk =
      level === 'L2' ? regionChunk(this.geometry, region) : wholeMapChunk(this.geometry, level);
    if (chunk === null) {
      return Promise.resolve(err({ kind: 'not-cached' }));
    }
    return Promise.resolve(detailMeshFromChunk(chunk));
  }
}

/**
 * The best level that can be shown without a request: asked for L2 offline,
 * keep L1 (then L0) on screen instead (FE09 edge cases, 04 §8.2).
 */
export function bestAvailableDetailLevel(
  source: DetailSource,
  desired: DetailLevel,
  region: RegionChunkId,
): DetailLevel | null {
  const desiredIndex = DETAIL_LEVELS.indexOf(desired);
  for (let index = desiredIndex; index >= 0; index -= 1) {
    const level = DETAIL_LEVELS[index];
    if (level !== undefined && source.isAvailable(level, region)) {
      return level;
    }
  }
  return null;
}
