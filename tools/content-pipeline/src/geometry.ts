import type { ItemId } from '../../../packages/domain/src/ids.ts';
import {
  createFeatureSlot,
  type BorderLine,
  type DetailLevel,
  type FeatureSlot,
  type FeatureSlotEntry,
  type FeatureSlotTable,
  type GeometryChunk,
  type GeometryPack,
  type LabelAnchor,
  type LngLat,
  type RegionChunk,
  type RegionChunkId,
  type TapZone,
} from '../../../packages/content/src/geometry.ts';
import {
  validateGeometryPack,
  type GeometryIssue,
} from '../../../packages/content/src/geometry-pack.ts';

// M1 setup task: turn pipeline features into immutable geometry records. The
// source adapter owns projection and shape simplification; this module owns
// stable slots, chunk assembly and the pack invariants (04 §6.1).
export interface GeometrySourceFeature {
  readonly featureId: string;
  readonly item: ItemId | null;
  readonly spherePositions: readonly number[];
  readonly flatPositions: readonly number[];
  readonly indices: readonly number[];
}

export interface GeometrySourceLevel {
  readonly level: DetailLevel;
  readonly region: RegionChunkId | null;
  readonly features: readonly GeometrySourceFeature[];
  readonly outlines: readonly BorderLine[];
  readonly tapZones: readonly TapZone[];
  readonly labelAnchors: readonly LabelAnchor[];
}

export interface GeometrySource {
  readonly levels: readonly GeometrySourceLevel[];
  readonly previousFeatureSlotTable?: FeatureSlotTable;
}

export interface GeometryPipelineError {
  readonly kind: 'invalid-geometry';
  readonly issues: readonly GeometryIssue[];
}

export type GeometryPipelineResult =
  | { readonly ok: true; readonly geometry: GeometryPack }
  | { readonly ok: false; readonly error: GeometryPipelineError };

export interface FeatureIdentity {
  readonly featureId: string;
  readonly item: ItemId | null;
}
function uniqueIdentities(levels: readonly GeometrySourceLevel[]): readonly FeatureIdentity[] {
  const identities = new Map<string, ItemId | null>();
  for (const level of levels) {
    for (const feature of level.features) {
      const existing = identities.get(feature.featureId);
      if (existing !== undefined && existing !== feature.item) {
        throw new TypeError(
          `feature "${feature.featureId}" changed its item between detail levels`,
        );
      }
      if (!identities.has(feature.featureId)) {
        identities.set(feature.featureId, feature.item);
      }
    }
  }
  return [...identities].map(([featureId, item]) => ({ featureId, item }));
}

// Slots are assigned once to a feature identity. Existing slots - including
// retired entries whose item is null - are never renumbered or reused.
export function assignFeatureSlots(
  identities: readonly FeatureIdentity[],
  previous: FeatureSlotTable = { entries: [] },
): FeatureSlotTable {
  const entries = previous.entries.map((entry) => ({ ...entry }));
  const byFeatureId = new Map(entries.map((entry) => [entry.featureId, entry] as const));
  let nextSlot = entries.length === 0 ? 0 : Math.max(...entries.map((entry) => entry.slot)) + 1;

  for (const identity of identities) {
    const existing = byFeatureId.get(identity.featureId);
    if (existing !== undefined) {
      if (existing.item !== identity.item) {
        throw new TypeError(
          `feature "${identity.featureId}" already has item ${String(existing.item)}`,
        );
      }
      continue;
    }
    const entry: FeatureSlotEntry = {
      slot: createFeatureSlot(nextSlot),
      featureId: identity.featureId,
      item: identity.item,
    };
    nextSlot += 1;
    entries.push(entry);
    byFeatureId.set(entry.featureId, entry);
  }

  return { entries: entries.sort((left, right) => left.slot - right.slot) };
}

