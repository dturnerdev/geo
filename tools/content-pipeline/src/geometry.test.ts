import { describe, expect, it } from 'vitest';
import {
  createLngLat,
  createRegionChunkId,
  createFeatureSlot,
  type FeatureSlotTable,
  type LngLat,
  type TapZone,
} from '../../../packages/content/src/geometry.ts';
import { validateGeometryPack } from '../../../packages/content/src/geometry-pack.ts';
import {
  assignFeatureSlots,
  buildGeometryPack,
  triangleFanFeature,
  type GeometrySource,
  type GeometrySourceLevel,
} from './geometry.ts';

const FRANCE: readonly LngLat[] = [
  createLngLat(0, 0),
  createLngLat(10, 0),
  createLngLat(10, 10),
  createLngLat(0, 10),
];
const GERMANY: readonly LngLat[] = [
  createLngLat(20, 0),
  createLngLat(30, 0),
  createLngLat(30, 10),
  createLngLat(20, 10),
];

const TAP_ZONES: readonly TapZone[] = [
  { item: 'country.fra', rings: [FRANCE] },
  { item: 'country.deu', rings: [GERMANY] },
];

function identity(point: LngLat): readonly [number, number, number] {
  return [point.lng, point.lat, 0];
}

function sourceLevel(level: 'L0' | 'L1' | 'L2'): GeometrySourceLevel {
  const region = level === 'L2' ? createRegionChunkId('europe-west') : null;
  return {
    level,
    region,
    features: [
      triangleFanFeature(
        {
          featureId: 'ne.france',
          item: 'country.fra',
          lngLat: FRANCE,
        },
        identity,
        identity,
      ),
      triangleFanFeature(
        {
          featureId: 'ne.germany',
          item: 'country.deu',
          lngLat: GERMANY,
        },
        identity,
        identity,
      ),
    ],
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

function validSource(previousFeatureSlotTable?: FeatureSlotTable): GeometrySource {
  return {
    levels: [sourceLevel('L0'), sourceLevel('L1'), sourceLevel('L2')],
    ...(previousFeatureSlotTable === undefined ? {} : { previousFeatureSlotTable }),
  };
}

describe('M1 geometry pipeline', () => {
  it('builds L0, L1 and an L2 region from one stable slot namespace', () => {
    const result = buildGeometryPack(validSource());
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(JSON.stringify(result.error.issues));
    }

    expect(result.geometry.chunks.map((chunk) => chunk.level)).toEqual(['L0', 'L1']);
    expect(result.geometry.regionChunks).toHaveLength(1);
    expect(result.geometry.regionChunks[0]?.id).toBe('europe-west');
    expect(result.geometry.regionChunks[0]?.geometry.level).toBe('L2');
    expect(validateGeometryPack(result.geometry)).toEqual([]);

    const slots = result.geometry.featureSlotTable.entries.map((entry) => ({
      featureId: entry.featureId,
      slot: entry.slot,
    }));
    expect(slots).toEqual([
      { featureId: 'ne.france', slot: 0 },
      { featureId: 'ne.germany', slot: 1 },
    ]);
    for (const chunk of [
      ...result.geometry.chunks,
      ...result.geometry.regionChunks.map((region) => region.geometry),
    ]) {
      expect(chunk.features.map((feature) => feature.slot)).toEqual([0, 1]);
    }
  });

  it('is deterministic for the same source', () => {
    const first = buildGeometryPack(validSource());
    const second = buildGeometryPack(validSource());
    expect(first).toEqual(second);
  });

  it('keeps retired slots as null tombstones and appends new identities', () => {
    const previous: FeatureSlotTable = {
      entries: [
        {
          slot: createFeatureSlot(0),
          featureId: 'ne.retired',
          item: null,
        },
      ],
    };
    const result = buildGeometryPack(validSource(previous));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(JSON.stringify(result.error.issues));
    }
    expect(result.geometry.featureSlotTable.entries).toEqual([
      { slot: 0, featureId: 'ne.retired', item: null },
      { slot: 1, featureId: 'ne.france', item: 'country.fra' },
      { slot: 2, featureId: 'ne.germany', item: 'country.deu' },
    ]);
  });

  it('assigns slots in first-seen order regardless of how levels are assembled', () => {
    const identities = [
      { featureId: 'ne.b', item: 'item.b' },
      { featureId: 'ne.a', item: 'item.a' },
    ];
    const first = assignFeatureSlots(identities);
    const second = assignFeatureSlots(identities);
    expect(first).toEqual(second);
    expect(first.entries.map((entry) => entry.featureId)).toEqual(['ne.b', 'ne.a']);

    const withExisting = assignFeatureSlots(
      [
        { featureId: 'ne.b', item: 'item.b' },
        { featureId: 'ne.c', item: 'item.c' },
      ],
      first,
    );
    expect(withExisting.entries.map((entry) => [entry.featureId, entry.slot])).toEqual([
      ['ne.b', 0],
      ['ne.a', 1],
      ['ne.c', 2],
    ]);
  });

  it('rejects a source that breaks slot or mesh invariants', () => {
    const mismatched = validSource();
    const l0 = mismatched.levels[0];
    const firstFeature = l0?.features[0];
    if (l0 === undefined || firstFeature === undefined) {
      throw new Error('fixture missing');
    }
    const broken: GeometrySource = {
      ...mismatched,
      levels: [
        {
          ...l0,
          features: [
            { ...firstFeature, flatPositions: firstFeature.flatPositions.slice(0, -1) },
            ...l0.features.slice(1),
          ],
        },
        ...mismatched.levels.slice(1),
      ],
    };
    const result = buildGeometryPack(broken);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected invalid geometry');
    }
    expect(JSON.stringify(result.error.issues)).toContain('equal vertex counts');
  });

  it('rejects tap zones that differ between levels', () => {
    const source = validSource();
    const l1 = source.levels[1];
    if (l1 === undefined) {
      throw new Error('fixture missing');
    }
    const broken: GeometrySource = {
      ...source,
      levels: [
        source.levels[0] ?? l1,
        { ...l1, tapZones: [{ item: 'country.fra', rings: [GERMANY] }] },
        ...source.levels.slice(2),
      ],
    };
    const result = buildGeometryPack(broken);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected invalid geometry');
    }
    expect(JSON.stringify(result.error.issues)).toContain('differs from the one at');
  });

  it('rejects an L2 level without a region id', () => {
    const source = validSource();
    const l2 = source.levels[2];
    if (l2 === undefined) {
      throw new Error('fixture missing');
    }
    const broken: GeometrySource = {
      ...source,
      levels: [source.levels[0] ?? l2, source.levels[1] ?? l2, { ...l2, region: null }],
    };
    const result = buildGeometryPack(broken);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected invalid geometry');
    }
    expect(result.error.issues[0]?.message).toContain('region chunk id');
  });

  it('rejects a previous slot whose item changed for the same feature identity', () => {
    const previous: FeatureSlotTable = {
      entries: [
        {
          slot: createFeatureSlot(0),
          featureId: 'ne.france',
          item: 'country.old',
        },
      ],
    };
    const result = buildGeometryPack(validSource(previous));
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected invalid geometry');
    }
    expect(result.error.issues[0]?.message).toContain('already has item');
  });
});
