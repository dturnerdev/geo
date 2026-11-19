import type { FlagSnapshot } from '@geo/domain';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildGameCatalogue, parseGameToml } from './game-catalogue.ts';

const root = process.cwd();

function catalogueFiles(): readonly { path: string; text: string }[] {
  return readdirSync(path.join(root, 'content/games'))
    .filter((file) => file.endsWith('.toml'))
    .sort()
    .map((file) => ({
      path: `content/games/${file}`,
      text: readFileSync(path.join(root, 'content/games', file), 'utf8'),
    }));
}

function flags(values: Readonly<Record<string, boolean>> = {}): FlagSnapshot {
  return {
    channel: 'internal',
    flags: values,
    variants: {},
    sources: {},
  };
}

const TEST_GAME = `
name = "Test Game"
id = "game.test.f01.r1"
primitive = "P1"
facet = "F01"
level = "R1"
channels = ["visual"]
load = 1
assets = ["map"]
grader = "P1"
generator = "P1"
`;

describe('FE10 game catalogue', () => {
  it('AC-10.1 every game in the catalogue validates and names an existing primitive, facet, grader and generator', () => {
    const built = buildGameCatalogue(catalogueFiles());
    expect(built.ok).toBe(true);
    if (!built.ok) {
      return;
    }
    expect(built.value.entries.length).toBeGreaterThanOrEqual(9);
    for (const game of built.value.all()) {
      expect(game.id.length).toBeGreaterThan(0);
      expect(game.grader).toBe(game.primitive);
      expect(game.generator).toBe(game.primitive);
      expect(game.facet).toMatch(/^F\d{2}[a-z]?$/u);
    }
  });

  it('AC-10.1 rejects an authored game whose grader does not match the primitive', () => {
    const built = buildGameCatalogue([
      {
        path: 'content/games/broken.toml',
        text: TEST_GAME.replace('grader = "P1"', 'grader = "P3"'),
      },
    ]);
    expect(built.ok).toBe(false);
    if (!built.ok) {
      expect(built.error.kind).toBe('mismatched-grader');
    }
  });

  it('AC-10.7 experimental games never appear unless their flag is on', () => {
    const built = buildGameCatalogue(catalogueFiles());
    expect(built.ok).toBe(true);
    if (!built.ok) {
      return;
    }
    const facet = 'F05' as never;
    const level = 'R4' as never;
    expect(built.value.forSlot(facet, level, flags())).toEqual([]);
    const enabled = built.value.forSlot(facet, level, flags({ 'game.cartographer': true }));
    expect(enabled.map((game) => game.id)).toContain('game.cartographer.f05.r4');
  });

  it('AC-10.8 adding a test game to the pack makes it eligible with no engine change', () => {
    const base = catalogueFiles();
    const before = buildGameCatalogue(base);
    const after = buildGameCatalogue([
      ...base,
      { path: 'content/games/test.toml', text: TEST_GAME },
    ]);
    expect(before.ok && after.ok).toBe(true);
    if (!before.ok || !after.ok) {
      return;
    }
    const facet = 'F01' as never;
    const level = 'R1' as never;
    const beforeIds = before.value.forSlot(facet, level, flags()).map((game) => game.id);
    const afterIds = after.value.forSlot(facet, level, flags()).map((game) => game.id);
    expect(afterIds).toContain('game.test.f01.r1');
    expect(afterIds.length).toBe(beforeIds.length + 1);
  });

  it('parses the authored TOML shape and keeps the name outside GameDefinition', () => {
    const parsed = parseGameToml(TEST_GAME, 'content/games/test.toml');
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.name).toBe('Test Game');
      expect(parsed.value.id).toBe('game.test.f01.r1');
    }
  });
});
