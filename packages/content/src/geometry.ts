import type { BorderStyle, ItemId, Result } from '@geo/domain';
import { z } from 'zod';

export type { BorderStyle };

// FE09 geometry contracts. These are logical pack records, not a transport
// encoding (04 §6.1). Zod validates every value that crosses the network or
// pipeline boundary (07 §7 rule 3).
export const DETAIL_LEVELS = ['L0', 'L1', 'L2'] as const;
export type DetailLevel = (typeof DETAIL_LEVELS)[number];

// WGS 84 decimal degrees. The brand is not present in GeoJSON I/O (07 §8).
// content may not import engine/geo (07 §4), so this is the same structural
// brand as FE06's coordinate type.
export type LngLat = Readonly<{ lng: number; lat: number }> & {
  readonly __brand: 'LngLat';
};

export type FeatureSlot = number & { readonly __brand: 'FeatureSlot' };
export type RegionChunkId = string & { readonly __brand: 'RegionChunkId' };

export interface BorderLine {
  readonly id: string;
  readonly style: BorderStyle;
  readonly points: readonly LngLat[];
}

export interface FeatureSlotEntry {
  readonly slot: FeatureSlot;
  readonly featureId: string;
  readonly item: ItemId | null;
}

export interface FeatureSlotTable {
  readonly entries: readonly FeatureSlotEntry[];
}

export interface TapZone {
  readonly item: ItemId;
  readonly rings: readonly (readonly LngLat[])[];
}

export interface LabelAnchor {
  readonly item: ItemId;
  readonly at: LngLat;
}

export interface DetailMesh {
  readonly spherePositions: readonly number[];
  readonly flatPositions: readonly number[];
  readonly indices: readonly number[];
  readonly featureSlots: readonly FeatureSlot[];
}

export interface GeometryChunk {
  readonly level: DetailLevel;
  readonly region: RegionChunkId | null;
  readonly features: readonly FeatureSlotEntry[];
  readonly mesh: DetailMesh;
  readonly outlines: readonly BorderLine[];
  readonly tapZones: readonly TapZone[];
  readonly labelAnchors: readonly LabelAnchor[];
}

export interface RegionChunk {
  readonly id: RegionChunkId;
  readonly level: 'L2';
  readonly geometry: GeometryChunk;
}

export type DetailError = { kind: 'not-cached' } | { kind: 'invalid' };

export interface DetailSource {
  readonly maxLevel: DetailLevel;
  isAvailable(level: DetailLevel, region: RegionChunkId): boolean;
  load(level: DetailLevel, region: RegionChunkId): Promise<Result<DetailMesh, DetailError>>;
}

// One pack-wide slot namespace shared by L0–L2 and every L2 region chunk.
export interface GeometryPack {
  readonly featureSlotTable: FeatureSlotTable;
  readonly chunks: readonly GeometryChunk[];
  readonly regionChunks: readonly RegionChunk[];
}

export const EMPTY_FEATURE_SLOT_TABLE: FeatureSlotTable = { entries: [] };

export const EMPTY_GEOMETRY_PACK: GeometryPack = {
  featureSlotTable: EMPTY_FEATURE_SLOT_TABLE,
  chunks: [],
  regionChunks: [],
};

const MAX_COORDINATE_DECIMALS = 6;
const DECIMAL_TOLERANCE = 1e-6;

function hasAtMostSixDecimals(value: number): boolean {
  const scaled = value * 10 ** MAX_COORDINATE_DECIMALS;
  return Math.abs(scaled - Math.round(scaled)) <= DECIMAL_TOLERANCE;
}

export function lngLatIssues(lng: number, lat: number): readonly string[] {
  const issues: string[] = [];
  if (!Number.isFinite(lng)) {
    issues.push('lng must be finite');
  } else if (lng < -180 || lng > 180) {
    issues.push('lng must be in [-180, 180]');
  } else if (!hasAtMostSixDecimals(lng)) {
    issues.push('lng must have at most six decimal places');
  }
  if (!Number.isFinite(lat)) {
    issues.push('lat must be finite');
  } else if (lat < -90 || lat > 90) {
    issues.push('lat must be in [-90, 90]');
  } else if (!hasAtMostSixDecimals(lat)) {
    issues.push('lat must have at most six decimal places');
  }
  return issues;
}

