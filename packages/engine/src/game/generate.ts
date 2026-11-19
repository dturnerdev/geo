import {
  err,
  ok,
  PRIMITIVE_SPECS,
  type FacetId,
  type FlagSnapshot,
  type GameDefinition,
  type GenerateError,
  type ItemId,
  type Level,
  type Question,
  type QuestionOption,
  type Result,
} from '../../../domain/src/index.ts';
import { createSeededRandom, hash32, randomIntBelow } from '../random.ts';

// engine may not import content (07 §4), so this mirrors the FE07 ContentView
// shape structurally. Callers pass the content package's view unchanged.
export type ItemKind = string & { readonly __brand: 'ItemKind' };
export type ContentItem = {
  readonly id: ItemId;
  readonly kind: ItemKind;
  readonly status: string & { readonly __brand: 'PerspectiveItemStatus' };
  readonly names: Readonly<Record<string, string>>;
  readonly fame: number | null;
};
export type LngLat = Readonly<{ lng: number; lat: number }> & {
  readonly __brand: 'LngLat';
};
export type ContentView = {
  readonly perspective: 'uk' | 'us' | 'default';
  item(id: ItemId): ContentItem | undefined;
  itemsOfKind(kind: ItemKind): readonly ContentItem[];
  displayName(id: ItemId, locale: 'en-GB' | 'en-US'): string;
  borders(): readonly unknown[];
};

function shuffled<T>(values: readonly T[], random: () => number): readonly T[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = randomIntBelow(random, index + 1);
    const current = copy[index];
    const other = copy[swap];
    if (current !== undefined && other !== undefined) {
      copy[index] = other;
      copy[swap] = current;
    }
  }
  return copy;
}

function choiceOptions(
  target: ContentItem,
  view: ContentView,
  seed: number,
): Result<readonly QuestionOption[], GenerateError> {
  // Lookalike metadata is not exposed by the M1 ContentView. The FE10 edge
  // case allows filling from the same kind, which is the only safe source
  // available here; the missing lookalike-first step is a Spec question.
  const candidates = view
    .itemsOfKind(target.kind)
    .filter((candidate) => candidate.id !== target.id)
    .sort((left, right) => left.id.localeCompare(right.id));
  if (candidates.length < 3) {
    return err({ kind: 'not-enough-options', needed: 3, available: candidates.length });
  }
  const random = createSeededRandom(`${target.id}:${seed}`);
  return ok(
    shuffled(candidates, random)
      .slice(0, 3)
      .map((candidate) => ({ id: `option:${candidate.id}`, item: candidate.id })),
  );
}

/**
 * Deterministic structural question generation (FE10 behaviour 4). It uses only
 * the active ContentView and the seeded PRNG from engine/random. Geometry-based
 * generated exercises are not created here because ContentView supplies no
 * coordinates; AC-10.4 records that as not done.
 */
export function generateQuestion(
  game: GameDefinition,
  item: ItemId,
  view: ContentView,
  seed: number,
): Result<Question, GenerateError> {
  if (!Number.isFinite(seed)) {
    return err({ kind: 'invalid-seed' });
  }
  const target = view.item(item);
  if (target === undefined) {
    return err({ kind: 'item-not-in-view' });
  }

  const primitive = PRIMITIVE_SPECS[game.primitive];
  let options: readonly QuestionOption[] = [];
  if (game.primitive === 'P3') {
    const generated = choiceOptions(target, view, seed);
    if (!generated.ok) {
      return generated;
    }
    options = generated.value;
  }

  const id = `q:${game.id}:${item}:${seed}:${hash32(`${game.id}\u0000${item}\u0000${seed}`)}`;
  return ok({
    id,
    game: game.id,
    item,
    primitive: game.primitive,
    facet: game.facet,
    level: game.level,
    seed,
    answerType: primitive.answerType,
    options,
    hiddenLabels: [item],
  });
}

/** Experimental games are available only when their flag is on (AC-10.7). */
export function gameAvailable(game: GameDefinition, flags: FlagSnapshot): boolean {
  return game.flag === null || flags.flags[game.flag] === true;
}

/**
 * Game selection is data-driven: adding a GameDefinition needs no engine
 * change (AC-10.8, D23). Scheduling remains FE15's responsibility.
 */
export function eligibleGames(
  games: readonly GameDefinition[],
  facet: FacetId,
  level: Level,
  flags: FlagSnapshot,
): readonly GameDefinition[] {
  return games.filter(
    (game) => game.facet === facet && game.level === level && gameAvailable(game, flags),
  );
}
