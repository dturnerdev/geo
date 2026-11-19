import { isPerspectiveId, type ItemId, type Locale, type PerspectiveId } from '@geo/domain';
import { z } from 'zod';
import type { ContentPack } from './content-source.ts';
import { borderLineSchema, lngLatIssues, type BorderLine } from './geometry.ts';

// FE07 perspective records. Item kinds and statuses are opaque authored
// identifiers: their learner-visible vocabulary is a content decision, so this
// module never enumerates them (m1-map.md FE07 Interfaces, 04 §8.1).
export type ItemKind = string & { readonly __brand: 'ItemKind' };
export type PerspectiveItemStatus = string & { readonly __brand: 'PerspectiveItemStatus' };

export interface ContentItem {
  readonly id: ItemId;
  readonly kind: ItemKind;
  readonly status: PerspectiveItemStatus;
  readonly names: Readonly<Partial<Record<Locale, string>>>;
  readonly fame: number | null;
}

export interface PerspectiveFactOverride {
  readonly item: ItemId;
  readonly facet: string;
  readonly value: string | number | boolean | readonly (string | number | boolean)[];
}

export interface PerspectiveProvenance {
  readonly source: string;
  readonly reviewer: string;
}

export interface PerspectivePack extends PerspectiveProvenance {
  readonly id: PerspectiveId;
  readonly extends: PerspectiveId | null;
  readonly items: readonly ContentItem[];
  readonly borders: readonly BorderLine[];
  readonly factOverrides: readonly PerspectiveFactOverride[];
}

export interface ContentView {
  readonly perspective: PerspectiveId;
  item(id: ItemId): ContentItem | undefined;
  itemsOfKind(kind: ItemKind): readonly ContentItem[];
  displayName(id: ItemId, locale: Locale): string;
  borders(): readonly BorderLine[];
}

export function itemKind(value: string): ItemKind {
  if (value.length === 0) {
    throw new TypeError('ItemKind must not be empty');
  }
  return value as ItemKind;
}

export function perspectiveItemStatus(value: string): PerspectiveItemStatus {
  if (value.length === 0) {
    throw new TypeError('PerspectiveItemStatus must not be empty');
  }
  return value as PerspectiveItemStatus;
}

export const itemKindSchema = z
  .string()
  .min(1)
  .transform((value): ItemKind => value as ItemKind);

export const perspectiveItemStatusSchema = z
  .string()
  .min(1)
  .transform((value): PerspectiveItemStatus => value as PerspectiveItemStatus);

const namesSchema = z
  .record(z.string(), z.string().min(1))
  .superRefine((names, context) => {
    for (const key of Object.keys(names)) {
      if (key !== 'en-GB' && key !== 'en-US') {
        context.addIssue({ code: 'custom', message: `unknown name locale "${key}"` });
      }
    }
  })
  .transform((names): Readonly<Partial<Record<Locale, string>>> => names);

export const contentItemSchema = z
  .object({
    id: z.string().min(1),
    kind: itemKindSchema,
    status: perspectiveItemStatusSchema,
    names: namesSchema,
    fame: z.number().nullable(),
  })
  .strict();

const factValueSchema = z.union([z.string(), z.number(), z.boolean()]);

export const perspectiveFactOverrideSchema = z
  .object({
    item: z.string().min(1),
    facet: z.string().min(1),
    value: z.union([factValueSchema, z.array(factValueSchema)]),
  })
  .strict();

export const perspectivePackSchema = z
  .object({
    id: z.enum(['uk', 'us', 'default']),
    extends: z.enum(['uk', 'us', 'default']).nullable(),
    items: z.array(contentItemSchema),
    borders: z.array(borderLineSchema),
    factOverrides: z.array(perspectiveFactOverrideSchema),
    source: z.string().min(1),
    reviewer: z.string().min(1),
  })
  .strict();

export interface PerspectiveIssue {
  readonly path: readonly (string | number)[];
  readonly message: string;
}

function addIssue(
  issues: PerspectiveIssue[],
  path: readonly (string | number)[],
  message: string,
): void {
  issues.push({ path, message });
}

function overrideKey(override: PerspectiveFactOverride): string {
  return `${override.item}\u0000${override.facet}`;
}

