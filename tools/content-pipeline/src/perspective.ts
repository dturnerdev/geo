import type { PerspectiveId } from '../../../packages/domain/src/perspective.ts';
import {
  validatePerspectivePacks,
  type ContentItem,
  type PerspectiveFactOverride,
  type PerspectiveIssue,
  type PerspectivePack,
} from '../../../packages/content/src/perspective.ts';
import type { BorderLine } from '../../../packages/content/src/geometry.ts';

// FE07 behaviour 3 and 04 §8.1: the pipeline flattens inheritance so the app
// only ever sees complete perspectives. Provenance is required for every
// perspective in the chain, and no learner-visible content is chosen here.
export interface PerspectivePipelineError {
  readonly kind: 'invalid-perspective';
  readonly issues: readonly PerspectiveIssue[];
}

export type PerspectivePipelineResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: PerspectivePipelineError };

function failure(issues: readonly PerspectiveIssue[]): {
  readonly ok: false;
  readonly error: PerspectivePipelineError;
} {
  return { ok: false, error: { kind: 'invalid-perspective', issues } };
}

function chainFor(
  byId: ReadonlyMap<PerspectiveId, PerspectivePack>,
  id: PerspectiveId,
): readonly PerspectivePack[] {
  const chain: PerspectivePack[] = [];
  const seen = new Set<PerspectiveId>();
  let current: PerspectiveId | null = id;
  while (current !== null && !seen.has(current)) {
    const pack = byId.get(current);
    if (pack === undefined) {
      break;
    }
    seen.add(current);
    chain.unshift(pack);
    current = pack.extends;
  }
  return chain;
}

function mergeRecords(
  chain: readonly PerspectivePack[],
): Pick<PerspectivePack, 'items' | 'borders' | 'factOverrides'> {
  const items = new Map<string, ContentItem>();
  const borders = new Map<string, BorderLine>();
  const overrides = new Map<string, PerspectiveFactOverride>();

  for (const pack of chain) {
    for (const item of pack.items) {
      items.set(item.id, item);
    }
    for (const border of pack.borders) {
      borders.set(border.id, border);
    }
    for (const override of pack.factOverrides) {
      overrides.set(`${override.item}\u0000${override.facet}`, override);
    }
  }

  return {
    items: [...items.values()],
    borders: [...borders.values()],
    factOverrides: [...overrides.values()],
  };
}

/** Flatten one perspective, inheriting its parent's records first. */
export function flattenPerspective(
  perspectives: readonly PerspectivePack[],
  id: PerspectiveId,
): PerspectivePipelineResult<PerspectivePack> {
  const issues = validatePerspectivePacks(perspectives);
  if (issues.length > 0) {
    return failure(issues);
  }

  const byId = new Map(perspectives.map((pack) => [pack.id, pack] as const));
  const target = byId.get(id);
  if (target === undefined) {
    return failure([{ path: ['perspectives'], message: `missing perspective "${id}"` }]);
  }

  const chain = chainFor(byId, id);
  return {
    ok: true,
    value: {
      id: target.id,
      extends: null,
      source: target.source,
      reviewer: target.reviewer,
      ...mergeRecords(chain),
    },
  };
}

/** Flatten every perspective in the pack, preserving input order. */
export function flattenPerspectives(
  perspectives: readonly PerspectivePack[],
): PerspectivePipelineResult<readonly PerspectivePack[]> {
  const issues = validatePerspectivePacks(perspectives);
  if (issues.length > 0) {
    return failure(issues);
  }

  const byId = new Map(perspectives.map((pack) => [pack.id, pack] as const));
  const flattened: PerspectivePack[] = [];
  for (const pack of perspectives) {
    const target = byId.get(pack.id);
    if (target === undefined) {
      continue;
    }
    flattened.push({
      id: target.id,
      extends: null,
      source: target.source,
      reviewer: target.reviewer,
      ...mergeRecords(chainFor(byId, pack.id)),
    });
  }
  return { ok: true, value: flattened };
}