export function createLngLat(lng: number, lat: number): LngLat {
  const issues = lngLatIssues(lng, lat);
  if (issues.length > 0) {
    throw new TypeError(`invalid LngLat: ${issues.join('; ')}`);
  }
  // Normalise negative zero so canonical JSON is stable.
  return { lng: lng === 0 ? 0 : lng, lat: lat === 0 ? 0 : lat } as LngLat;
}

export function createFeatureSlot(value: number): FeatureSlot {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError('FeatureSlot must be a non-negative integer');
  }
  return value as FeatureSlot;
}

export function createRegionChunkId(value: string): RegionChunkId {
  if (value.length === 0) {
    throw new TypeError('RegionChunkId must not be empty');
  }
  return value as RegionChunkId;
}

export const lngLatSchema = z
  .object({ lng: z.number(), lat: z.number() })
  .strict()
  .transform((value, context): LngLat => {
    const issues = lngLatIssues(value.lng, value.lat);
    if (issues.length > 0) {
      for (const message of issues) {
        context.addIssue({ code: 'custom', message });
      }
      return { lng: value.lng, lat: value.lat } as LngLat;
    }
    return createLngLat(value.lng, value.lat);
  });

export const detailLevelSchema = z.enum(DETAIL_LEVELS);

export const featureSlotSchema = z
  .number()
  .int()
  .nonnegative()
  .transform((value): FeatureSlot => value as FeatureSlot);

export const regionChunkIdSchema = z
  .string()
  .min(1)
  .transform((value): RegionChunkId => value as RegionChunkId);

export const featureSlotEntrySchema = z
  .object({
    slot: featureSlotSchema,
    featureId: z.string().min(1),
    item: z.string().min(1).nullable(),
  })
  .strict();

export const featureSlotTableSchema = z
  .object({
    entries: z.array(featureSlotEntrySchema),
  })
  .strict();

export const borderLineSchema = z
  .object({
    id: z.string().min(1),
    style: z.enum(['agreed', 'disputed', 'claim']),
    points: z.array(lngLatSchema).min(2),
  })
  .strict();

export const tapZoneSchema = z
  .object({
    item: z.string().min(1),
    rings: z.array(z.array(lngLatSchema).min(3)).min(1),
  })
  .strict();

export const labelAnchorSchema = z
  .object({
    item: z.string().min(1),
    at: lngLatSchema,
  })
  .strict();

export const detailMeshSchema = z
  .object({
    spherePositions: z.array(z.number()),
    flatPositions: z.array(z.number()),
    indices: z.array(z.number()),
    featureSlots: z.array(featureSlotSchema),
  })
  .strict();

export const geometryChunkSchema = z
  .object({
    level: detailLevelSchema,
    region: regionChunkIdSchema.nullable(),
    features: z.array(featureSlotEntrySchema),
    mesh: detailMeshSchema,
    outlines: z.array(borderLineSchema),
    tapZones: z.array(tapZoneSchema),
    labelAnchors: z.array(labelAnchorSchema),
  })
  .strict();

export const regionChunkSchema = z
  .object({
    id: regionChunkIdSchema,
    level: z.literal('L2'),
    geometry: geometryChunkSchema,
  })
  .strict();

export const geometryPackSchema = z
  .object({
    featureSlotTable: featureSlotTableSchema,
    chunks: z.array(geometryChunkSchema),
    regionChunks: z.array(regionChunkSchema),
  })
  .strict();

// Chunks may carry one part of the pack-wide slot table and any subset of
// geometry records. Merging is deterministic and independent of chunk order.
export const geometryPackPartSchema = z
  .object({
    featureSlotTable: featureSlotTableSchema.optional(),
    chunks: z.array(geometryChunkSchema).optional(),
    regionChunks: z.array(regionChunkSchema).optional(),
  })
  .strict();

export type GeometryPackPart = z.infer<typeof geometryPackPartSchema>;
