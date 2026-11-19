import type {
  AidId,
  InputMethod,
  Outcome,
  Question,
  Rating,
  RawResponse,
} from '../../domain/src/index.ts';
import type { ContentView } from '../src/game/generate.ts';

// FE11 fixes the GradeInput/GradeResult/grade names but leaves StoredGeometry
// and GradeReason undefined. These branded opaque boundaries keep the contract
// exact without inventing payload fields; FE11 records the gap in the report.
export type StoredGeometry = { readonly __brand: 'StoredGeometry' };
export type GradeReason = string & { readonly __brand: 'GradeReason' };

// FE11 behaviour 9 names a median and a sample count but gives no shape. This
// is the smallest useful boundary: both values are required for the fast rule.
export interface SpeedBaseline {
  readonly medianMs: number;
  readonly sampleCount: number;
}

export interface GradeInput {
  question: Question;
  response: RawResponse;
  responseMs: number;
  hintsUsed: number;
  aidsUsed: readonly AidId[];
  inputMethod: InputMethod;
  speedBaseline: SpeedBaseline | null;
  settings: { spellingSupport: boolean };
  view: ContentView;
}

export interface GradeResult {
  rating: Rating;
  outcome: Outcome;
  geometry: StoredGeometry;
  reasons: readonly GradeReason[];
  graderVersion: number;
}

export const GRADER_VERSION = 1;

const EMPTY_GEOMETRY = {} as StoredGeometry;

function reason(code: string): GradeReason {
  return code as GradeReason;
}

/**
 * Minimal FE11 boundary. "Show me" is fully graded (D53). Every other response
 * stays deterministic and ungraded until the per-primitive question payloads
 * exist; no correctness is invented here.
 */
export function grade(input: GradeInput): GradeResult {
  if (input.response.kind === 'showMe') {
    return {
      rating: 'again',
      outcome: 'shown',
      geometry: EMPTY_GEOMETRY,
      reasons: [reason('show-me')],
      graderVersion: GRADER_VERSION,
    };
  }

  return {
    rating: 'again',
    outcome: 'incorrect',
    geometry: EMPTY_GEOMETRY,
    reasons: [reason(`ungraded:${input.response.kind}`)],
    graderVersion: GRADER_VERSION,
  };
}
