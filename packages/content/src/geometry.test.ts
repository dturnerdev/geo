import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  createLngLat,
  createRegionChunkId,
  lngLatSchema,
  type DetailLevel,
  type FeatureSlot,
  type FeatureSlotEntry,
  type GeometryChunk,
  type GeometryPack,
  type LngLat,
  type TapZone,
} from './geometry.ts';
import {
  geometryIssuesAsStrings,
  parseGeometryPack,
  validateGeometryPack,
} from './geometry-pack.ts';
import { mergePackParts, parsePackPart, parsePackPayload } from './pack-schema.ts';
import { canonicalJson } from './canonical-json.ts';

interface FeatureSpec {
  readonly entry: FeatureSlotEntry;
  readonly offset: number;
}

const FRA: FeatureSlotEntry = {
  slot: 0 as FeatureSlotEntry['slot'],
  featureId: 'ne_110m.france',
  item: 'country.fra',
};
const DEU: FeatureSlotEntry = {
  slot: 1 as FeatureSlotEntry['slot'],
  featureId: 'ne_110m.germany',
  item: 'country.deu',
};

const SQUARE: readonly LngLat[] = [
  createLngLat(0, 0),
  createLngLat(10, 0),
  createLngLat(10, 10),
  createLngLat(0, 10),
];

const GERMAN_SQUARE: readonly LngLat[] = [
  createLngLat(20, 0),
  createLngLat(30, 0),
  createLngLat(30, 10),
  createLngLat(20, 10),
];

function makeMesh(features: readonly FeatureSpec[]): GeometryChunk['mesh'] {
  const spherePositions: number[] = [];
  const flatPositions: number[] = [];
  const indices: number[] = [];
  const featureSlots: FeatureSlot[] = [];

  for (const feature of features) {
    const offset = spherePositions.length / 3;
    for (let vertex = 0; vertex < 4; vertex += 1) {
      spherePositions.push(feature.offset, vertex, 0);
      flatPositions.push(feature.offset + 0.5, vertex, 0);
    }
    indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
    featureSlots.push(
      feature.entry.slot,
      feature.entry.slot,
      feature.entry.slot,
      feature.entry.slot,
    );
  }

  return { spherePositions, flatPositions, indices, featureSlots };
}

const TAP_ZONES: readonly TapZone[] = [
  { item: 'country.fra', rings: [SQUARE] },
  { item: 'country.deu', rings: [GERMAN_SQUARE] },
];

function makeChunk(level: DetailLevel, region: GeometryChunk['region']): GeometryChunk {
  const features: readonly FeatureSpec[] = [
    { entry: FRA, offset: 0 },
    { entry: DEU, offset: 10 },
  ];
  return {
    level,
    region,
    features: [FRA, DEU],
    mesh: makeMesh(features),
    outlines: [
      {
        id: 'border.fra-deu',
        style: 'agreed',
        points: [createLngLat(10, 0), createLngLat(10, 10)],
      },
    ],
    tapZones: TAP_ZONES,
    labelAnchors: [
      { item: 'country.fra', at: createLngLat(5, 5) },
      { item: 'country.deu', at: createLngLat(25, 5) },
    ],
  };
}

function validPack(): GeometryPack {
  const region = createRegionChunkId('europe-west');
  return {
    featureSlotTable: { entries: [FRA, DEU] },
    chunks: [makeChunk('L0', null), makeChunk('L1', null)],
    regionChunks: [
      {
        id: region,
        level: 'L2',
        geometry: makeChunk('L2', region),
      },
    ],
  };
}

function clonePack(pack: GeometryPack = validPack()): DeepMutable<GeometryPack> {
  return JSON.parse(JSON.stringify(pack)) as DeepMutable<GeometryPack>;
}

type DeepMutable<T> = T extends string | number | boolean | null | undefined
  ? T
  : T extends readonly (infer U)[]
    ? DeepMutable<U>[]
    : T extends object
      ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
      : T;

