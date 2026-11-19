import { describe, expect, it } from 'vitest';
import {
  buildRound,
  rebuildRemaining,
  type ContentView,
  type NewItemSource,
  type ReviewSource,
  type Round,
  type RoundInput,
} from './index.ts';

const flags = { channel: 'internal', flags: {}, variants: {}, sources: {} };

const view: ContentView = {
  item: () => undefined,
};

const reviews: ReviewSource = {
  due: () => [],
  predictedRecall: () => null,
};

const newItems: NewItemSource = {
  candidates: () => [],
};

function input(seed: number): RoundInput {
  return {
    state: undefined,
    view,
    games: [],
    flags,
    reviews,
    newItems,
    emphasis: [],
    signals: undefined,
    now: 1_000,
    seed,
  };
}

describe('FE15 session builder', () => {
  it('AC-15.1 gives an identical Round for the same RoundInput', () => {
    const first = buildRound(input(42));
    const second = buildRound(input(42));

    expect(second).toEqual(first);
    expect(first.seed).toBe(42);
  });

  it.skip('AC-15.2 meets the load budget and mixing rules (property test)', () => {
    // TODO(FE15): needs the M3 slot model and game-selection rules. The M2
    // boundary returns no slots, so load and mixing cannot be asserted yet.
  });

  it.skip('AC-15.3 keeps one facet per item in a non-Claim round (property test)', () => {
    // TODO(FE15): the slot model is M3-owned; facets are not assigned here.
  });

  it.skip('AC-15.4 follows a missed Boss with one easy item (property test)', () => {
    // TODO(FE15): needs the round's Boss/win slot kinds and grading outcome.
  });

  it.skip('AC-15.5 never moves an item across priority levels with emphasis (property test)', () => {
    // TODO(FE15): needs the priority ordering from FE14 selection.
  });

  it.skip('AC-15.6 never continues automatically with "No time pressure" on (E2E)', () => {
    // TODO(FE15): app-shell and UI round flow, owned by the M2 session UI task.
  });

  it.skip('AC-15.7 never says "done for today" or similar (string lint plus screenshot review)', () => {
    // TODO(FE15): needs the round/UI strings; no such strings exist in this
    // boundary yet. Screenshot review is manual.
  });

  it.skip('AC-15.8 rebuilds only unanswered slots after a park over 10 minutes', () => {
    // TODO(FE15): the slot model and park/RoundParked hooks are M3-owned.
    // rebuildRemaining currently returns the round unchanged.
  });

  it.skip('AC-15.9 builds a round in p95 < 50 ms on the Galaxy A07 4G', () => {
    // TODO(FE15): reference-device benchmark; the M2 boundary has no slot
    // selection to measure. Device: Galaxy A07 4G.
  });

  it.skip('AC-15.10 replaces the stand-in sources with no change in session/ (type test)', () => {
    // TODO(FE15): stand-in sources are not part of this minimal boundary.
  });

  it.skip('AC-15.11 completes the 500 learner x 60 day simulation smoke with no invariant violations', () => {
    // TODO(FE15/FE18): simulation harness task, not this session boundary.
  });

  it('keeps rebuildRemaining deterministic for the same round and input', () => {
    const round: Round = buildRound(input(7));
    expect(rebuildRemaining(round, 0, input(7))).toEqual(round);
  });
});
