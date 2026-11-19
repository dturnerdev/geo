import {
  err,
  ok,
  PRIMITIVE_SPECS,
  type FacetId,
  type FlagSnapshot,
  type GameDefinition,
  type GameId,
  type Level,
  type Result,
} from '@geo/domain';
import { z } from 'zod';

// FE10 catalogue metadata. The exact GameDefinition interface has no name
// field although the Behaviour list names one, so the authored name lives only
// on this wrapper and the contradiction is recorded as a Spec question.
export interface GameCatalogueEntry {
  readonly name: string;
  readonly definition: GameDefinition;
}

export interface GameCatalogue {
  readonly entries: readonly GameCatalogueEntry[];
  all(): readonly GameDefinition[];
  forSlot(facet: FacetId, level: Level, flags: FlagSnapshot): readonly GameDefinition[];
}

export type GameCatalogueError =
  | { readonly kind: 'invalid-game'; readonly source: string; readonly issues: readonly string[] }
  | { readonly kind: 'duplicate-game'; readonly id: GameId }
  | { readonly kind: 'unknown-primitive'; readonly id: GameId }
  | { readonly kind: 'unknown-facet'; readonly id: GameId }
  | { readonly kind: 'mismatched-grader'; readonly id: GameId }
  | { readonly kind: 'mismatched-generator'; readonly id: GameId };

const authoredGameSchema = z
  .object({
    name: z.string().min(1),
    id: z.string().min(1),
    primitive: z.enum(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9']),
    facet: z.string().regex(/^F(?:0[1-9]|[12]\d|3[0-4])[a-z]?$/u),
    level: z.enum(['R1', 'R2', 'R3', 'R4']),
    channels: z.array(z.enum(['visual', 'audio', 'spatial', 'typed'])),
    load: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    assets: z.array(z.string().min(1)),
    grader: z.string().min(1),
    generator: z.string().min(1),
    flag: z.string().min(1).optional(),
  })
  .strict();

type AuthoredGame = z.infer<typeof authoredGameSchema>;

function unquote(value: string): string | null {
  if (value.length < 2 || !value.startsWith('"') || !value.endsWith('"')) {
    return null;
  }
  return value.slice(1, -1).replace(/\\"/gu, '"');
}

function parseValue(raw: string): unknown {
  const value = raw.trim();
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  if (/^-?\d+$/u.test(value)) {
    return Number(value);
  }
  const string = unquote(value);
  if (string !== null) {
    return string;
  }
  if (value.startsWith('[') && value.endsWith(']')) {
    const body = value.slice(1, -1).trim();
    if (body.length === 0) {
      return [];
    }
    return body.split(',').map((part) => {
      const item = part.trim();
      return unquote(item) ?? item;
    });
  }
  return value;
}

/**
 * Minimal TOML reader for the flat game files in content/games. It covers only
 * key = string|integer|boolean|array records; nested tables are outside FE10's
 * authored game shape.
 */
export function parseGameToml(
  source: string,
  path: string,
): Result<AuthoredGame, GameCatalogueError> {
  const fields: Record<string, unknown> = {};
  for (const line of source.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }
    const equals = trimmed.indexOf('=');
    if (equals <= 0) {
      return err({
        kind: 'invalid-game',
        source: path,
        issues: [`unreadable line: ${trimmed}`],
      });
    }
    const key = trimmed.slice(0, equals).trim();
    fields[key] = parseValue(trimmed.slice(equals + 1));
  }
  const parsed = authoredGameSchema.safeParse(fields);
  if (!parsed.success) {
    return err({
      kind: 'invalid-game',
      source: path,
      issues: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    });
  }
  return ok(parsed.data);
}

function toDefinition(game: AuthoredGame): GameDefinition {
  return {
    id: game.id as GameId,
    primitive: game.primitive,
    facet: game.facet as FacetId,
    level: game.level,
    channels: game.channels,
    load: game.load,
    assets: game.assets.map((asset) => asset as GameDefinition['assets'][number]),
    grader: game.grader as GameDefinition['grader'],
    generator: game.generator as GameDefinition['generator'],
    flag: game.flag ?? null,
  };
}

function isAvailable(game: GameDefinition, flags: FlagSnapshot): boolean {
  return game.flag === null || flags.flags[game.flag] === true;
}

/** Validate authored files and build the runtime catalogue (AC-10.1). */
export function buildGameCatalogue(
  files: readonly { readonly path: string; readonly text: string }[],
): Result<GameCatalogue, GameCatalogueError> {
  const entries: GameCatalogueEntry[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const parsed = parseGameToml(file.text, file.path);
    if (!parsed.ok) {
      return parsed;
    }
    const game = parsed.value;
    if (seen.has(game.id)) {
      return err({ kind: 'duplicate-game', id: game.id as GameId });
    }
    seen.add(game.id);
    const primitive = PRIMITIVE_SPECS[game.primitive];
    if (game.facet === undefined) {
      return err({ kind: 'unknown-facet', id: game.id as GameId });
    }
    if (game.grader !== primitive.grader) {
      return err({ kind: 'mismatched-grader', id: game.id as GameId });
    }
    if (game.generator !== primitive.generator) {
      return err({ kind: 'mismatched-generator', id: game.id as GameId });
    }
    entries.push({ name: game.name, definition: toDefinition(game) });
  }

  const catalogue: GameCatalogue = {
    entries,
    all: () => entries.map((entry) => entry.definition),
    forSlot: (facet, level, flags) =>
      entries
        .map((entry) => entry.definition)
        .filter((game) => game.facet === facet && game.level === level && isAvailable(game, flags)),
  };
  return ok(catalogue);
}
