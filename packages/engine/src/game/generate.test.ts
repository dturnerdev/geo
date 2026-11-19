import {
  parseGameDefinition,
  type FlagSnapshot,
  type GameDefinition,
} from '../../../domain/src/index.ts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  eligibleGames,
  gameAvailable,
  generateQuestion,
  type ContentItem,
  type ContentView,
} from './generate.ts';

function item(id: string, kind = 'country'): ContentItem {
  return {
    id,
    kind: kind as ContentItem['kind'],
    status: 'sovereign' as ContentItem['status'],
    names: { 'en-GB': id },
    fame: 1,
  };
}

const ITEMS: readonly ContentItem[] = [
  item('country.fra'),
  item('country.deu'),
  item('country.esp'),
  item('country.ita'),
  item('river.danube', 'river'),
];

const VIEW: ContentView = {
  perspective: 'default',
  item: (id) => ITEMS.find((candidate) => candidate.id === id),
  itemsOfKind: (kind) => ITEMS.filter((candidate) => candidate.kind === kind),
  displayName: (id) => id,
  borders: () => [],
};

const FLASH_TAP = parseGameDefinition({
  id: 'game.flashpoint.f01.r1',
  primitive: 'P1',
  facet: 'F01',
  level: 'R1',
  channels: ['visual'],
  load: 1,
  assets: ['map'],
  grader: 'P1',
  generator: 'P1',
  flag: null,
});

const WHICH_CONTINENT = parseGameDefinition({
  id: 'game.which-continent.f02.r1',
  primitive: 'P3',
  facet: 'F02',
  level: 'R1',
  channels: ['visual', 'typed'],
  load: 1,
  assets: ['map'],
  grader: 'P3',
  generator: 'P3',
  flag: null,
});

const EXPERIMENTAL = parseGameDefinition({
  id: 'game.flag-forge.f07.r4',
  primitive: 'P5',
  facet: 'F07',
  level: 'R4',
  channels: ['visual'],
  load: 2,
  assets: ['flags'],
  grader: 'P5',
  generator: 'P5',
  flag: 'game.flagForge',
});

function flags(values: Readonly<Record<string, boolean>> = {}): FlagSnapshot {
  return { channel: 'internal', flags: values, variants: {}, sources: {} };
}

describe('FE10 question generation', () => {
  it('AC-10.2 generateQuestion gives identical output for the same inputs on web and Android', () => {
    const first = generateQuestion(FLASH_TAP, 'country.fra', VIEW, 42);
    const second = generateQuestion(FLASH_TAP, 'country.fra', VIEW, 42);
    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    if (first.ok) {
      // Fixed reference vector: the same JavaScript arithmetic runs on both
      // platforms, so a replay of these inputs must produce this identity.
      expect(first.value.id).toBe('q:game.flashpoint.f01.r1:country.fra:42:2949642838');
      expect(first.value.answerType).toBe('region');
    }
  });

  it('AC-10.2 changes output only when the seed or item changes', () => {
    const base = generateQuestion(FLASH_TAP, 'country.fra', VIEW, 1);
    const otherSeed = generateQuestion(FLASH_TAP, 'country.fra', VIEW, 2);
    expect(base).not.toEqual(otherSeed);
  });

  it('AC-10.3 no generated question shows the label of its own item', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000 }),
        fc.constantFrom('country.fra', 'country.deu', 'country.esp', 'country.ita'),
        (seed, id) => {
          const generated = generateQuestion(FLASH_TAP, id, VIEW, seed);
          expect(generated.ok).toBe(true);
          if (generated.ok) {
            expect(generated.value.hiddenLabels).toContain(id);
            expect(generated.value.options.some((option) => option.item === id)).toBe(false);
          }
        },
      ),
      { seed: 20261119 },
    );
  });

  it('generates deterministic choice options from the active view', () => {
    const first = generateQuestion(WHICH_CONTINENT, 'country.fra', VIEW, 7);
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.value.answerType).toBe('choice');
      expect(first.value.options).toHaveLength(3);
      const optionItems = first.value.options.map((option) => option.item);
      expect(optionItems).not.toContain('country.fra');
      expect(optionItems).not.toContain('river.danube');
    }
  });

  it('returns item-not-in-view rather than inventing content', () => {
    expect(generateQuestion(FLASH_TAP, 'country.usa', VIEW, 1)).toEqual({
      ok: false,
      error: { kind: 'item-not-in-view' },
    });
  });

  it('AC-10.7 experimental games are excluded until their flag is on', () => {
    const games: readonly GameDefinition[] = [FLASH_TAP, EXPERIMENTAL];
    expect(gameAvailable(EXPERIMENTAL, flags())).toBe(false);
    expect(eligibleGames(games, EXPERIMENTAL.facet, EXPERIMENTAL.level, flags())).toEqual([]);
    expect(
      eligibleGames(
        games,
        EXPERIMENTAL.facet,
        EXPERIMENTAL.level,
        flags({ 'game.flagForge': true }),
      ),
    ).toEqual([EXPERIMENTAL]);
  });

  it.todo(
    'AC-10.4 Compass pick never uses a pair where the sectors disagree (D126) — not done: ContentView exposes no coordinates and the spec does not define the compass-sector comparison, so no pair generation is safe.',
  );
});
