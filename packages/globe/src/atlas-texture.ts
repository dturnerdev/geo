import type {
  AtlasItemState,
  AtlasLayer,
  AtlasLayerStates,
  AtlasSnapshot,
  FeatureSlot,
} from './types.ts';

// ADR-0002 §2: append-only encoding.
export const ATLAS_STATE_VALUES: Readonly<Record<AtlasItemState, number>> = {
  undiscovered: 0,
  discovered: 1,
  established: 2,
  fading: 3,
  restored: 4,
};

export const ATLAS_LAYER_ORDER: readonly AtlasLayer[] = [
  'country',
  'capital',
  'rivers',
  'relief',
  'regions',
  'biomes',
];

const BITS_PER_LAYER = 4;
const LAYERS_PER_TEXEL = 6;
const MAX_TEXTURE_SIZE = 4_096;

export interface AtlasTextureData {
  readonly data: Uint32Array;
  readonly width: number;
  readonly height: number;
  readonly slotCount: number;
}

function encodeLayers(layers: AtlasLayerStates): number {
  let value = 0;
  for (let index = 0; index < ATLAS_LAYER_ORDER.length && index < LAYERS_PER_TEXEL; index += 1) {
    const layer = ATLAS_LAYER_ORDER[index];
    if (layer === undefined) {
      continue;
    }
    const state = ATLAS_STATE_VALUES[layers[layer]] ?? 0;
    value |= state << (index * BITS_PER_LAYER);
  }
  return value >>> 0;
}

/** CPU-side mirror for the R32UI state texture (ADR-0002 §1 and §5). */
export function encodeAtlasTexture(snapshot: AtlasSnapshot): AtlasTextureData {
  let maxSlot = -1;
  for (const entry of snapshot.featureSlots) {
    maxSlot = Math.max(maxSlot, entry.slot);
  }
  const slotCount = Math.max(1, maxSlot + 1);
  const data = new Uint32Array(slotCount);

  for (const entry of snapshot.featureSlots) {
    const slot = entry.slot as number;
    if (slot < 0 || slot >= slotCount) {
      continue;
    }
    data[slot] = encodeLayers(entry.layers);
  }

  const width = Math.max(1, Math.min(slotCount, MAX_TEXTURE_SIZE));
  const height = Math.max(1, Math.ceil(slotCount / width));
  return { data, width, height, slotCount };
}

export function slotOf(value: number): FeatureSlot {
  return value as FeatureSlot;
}