// Cross-record invariants that make raw perspective records safe to flatten.
// Learner-visible choices such as status vocabulary and disputed-area treatment
// deliberately stay open; only structural rules are enforced here (04 §8.1).
export function validatePerspectivePacks(
  perspectives: readonly PerspectivePack[],
): readonly PerspectiveIssue[] {
  const issues: PerspectiveIssue[] = [];
  const ids = new Set<PerspectiveId>();

  perspectives.forEach((pack, index) => {
    const base = ['perspectives', index] as const;
    if (!isPerspectiveId(pack.id)) {
      addIssue(issues, [...base, 'id'], 'unknown perspective id');
    }
    if (ids.has(pack.id)) {
      addIssue(issues, [...base, 'id'], `duplicate perspective "${pack.id}"`);
    }
    ids.add(pack.id);

    if (pack.source.trim().length === 0) {
      addIssue(issues, [...base, 'source'], 'a perspective needs a non-empty source');
    }
    if (pack.reviewer.trim().length === 0) {
      addIssue(issues, [...base, 'reviewer'], 'a perspective needs a non-empty reviewer');
    }
    if (pack.extends === pack.id) {
      addIssue(issues, [...base, 'extends'], 'a perspective cannot extend itself');
    }

    const itemIds = new Set<string>();
    pack.items.forEach((item, itemIndex) => {
      if (itemIds.has(item.id)) {
        addIssue(issues, [...base, 'items', itemIndex, 'id'], `duplicate item "${item.id}"`);
      }
      itemIds.add(item.id);
      if (item.kind.length === 0) {
        addIssue(issues, [...base, 'items', itemIndex, 'kind'], 'an item kind must not be empty');
      }
      if (item.status.length === 0) {
        addIssue(
          issues,
          [...base, 'items', itemIndex, 'status'],
          'an item status must not be empty',
        );
      }
      for (const [locale, name] of Object.entries(item.names)) {
        if (name.length === 0) {
          addIssue(
            issues,
            [...base, 'items', itemIndex, 'names', locale],
            'a display name must not be empty',
          );
        }
      }
    });

    const borderIds = new Set<string>();
    pack.borders.forEach((border, borderIndex) => {
      if (borderIds.has(border.id)) {
        addIssue(
          issues,
          [...base, 'borders', borderIndex, 'id'],
          `duplicate border "${border.id}"`,
        );
      }
      borderIds.add(border.id);
      border.points.forEach((point, pointIndex) => {
        for (const message of lngLatIssues(point.lng, point.lat)) {
          addIssue(issues, [...base, 'borders', borderIndex, 'points', pointIndex], message);
        }
      });
    });

    const overrides = new Set<string>();
    pack.factOverrides.forEach((override, overrideIndex) => {
      const key = overrideKey(override);
      if (overrides.has(key)) {
        addIssue(
          issues,
          [...base, 'factOverrides', overrideIndex],
          `duplicate fact override for "${override.item}" / "${override.facet}"`,
        );
      }
      overrides.add(key);
    });
  });

  // Detect missing parents and inheritance cycles. Both make flattening
  // impossible, so the pack must be rejected before the app sees it.
  for (const pack of perspectives) {
    let current: PerspectiveId | null = pack.extends;
    const seen = new Set<PerspectiveId>([pack.id]);
    while (current !== null) {
      if (seen.has(current)) {
        addIssue(
          issues,
          ['perspectives', pack.id, 'extends'],
          `inheritance cycle through "${current}"`,
        );
        break;
      }
      seen.add(current);
      const parent = perspectives.find((candidate) => candidate.id === current);
      if (parent === undefined) {
        addIssue(
          issues,
          ['perspectives', pack.id, 'extends'],
          `missing parent perspective "${current}"`,
        );
        break;
      }
      current = parent.extends;
    }
  }

  return issues;
}

export function perspectiveIssuesAsStrings(issues: readonly PerspectiveIssue[]): readonly string[] {
  return issues.map(
    (issue) => `${issue.path.length === 0 ? '<root>' : issue.path.join('.')}: ${issue.message}`,
  );
}

function flattenedPerspective(pack: ContentPack, perspective: PerspectiveId): PerspectivePack {
  const record = pack.payload.perspectives.find((candidate) => candidate.id === perspective);
  if (record === undefined) {
    throw new Error(`content pack has no perspective "${perspective}"`);
  }
  if (record.extends !== null) {
    throw new Error(`perspective "${perspective}" must be flattened before use`);
  }
  return record;
}

// The engine never reads raw pack content (FE07 behaviour 5). The view exposes
// only one flattened perspective; question generation, wrong options and
// grading share it so they cannot mix perspectives.
export function buildContentView(pack: ContentPack, perspective: PerspectiveId): ContentView {
  const record = flattenedPerspective(pack, perspective);
  const byId = new Map<ItemId, ContentItem>();
  for (const item of record.items) {
    if (byId.has(item.id)) {
      throw new Error(`perspective "${perspective}" contains duplicate item "${item.id}"`);
    }
    byId.set(item.id, item);
  }

  return {
    perspective,

    item(id: ItemId): ContentItem | undefined {
      return byId.get(id);
    },

    itemsOfKind(kind: ItemKind): readonly ContentItem[] {
      return record.items.filter((item) => item.kind === kind);
    },

    // The missing-locale fallback is an open learner-visible spec question
    // (2026-11-18 M1 contracts report). Fail closed rather than invent one.
    displayName(id: ItemId, locale: Locale): string {
      const item = byId.get(id);
      if (item === undefined) {
        throw new Error(`perspective "${perspective}" has no item "${id}"`);
      }
      const name = item.names[locale];
      if (name === undefined) {
        throw new Error(
          `perspective "${perspective}" item "${id}" has no ${locale} name; locale fallback is unresolved`,
        );
      }
      return name;
    },

    borders(): readonly BorderLine[] {
      return record.borders;
    },
  };
}