function buildChunk(level: GeometrySourceLevel, table: FeatureSlotTable): GeometryChunk {
  const slotByFeatureId = new Map(
    table.entries.map((entry) => [entry.featureId, entry.slot] as const),
  );
  const spherePositions: number[] = [];
  const flatPositions: number[] = [];
  const indices: number[] = [];
  const featureSlots: FeatureSlot[] = [];
  const features: FeatureSlotEntry[] = [];

  for (const feature of level.features) {
    const slot = slotByFeatureId.get(feature.featureId);
    if (slot === undefined) {
      throw new TypeError(`feature "${feature.featureId}" has no slot`);
    }
    const vertexOffset = spherePositions.length / 3;
    const vertexCount = feature.spherePositions.length / 3;
    spherePositions.push(...feature.spherePositions);
    flatPositions.push(...feature.flatPositions);
    for (const index of feature.indices) {
      indices.push(index + vertexOffset);
    }
    for (let vertex = 0; vertex < vertexCount; vertex += 1) {
      featureSlots.push(slot);
    }
    if (vertexCount > 0) {
      features.push({
        slot,
        featureId: feature.featureId,
        item: feature.item,
      });
    }
  }

  return {
    level: level.level,
    region: level.region,
    features: features.sort((left, right) => left.slot - right.slot),
    mesh: { spherePositions, flatPositions, indices, featureSlots },
    outlines: level.outlines,
    tapZones: level.tapZones,
    labelAnchors: level.labelAnchors,
  };
}

export function buildGeometryPack(source: GeometrySource): GeometryPipelineResult {
  let table: FeatureSlotTable;
  try {
    table = assignFeatureSlots(uniqueIdentities(source.levels), source.previousFeatureSlotTable);
  } catch (error) {
    return {
      ok: false,
      error: {
        kind: 'invalid-geometry',
        issues: [{ path: [], message: error instanceof Error ? error.message : String(error) }],
      },
    };
  }

  const chunks: GeometryChunk[] = [];
  const regionChunks: RegionChunk[] = [];

  for (const level of source.levels) {
    if (level.level === 'L2') {
      if (level.region === null) {
        return {
          ok: false,
          error: {
            kind: 'invalid-geometry',
            issues: [{ path: ['level'], message: 'L2 geometry needs a region chunk id' }],
          },
        };
      }
      regionChunks.push({
        id: level.region,
        level: 'L2',
        geometry: buildChunk(level, table),
      });
    } else {
      chunks.push(buildChunk(level, table));
    }
  }

  const geometry: GeometryPack = {
    featureSlotTable: table,
    chunks,
    regionChunks,
  };
  const issues = validateGeometryPack(geometry);
  if (issues.length > 0) {
    return { ok: false, error: { kind: 'invalid-geometry', issues } };
  }
  return { ok: true, geometry };
}

export interface GeometryFixtureFeature extends FeatureIdentity {
  readonly lngLat: readonly LngLat[];
}

// Test and source-adapter helper: a flat ring becomes a small triangle fan so
// the pipeline tests exercise real vertex, index and slot alignment without a
// projection dependency.
export function triangleFanFeature(
  feature: GeometryFixtureFeature,
  spherePosition: (point: LngLat) => readonly [number, number, number],
  flatPosition: (point: LngLat) => readonly [number, number, number],
): GeometrySourceFeature {
  const first = feature.lngLat[0];
  if (first === undefined) {
    return { ...feature, spherePositions: [], flatPositions: [], indices: [] };
  }
  const spherePositions: number[] = [];
  const flatPositions: number[] = [];
  for (const point of feature.lngLat) {
    spherePositions.push(...spherePosition(point));
    flatPositions.push(...flatPosition(point));
  }
  const indices: number[] = [];
  for (let vertex = 1; vertex + 1 < feature.lngLat.length; vertex += 1) {
    indices.push(0, vertex, vertex + 1);
  }
  return { ...feature, spherePositions, flatPositions, indices };
}
