import { describe, expect, it } from 'vitest';
import { detailCacheReferences, isDetailChunkUrl, planDetailCache } from './detail-cache.ts';
import { createFeatureSlot, createLngLat, createRegionChunkId } from './geometry.ts';
import type { GeometryChunk } from './geometry.ts';
import type { PackPart } from './pack-schema.ts';
import { parsePackPart } from './pack-schema.ts';
import { buildPack, createTestSigningKeys } from './test-helpers.ts';
import type { NetworkConditions } from './scheduler.ts';

const SLOT = createFeatureSlot(0);
const EUROPE = createRegionChunkId('europe-west');
const ORIGIN = 'https://app.example';

const ONLINE: NetworkConditions = {
  online: true,
  metered: false,
  dataSaver: false,
  batteryLow: false,
  mobileDataAllowed: true,
};

function chunk(level: 'L0' | 'L1' | 'L2', region: GeometryChunk['region']): GeometryChunk {
  return {
    level,
    region,
    features: [{ slot: SLOT, featureId: 'ne.france', item: 'country.fra' }],
    mesh: {
      spherePositions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      flatPositions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      indices: [0, 1, 2],
      featureSlots: [SLOT, SLOT, SLOT],
    },
    outlines: [],
    tapZones: [
      {
        item: 'country.fra',
        rings: [[createLngLat(0, 0), createLngLat(1, 0), createLngLat(0, 1)]],
      },
    ],
    labelAnchors: [{ item: 'country.fra', at: createLngLat(0.25, 0.25) }],
  };
}

function detailsPack() {
  const signing = createTestSigningKeys();
  const parts: PackPart[] = [
    parsePackPart({
      geometry: {
        featureSlotTable: {
          entries: [{ slot: SLOT, featureId: 'ne.france', item: 'country.fra' }],
        },
        chunks: [chunk('L0', null)],
      },
    }),
    parsePackPart({ geometry: { chunks: [chunk('L1', null)] } }),
    parsePackPart({
      geometry: {
        regionChunks: [{ id: EUROPE, level: 'L2', geometry: chunk('L2', EUROPE) }],
      },
    }),
  ];
  return buildPack({ parts, packVersion: '2026.11.2', signing }).pack;
}

describe('FE09 web detail cache plan', () => {
  it('AC-09.7 with data-saver on, background caching does not start', () => {
    const plan = planDetailCache({
      pack: detailsPack(),
      baseUrl: ORIGIN,
      conditions: { ...ONLINE, dataSaver: true },
      completedRound: true,
    });

    expect(plan.shouldStart).toBe(false);
    expect(plan.reason).toBe('data-saver');
  });

  it('AC-09.6 detail caching requests only same-origin content-addressed chunk URLs', () => {
    const plan = planDetailCache({
      pack: detailsPack(),
      baseUrl: ORIGIN,
      conditions: ONLINE,
      completedRound: true,
    });

    expect(plan.shouldStart).toBe(true);
    expect(plan.references.map((reference) => reference.level)).toEqual(['L1', 'L2']);
    expect(plan.urls).toHaveLength(2);
    for (const url of plan.urls) {
      expect(url.startsWith(`${ORIGIN}/packs/chunks/`)).toBe(true);
      expect(isDetailChunkUrl(url, ORIGIN)).toBe(true);
    }
    expect(isDetailChunkUrl('https://cdn.example/packs/chunks/' + 'a'.repeat(64), ORIGIN)).toBe(
      false,
    );
    expect(isDetailChunkUrl(`${ORIGIN}/packs/chunks/${'a'.repeat(64)}?x=1`, ORIGIN)).toBe(false);
  });

  it('starts only after one completed round and refuses a disallowed network', () => {
    const beforeRound = planDetailCache({
      pack: detailsPack(),
      baseUrl: ORIGIN,
      conditions: ONLINE,
      completedRound: false,
    });
    expect(beforeRound).toMatchObject({ shouldStart: false, reason: 'no-completed-round' });

    const offline = planDetailCache({
      pack: detailsPack(),
      baseUrl: ORIGIN,
      conditions: { ...ONLINE, online: false },
      completedRound: true,
    });
    expect(offline).toMatchObject({ shouldStart: false, reason: 'offline' });

    const metered = planDetailCache({
      pack: detailsPack(),
      baseUrl: ORIGIN,
      conditions: { ...ONLINE, metered: true, mobileDataAllowed: false },
      completedRound: true,
    });
    expect(metered).toMatchObject({ shouldStart: false, reason: 'metered' });
  });

  it('ignores L0 chunks that ship with the first load', () => {
    const references = detailCacheReferences(detailsPack());
    expect(references.map((reference) => reference.level)).toEqual(['L1', 'L2']);
    expect(references[1]?.region).toBe(EUROPE);
  });
});
