import { describe, expect, it } from 'vitest';
import {
  createMorphPlan,
  MORPH_DURATION_MS,
  morphComplete,
  morphOpacity,
  morphProgress,
} from './morph.ts';

describe('FE06 globe/flat morph', () => {
  it('AC-06.5 the globe → flat morph takes 700 ms', () => {
    const plan = createMorphPlan('globe', 'flat', false, 1_000);
    expect(MORPH_DURATION_MS).toBe(700);
    expect(plan.durationMs).toBe(700);
    expect(morphProgress(plan, 1_000)).toBe(0);
    expect(morphProgress(plan, 1_350)).toBeCloseTo(0.5, 12);
    expect(morphComplete(plan, 1_699)).toBe(false);
    expect(morphComplete(plan, 1_700)).toBe(true);
    expect(morphOpacity(plan, 1_350)).toEqual({ from: 1, to: 0 });
  });

  it('AC-06.5 with reduce motion on, a crossfade is used instead', () => {
    const plan = createMorphPlan('globe', 'flat', true, 0);
    expect(plan.crossfade).toBe(true);
    expect(plan.durationMs).toBe(700);
    const halfway = morphOpacity(plan, 350);
    expect(halfway.from).toBeCloseTo(0.5, 12);
    expect(halfway.to).toBeCloseTo(0.5, 12);
    expect(morphComplete(plan, 700)).toBe(true);
  });
});
