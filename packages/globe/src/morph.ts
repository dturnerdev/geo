import type { ViewMode } from './types.ts';

// `motion.morph` from 06 §7 (D153).
export const MORPH_DURATION_MS = 700;

export interface MorphPlan {
  readonly from: ViewMode;
  readonly to: ViewMode;
  readonly startedAt: number;
  readonly durationMs: number;
  /** Reduce motion swaps the blend for a crossfade (06 §7). */
  readonly crossfade: boolean;
}

export function createMorphPlan(
  from: ViewMode,
  to: ViewMode,
  reduceMotion: boolean,
  now: number,
): MorphPlan {
  return {
    from,
    to,
    startedAt: now,
    durationMs: MORPH_DURATION_MS,
    crossfade: reduceMotion,
  };
}

/** Linear blend 0 (globe positions) to 1 (flat positions). */
export function morphProgress(plan: MorphPlan, now: number): number {
  if (plan.durationMs <= 0) {
    return 1;
  }
  const elapsed = Math.max(0, now - plan.startedAt);
  return Math.min(1, elapsed / plan.durationMs);
}

export function morphComplete(plan: MorphPlan, now: number): boolean {
  return now >= plan.startedAt + plan.durationMs;
}

/**
 * Reduce motion uses an opacity crossfade, not a position morph. Both modes
 * still complete at 700 ms so the interaction stays predictable.
 */
export function morphOpacity(
  plan: MorphPlan,
  now: number,
): { readonly from: number; readonly to: number } {
  const progress = morphProgress(plan, now);
  if (!plan.crossfade) {
    return { from: 1, to: 0 };
  }
  return { from: 1 - progress, to: progress };
}
