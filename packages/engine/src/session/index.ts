// FE15 session builder boundary for M2.
//
// The real memory model (FE13) and selection (FE14) land in M3. Until then the
// shapes those features own stay opaque aliases here: this module records the
// exact FE15 interface names and the deterministic stand-in behaviour that the
// spec fixes, and deliberately does not invent scheduler or slot semantics.
// FE15 names these FE10/domain types but this minimal boundary must compile on
// its own without inventing their shapes. They stay opaque until the owning
// features are wired in.
import type { FlagSnapshot, GameDefinition, ItemId, RoundId } from '../../../domain/src/index.ts';

// FE15 names this type but neither it nor the memory model defines it before
// M3. Keep it opaque so no learner-state vocabulary is invented.
export type LearnerState = unknown;

// FE15 names the key but the shape is owned by the memory model (M3). The
// stand-in and metrics only need a stable string key.
export type ItemFacetKey = string;

// Structural subset of the content view that this boundary needs. The content
// package owns the full FE07 interface; engine may only import domain (07 §4),
// so the builder accepts the structurally compatible shape without importing
// content into the engine.
export interface ContentView {
  item(id: ItemId): unknown;
}

// A due review as seen by the session builder. FE15 lists due reviews,
// learning steps and predicted recall but does not define their fields; these
// are the smallest opaque fields the builder needs to order a stand-in round.
export interface DueEntry {
  readonly item: ItemId;
  readonly facet: string;
  readonly dueAt: number;
}

// Fatigue and engagement, from behaviour only (FE15). Undefined until the
// behaviour model lands, so the boundary keeps it opaque.
export type SessionSignals = unknown;

// Emphasis entry shape is owned by FE14. Keep the smallest opaque boundary.
export interface EmphasisEntry {
  readonly item: ItemId;
  readonly facet: string;
}

// Slot kinds follow FE15 behaviour 4. The exact discriminated union is not
// defined in the spec; M3 owns its full shape, so the stand-in only records the
// kinds and leaves the payload opaque.
export type SlotKind = 'warmup' | 'drill' | 'boss' | 'win' | 'surprise';

export interface Slot {
  readonly kind: SlotKind;
  readonly item: ItemId;
  readonly facet: string;
  readonly game: GameDefinition['id'];
}

export interface ReviewSource {
  due(now: number): readonly DueEntry[];
  predictedRecall(key: ItemFacetKey, now: number): number | null;
}

export interface NewItemSource {
  candidates(state: LearnerState, view: ContentView, limit: number): readonly ItemId[];
}

export interface RoundInput {
  state: LearnerState;
  view: ContentView;
  games: readonly GameDefinition[];
  flags: FlagSnapshot;
  reviews: ReviewSource;
  newItems: NewItemSource;
  emphasis: readonly EmphasisEntry[];
  signals: SessionSignals;
  now: number;
  seed: number;
}

export type RoundType =
  'standard' | 'refresh' | 'claim' | 'themeRun' | 'journey' | 'daily' | 'placement';

export interface Round {
  id: RoundId;
  type: RoundType;
  seed: number;
  slots: readonly Slot[];
}

// The builder is pure and deterministic (FE15 behaviour 2). The M2 stand-in
// only fixes the deterministic identity of a round; it does not select items
// or games because the real sources and full slot semantics arrive in M3.
export function buildRound(input: RoundInput): Round {
  return {
    id: `round:${input.seed}`,
    type: 'standard',
    seed: input.seed,
    slots: [],
  };
}

// FE15 parks and resumes rounds; rebuilding unanswered slots needs the real
// slot model that M3 owns. Return the round unchanged so the boundary is
// deterministic and the unsupported behaviour is recorded by AC-15.8.
export function rebuildRemaining(round: Round, answered: number, input: RoundInput): Round {
  void answered;
  void input;
  return round;
}
