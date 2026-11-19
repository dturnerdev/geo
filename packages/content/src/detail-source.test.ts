import { describe, expect, it } from 'vitest';
import {
  BuiltInDetailSource,
  WHOLE_MAP_REGION,
  bestAvailableDetailLevel,
  detailMeshFromChunk,
} from './detail-source.ts';
import {
  createFeatureSlot,
  createLngLat,
  createRegionChunkId,
  type DetailLevel,
  type GeometryChunk,
  type GeometryPack,
  type RegionChunkId,
} from './geometry.ts';

const ITEM = 'country.fra';
const SLOT = createFeatureSlot(0);
const EUROPE = createRegionChunkId('europe-west');

function chunk(level: DetailLevel, region: RegionChunkId | null): GeometryChunk {
  return {
    level,
    region,
    features: [{ slot: SLOT, featureId: 'ne.france', item: ITEM }],
    mesh: {
      spherePositions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      flatPositions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      indices: [0, 1, 2],
      featureSlots: [SLOT, SLOT, SLOT],
    },
    outlines: [],
    tapZones: [
      {
        item: ITEM,
        rings: [[createLngLat(0, 0), createLngLat(1, 0), createLngLat(0, 1)]],
      },
    ],
    labelAnchors: [{ item: ITEM, at: createLngLat(0.25, 0.25) }],
  };
}

function pack(options: { l0?: boolean; l1?: boolean; l2?: boolean } = {}): GeometryPack {
  const chunks: GeometryChunk[] = [];
  if (options.l0 !== false) {
    chunks.push(chunk('L0', null));
  }
  if (options.l1 !== false) {
    chunks.push(chunk('L1', null));
  }
  return {
    featureSlotTable: { entries: [{ slot: SLOT, featureId: 'ne.france', item: ITEM }] },
    chunks,
    regionChunks:
      options.l2 === false ? [] : [{ id: EUROPE, level: 'L2', geometry: chunk('L2', EUROPE) }],
  };
}

describe('FE09 built-in detail source', () => {
  it('bundles L0 and serves L1 and L2 regions from the active pack', async () => {
    const source = new BuiltInDetailSource(pack());
    expect(source.maxLevel).toBe('L2');
    expect(source.isAvailable('L0', WHOLE_MAP_REGION)).toBe(true);
    expect(source.isAvailable('L1', WHOLE_MAP_REGION)).toBe(true);
    expect(source.isAvailable('L2', EUROPE)).toBe(true);
    expect(source.isAvailable('L2', createRegionChunkId('asia-east'))).toBe(false);

    for (const [level, region] of [
      ['L0', WHOLE_MAP_REGION],
      ['L1', WHOLE_MAP_REGION],
      ['L2', EUROPE],
    ] as const) {
      const result = await source.load(level, region);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.featureSlots).toEqual([SLOT, SLOT, SLOT]);
      }
    }
  });

  it('returns not-cached without an error state when a region is absent', async () => {
    const source = new BuiltInDetailSource(pack({ l2: false }));
    expect(source.maxLevel).toBe('L1');
    const result = await source.load('L2', EUROPE);
    expect(result).toEqual({ ok: false, error: { kind: 'not-cached' } });
  });

  it('keeps the best available level when L2 is not cached', () => {
    const source = new BuiltInDetailSource(pack({ l2: false }));
    expect(bestAvailableDetailLevel(source, 'L2', EUROPE)).toBe('L1');
    expect(bestAvailableDetailLevel(source, 'L1', EUROPE)).toBe('L1');

    const l0Only = new BuiltInDetailSource(pack({ l1: false, l2: false }));
    expect(bestAvailableDetailLevel(l0Only, 'L2', EUROPE)).toBe('L0');
  });

  it('rejects a malformed detail mesh as invalid', async () => {
    const geometry = pack();
    const first = geometry.chunks[0];
    if (first === undefined) {
      throw new Error('fixture missing');
    }
    const broken: GeometryChunk = {
      ...first,
      mesh: { ...first.mesh, featureSlots: [] },
    };
    expect(detailMeshFromChunk(broken)).toEqual({ ok: false, error: { kind: 'invalid' } });

    const source = new BuiltInDetailSource({
      ...geometry,
      chunks: [broken, ...geometry.chunks.slice(1)],
    });
    const result = await source.load('L0', WHOLE_MAP_REGION);
    expect(result).toEqual({ ok: false, error: { kind: 'invalid' } });
  });
});
