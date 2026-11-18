import type { AnswerRecordedPayload } from '../../../domain/src/index.ts';
import { localDay } from '../time/index.ts';
import { itemFacetKey, type ItemFacetKey } from './types.ts';

export const DAY_MS = 24 * 60 * 60 * 1000;

export interface ParsedAnswer {
  readonly at: number;
  readonly id: string;
  readonly key: ItemFacetKey;
  readonly timeZone: string;
  readonly format: string;
  readonly rating: number;
  readonly correct: boolean;
  readonly shown: boolean;
  readonly surprise: boolean;
  readonly responseMs: number;
}

export interface AnswerEventLike {
  readonly at: number;
  readonly id: string;
  readonly tz: string;
  readonly payload: AnswerRecordedPayload;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// "Show me" is Again internally, but it is never an incorrect answer for a
// metric (FE04 behaviour 3, AC-04.3, D53).
export function isShowMe(answer: AnswerRecordedPayload): boolean {
  for (const aid of answer.aids) {
    if (aid.toLowerCase().replace(/[-_\s]/g, '') === 'showme') {
      return true;
    }
  }
  const response = answer.response;
  return isRecord(response) && response['kind'] === 'showMe';
}

// The measured response time is a required AnswerRecorded payload field
// (FE01 behaviour 2). It is read directly; the 60 s active-practice cap is
// applied only when metrics are computed (FE04 behaviour 2).
export function responseTimeMs(answer: AnswerRecordedPayload): number {
  return answer.responseTimeMs;
}

export function parseAnswer(event: AnswerEventLike): ParsedAnswer {
  const { payload } = event;
  return {
    at: event.at,
    id: event.id,
    key: itemFacetKey(payload.itemId, payload.facet),
    timeZone: event.tz,
    format: payload.format,
    rating: payload.rating,
    correct: payload.rating >= 3,
    shown: isShowMe(payload),
    surprise: payload.surprise,
    responseMs: responseTimeMs(payload),
  };
}

// The local day runs 04:00 to 04:00 (D134). All local-day maths lives in
// engine/time (FE05); metrics only compares its day keys.
export function localDayKey(at: number, timeZone: string): string {
  return localDay(at, timeZone).key;
}

export interface FacetMemory {
  readonly stabilityDays: number;
  readonly lastAt: number;
  readonly correctStreak: number;
}

const DEFAULT_RECALL = 0.5;
const MAX_STABILITY_DAYS = 3_650;

// A deterministic on-device forecast until FE13's memory model is wired in.
// FE04 only needs a stable predicted recall for durable knowledge and
// calibration; the real model replaces this function without changing the
// MetricsReport interface.
export function predictRecall(state: FacetMemory | null, at: number): number {
  if (state === null) {
    return DEFAULT_RECALL;
  }
  const elapsedDays = Math.max(0, (at - state.lastAt) / DAY_MS);
  const base = state.correctStreak > 0 ? 1 : DEFAULT_RECALL;
  return base * Math.exp(-elapsedDays / state.stabilityDays);
}

export function updateMemory(state: FacetMemory | null, answer: ParsedAnswer): FacetMemory {
  const correct = answer.correct && !answer.shown;
  if (state === null) {
    return {
      stabilityDays: correct ? 2 : 0.5,
      lastAt: answer.at,
      correctStreak: correct ? 1 : 0,
    };
  }

  const elapsedDays = Math.max(0, (answer.at - state.lastAt) / DAY_MS);
  if (!correct) {
    return {
      stabilityDays: Math.max(0.25, state.stabilityDays * 0.35),
      lastAt: answer.at,
      correctStreak: 0,
    };
  }

  const growth = 1.8 + Math.min(elapsedDays / 30, 1);
  return {
    stabilityDays: Math.min(MAX_STABILITY_DAYS, Math.max(1, state.stabilityDays * growth)),
    lastAt: answer.at,
    correctStreak: state.correctStreak + 1,
  };
}
