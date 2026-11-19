import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type {
  FacetId,
  GameId,
  InputMethod,
  LngLat,
  Question,
  RawResponse,
} from '../../domain/src/index.ts';
import type { ContentView } from '../src/game/generate.ts';
import { grade, GRADER_VERSION, type GradeInput, type SpeedBaseline } from './index.ts';

const QUESTION: Question = {
  id: 'question:1',
  game: 'game:1' as GameId,
  item: 'item:1',
  primitive: 'P1',
  facet: 'F01' as FacetId,
  level: 'R1',
  seed: 1,
  answerType: 'region',
  options: [],
  hiddenLabels: [],
};

// FE11 grading only needs the ContentView boundary here; show-me and the
// ungraded fallback never read content.
const VIEW: ContentView = {
  perspective: 'default',
  item: () => undefined,
  itemsOfKind: () => [],
  displayName: () => '',
  borders: () => [],
};

const NON_SHOW_ME_RESPONSES: readonly RawResponse[] = [
  { kind: 'region', at: null, itemIds: [] },
  { kind: 'point', at: { lng: 0, lat: 0 } as LngLat },
  { kind: 'choice', optionId: 'option:1' },
  { kind: 'text', value: 'example' },
  { kind: 'assignment', pairs: [] },
  { kind: 'sequence', ids: [] },
  { kind: 'bearing', degrees: 90, shot: 1 },
  { kind: 'path', points: [] },
];

function input(overrides: Partial<GradeInput> = {}): GradeInput {
  return {
    question: QUESTION,
    response: { kind: 'showMe' },
    responseMs: 1000,
    hintsUsed: 0,
    aidsUsed: [],
    inputMethod: 'touch',
    speedBaseline: null,
    settings: { spellingSupport: false },
    view: VIEW,
    ...overrides,
  };
}

describe('FE11 grading', () => {
  it('AC-11.2 "Show me" is always Again with outcome shown (property test)', () => {
    fc.assert(
      fc.property(
        fc.nat(),
        fc.nat({ max: 10 }),
        fc.constantFrom<InputMethod>('touch', 'keyboard', 'screenReader', 'list'),
        fc.boolean(),
        fc.constantFrom<SpeedBaseline | null>(null, { medianMs: 1200, sampleCount: 20 }),
        (responseMs, hintsUsed, inputMethod, spellingSupport, speedBaseline) => {
          const result = grade(
            input({
              response: { kind: 'showMe' },
              responseMs,
              hintsUsed,
              inputMethod,
              speedBaseline,
              settings: { spellingSupport },
            }),
          );

          expect(result.rating).toBe('again');
          expect(result.outcome).toBe('shown');
          expect(result.reasons).toContain('show-me');
          expect(result.graderVersion).toBe(GRADER_VERSION);
        },
      ),
    );
  });

  it('AC-11.7 Easy is never given without a speed baseline (unit test)', () => {
    for (const response of NON_SHOW_ME_RESPONSES) {
      const result = grade(input({ response, speedBaseline: null }));
      expect(result.rating).not.toBe('easy');
    }
  });

  it.todo(
    'AC-11.1 Golden fixtures for every primitive produce the expected rating and outcome on web and Android (reference replay) — not done: no per-primitive golden fixtures or target payloads exist in this slice.',
  );

  it.todo(
    'AC-11.3 Turning on any aid never gives a lower rating for the same response (property test, D128) — not done: the spec names aids but does not define AidId values, so there is no aid input to vary.',
  );

  it.todo(
    'AC-11.4 A near-miss is never above Hard without spelling support, and never above Good with it (property test) — not done: Question carries no accepted names or typing-tolerance fixtures, and the text grader is outside this minimal slice.',
  );

  it.todo(
    'AC-11.5 The guard list is always Again — not done: the pipeline-generated guard list and name fixtures are not available to engine grading in this slice.',
  );

  it.todo(
    'AC-11.6 Bearing correction shots never change the rating — not done: Question has no bearing target or beam geometry, so the bearing rating path is not built.',
  );

  it.todo(
    'AC-11.8 The same tap gives the same result on the globe and the flat map (property test with FE06) — not done: FE06 tap-zone pipeline geometry is not exposed to engine grading.',
  );

  it.skip(
    'AC-11.9 grade p95 < 5 ms on the Galaxy A07 4G (placeholder) — skipped: requires the physical reference device (Galaxy A07 4G), which is not available to this test run.',
  );

  it.todo(
    'AC-11.10 Every event stores its geometry and grader version; replays never call geometry functions (spy test) — not done: the FE11 event/store boundary and geometry recorder are not defined in this slice.',
  );

  it.todo(
    'AC-11.11 "Slovakia" is never accepted for Slovenia, or the other way round, with spelling support on or off (unit test) — not done: no Slovenia/Slovakia name fixtures or facet-scoped ContentView are available to this slice.',
  );

  it.todo(
    'AC-11.12 "Nigera" is accepted for neither Niger nor Nigeria, and the feedback names both (unit test) — not done: no Niger/Nigeria guard fixtures are available, and the guard list is not defined in this slice.',
  );

  it.todo(
    "AC-11.13 \"the  côte d'ivoire\" grades as Côte d'Ivoire with 0 typos (unit test) — not done: no Côte d'Ivoire locale or alternative-name fixture is available to this slice.",
  );

  it.todo(
    'AC-11.14 A Bearing answer exactly on the beam edge is correct; 15° beyond is a near miss and 15.1° beyond is wrong (property test) — not done: Question has no bearing target width or start point, so beam geometry cannot be evaluated.',
  );

  it.todo(
    'AC-11.15 Distance tolerances match fixtures for Malta, France, Russia, a city and the Nile, and a point inside an area scores distance 0 (unit test) — not done: no geometry fixtures or area/line target payloads exist in this slice.',
  );
});