function issuesOf(pack: GeometryPack): readonly string[] {
  return geometryIssuesAsStrings(validateGeometryPack(pack));
}

function mutableChunk(pack: DeepMutable<GeometryPack>, index: number): DeepMutable<GeometryChunk> {
  const chunk = pack.chunks[index];
  if (chunk === undefined) {
    throw new Error('fixture chunk missing');
  }
  return chunk;
}

function pointInRing(point: LngLat, ring: readonly LngLat[]): boolean {
  let inside = false;
  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index, index += 1
  ) {
    const current = ring[index];
    const before = ring[previous];
    if (current === undefined || before === undefined) {
      continue;
    }
    const intersects =
      current.lat > point.lat !== before.lat > point.lat &&
      point.lng <
        ((before.lng - current.lng) * (point.lat - current.lat)) / (before.lat - current.lat) +
          current.lng;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function tapResult(tapZones: readonly TapZone[], point: LngLat): string | null {
  for (const zone of tapZones) {
    if (zone.rings.some((ring) => pointInRing(point, ring))) {
      return zone.item;
    }
  }
  return null;
}

function levelChunks(pack: GeometryPack): readonly GeometryChunk[] {
  return [...pack.chunks, ...pack.regionChunks.map((region) => region.geometry)];
}

describe('FE09 geometry pack contracts', () => {
  it('AC-09.5 grading the same tap gives the same result at L0, L1 and L2', () => {
    const pack = validPack();
    const levels = levelChunks(pack);
    const seed = 20_261_119;

    fc.assert(
      fc.property(
        fc.double({ min: -40, max: 50, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -20, max: 30, noNaN: true, noDefaultInfinity: true }),
        (lng, lat) => {
          const point = createLngLat(Number(lng.toFixed(6)), Number(lat.toFixed(6)));
          const results = levels.map((chunk) => tapResult(chunk.tapZones, point));
          return results.every((result) => result === results[0]);
        },
      ),
      { seed, numRuns: 10_000 },
    );
  });

  it('accepts the authored geometry records and keeps L0–L2 slots stable', () => {
    const parsed = parseGeometryPack(validPack());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(geometryIssuesAsStrings(parsed.error.issues).join('\n'));
    }

    const slotsByFeature = parsed.value.featureSlotTable.entries.map((entry) => ({
      featureId: entry.featureId,
      slot: entry.slot,
    }));
    expect(slotsByFeature).toEqual([
      { featureId: FRA.featureId, slot: FRA.slot },
      { featureId: DEU.featureId, slot: DEU.slot },
    ]);
    for (const chunk of levelChunks(parsed.value)) {
      expect(chunk.features.map((feature) => feature.slot)).toEqual([FRA.slot, DEU.slot]);
    }
  });

  it('rejects duplicate or non-dense feature slots and duplicate feature identities', () => {
    const duplicateSlot = clonePack();
    duplicateSlot.featureSlotTable.entries[1] = {
      ...DEU,
      slot: FRA.slot,
      featureId: 'ne_110m.other',
    };
    expect(issuesOf(duplicateSlot).join('\n')).toContain('duplicate feature slot 0');

    const duplicateFeature = clonePack();
    duplicateFeature.featureSlotTable.entries[1] = {
      ...DEU,
      slot: 2 as FeatureSlotEntry['slot'],
      featureId: FRA.featureId,
    };
    expect(issuesOf(duplicateFeature).join('\n')).toContain('duplicate feature identity');

    const missingSlot = clonePack();
    missingSlot.featureSlotTable.entries[1] = {
      ...DEU,
      slot: 2 as FeatureSlotEntry['slot'],
    };
    expect(issuesOf(missingSlot).join('\n')).toContain('dense zero-based namespace');
  });

  it('rejects mismatched meshes, invalid indices and slots outside a chunk', () => {
    const mismatchedPositions = clonePack();
    const first = mutableChunk(mismatchedPositions, 0);
    first.mesh.flatPositions = first.mesh.flatPositions.slice(0, -1);
    expect(issuesOf(mismatchedPositions).join('\n')).toContain('equal vertex counts');

    const wrongSlotCount = clonePack();
    const second = mutableChunk(wrongSlotCount, 0);
    second.mesh.featureSlots = second.mesh.featureSlots.slice(0, -1);
    expect(issuesOf(wrongSlotCount).join('\n')).toContain('one entry per vertex');

    const badIndex = clonePack();
    const third = mutableChunk(badIndex, 0);
    third.mesh.indices = [0, 1, 999];
    expect(issuesOf(badIndex).join('\n')).toContain('not a vertex in this mesh');

    const missingChunkFeature = clonePack();
    const fourth = mutableChunk(missingChunkFeature, 0);
    fourth.features = [FRA];
    expect(issuesOf(missingChunkFeature).join('\n')).toContain('not in the chunk features');
  });

  it('rejects L2 chunks that are not region records and mismatched region ids', () => {
    const l2InChunks = clonePack();
    l2InChunks.chunks.push(makeChunk('L2', null) as DeepMutable<GeometryChunk>);
    expect(issuesOf(l2InChunks).join('\n')).toContain('L2 geometry must be a RegionChunk');

    const wrongLevel = clonePack();
    const region = wrongLevel.regionChunks[0];
    if (region === undefined) {
      throw new Error('fixture region missing');
    }
    region.geometry.level = 'L1';
    expect(issuesOf(wrongLevel).join('\n')).toContain('region geometry must be L2');

    const wrongId = clonePack();
    const secondRegion = wrongId.regionChunks[0];
    if (secondRegion === undefined) {
      throw new Error('fixture region missing');
    }
    secondRegion.geometry.region = createRegionChunkId('asia-east');
    expect(issuesOf(wrongId).join('\n')).toContain('must carry its own id');
  });

  it('rejects tap zones that differ between detail levels', () => {
    const pack = clonePack();
    const l1 = mutableChunk(pack, 1);
    l1.tapZones = [{ item: 'country.fra', rings: [[...GERMAN_SQUARE]] }];
    expect(issuesOf(pack).join('\n')).toContain('differs from the one at');
  });

  it('rejects coordinates with invalid ranges or more than six decimals', () => {
    expect(() => createLngLat(180.000_001, 0)).toThrow(/lng/u);
    expect(() => createLngLat(0, -90.000_001)).toThrow(/lat/u);
    expect(() => createLngLat(Number.POSITIVE_INFINITY, 0)).toThrow(/finite/u);
    expect(lngLatSchema.safeParse({ lng: 12.1234567, lat: 0 }).success).toBe(false);
    expect(lngLatSchema.safeParse({ lng: 12.123456, lat: 0 }).success).toBe(true);
  });

  it('merges geometry parts deterministically and validates the assembled payload', () => {
    const pack = validPack();
    const tablePart = parsePackPart({
      geometry: {
        featureSlotTable: pack.featureSlotTable,
        regionChunks: pack.regionChunks,
      },
    });
    const chunkPart = parsePackPart({
      geometry: {
        chunks: [...pack.chunks].reverse(),
      },
    });

    const left = mergePackParts([tablePart, chunkPart]);
    const right = mergePackParts([chunkPart, tablePart]);
    expect(canonicalJson(left.geometry)).toBe(canonicalJson(right.geometry));

    const payload = parsePackPayload(left);
    expect(payload.geometry.chunks.map((chunk) => chunk.level)).toEqual(['L0', 'L1']);
    expect(payload.geometry.regionChunks).toHaveLength(1);
  });

  it('pack validation rejects a payload whose geometry breaks a pack invariant', () => {
    const pack = clonePack();
    const first = mutableChunk(pack, 0);
    first.mesh.indices = [0, 1, 42];
    expect(() => parsePackPayload({ geometry: pack })).toThrow(/not a vertex/u);
  });
});
