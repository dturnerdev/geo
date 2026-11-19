/// <reference lib="dom" />

import type { ItemId } from '../../domain/src/ids.ts';
import type { PerspectiveId } from '../../domain/src/perspective.ts';
import type { Result } from '../../domain/src/result.ts';
import type { LngLat } from '../../engine/src/geo/index.ts';

export type { LngLat } from '../../engine/src/geo/index.ts';
export type { PerspectiveId } from '../../domain/src/perspective.ts';

export type ViewMode = 'globe' | 'flat';

// Camera values are renderer state, not learner-facing defaults (FE06).
export interface CameraTarget {
  readonly centre: LngLat;
  readonly distanceM: number;
  readonly azimuthDeg: number;
  readonly elevationDeg: number;
}

export interface CameraState extends CameraTarget {
  readonly mode: ViewMode;
}

export type Unsubscribe = () => void;

export interface LabelData {
  readonly item: ItemId;
  readonly text: string;
  readonly fame: number | null;
  readonly anchor: LngLat;
}

// app-shell resolves perspective and locale data. `globe` never imports
// `content` (07 §4).
export interface GlobeOptions {
  readonly labelFor: (item: ItemId) => LabelData | undefined;
}

export interface GlobeController {
  mount(canvas: HTMLCanvasElement, options: GlobeOptions): Result<void, GlobeError>;
  setViewMode(mode: ViewMode): Promise<void>;
  flyTo(target: CameraTarget): Promise<void>;
  setAtlas(snapshot: AtlasSnapshot): void;
  setVisibleLabels(items: ReadonlySet<ItemId>): void;
  setOverlays(overlays: readonly Overlay[]): void;
  setReduceMotion(on: boolean): void;
  screenToLngLat(x: number, y: number): LngLat | null;
  onCameraChange(listener: (camera: CameraState) => void): Unsubscribe;
  dispose(): void;
}

export type Overlay =
  | { kind: 'marker'; at: LngLat; style: 'answer' | 'chosen' }
  | { kind: 'arc'; from: LngLat; to: LngLat }
  | { kind: 'beam'; from: LngLat; bearingDeg: number; widthDeg: number }
  | {
      kind: 'highlight';
      item: ItemId;
      style: 'correct' | 'close' | 'incorrect' | 'neutral';
    }
  | { kind: 'crosshair' };

export type GlobeError = { kind: 'no-webgl2' } | { kind: 'context-failed' };

// --- FE08/FE09 contracts referenced by the FE06 interface -------------------

export type FeatureSlot = number & { readonly __brand: 'FeatureSlot' };

export type AtlasItemState = 'undiscovered' | 'discovered' | 'established' | 'fading' | 'restored';

export type AtlasLayer = 'country' | 'capital' | 'rivers' | 'relief' | 'regions' | 'biomes';

export type AtlasLayerStates = Readonly<Record<AtlasLayer, AtlasItemState>>;

export interface AtlasItemStateEntry {
  readonly item: ItemId;
  readonly layers: AtlasLayerStates;
}

export interface AtlasFeatureStateEntry {
  readonly slot: FeatureSlot;
  readonly layers: AtlasLayerStates;
}

export interface AtlasSnapshot {
  readonly perspective: PerspectiveId;
  readonly items: readonly AtlasItemStateEntry[];
  readonly featureSlots: readonly AtlasFeatureStateEntry[];
}

// --- Celestial body --------------------------------------------------------

// Earth is the only body in the MVP, but nothing in the renderer is tied to it
// (D40). A body carries its own meshes so a later solar-system Easter egg can
// add another without changing the controller.
export interface CelestialBodyMesh {
  readonly kind: 'sphere' | 'flat';
  readonly positions: Float32Array;
  readonly flatPositions: Float32Array;
  readonly featureSlots: Uint32Array;
  readonly indices: Uint32Array;
}

export interface CelestialBody {
  readonly id: string;
  readonly radiusM: number;
  readonly meshes: readonly CelestialBodyMesh[];
}
