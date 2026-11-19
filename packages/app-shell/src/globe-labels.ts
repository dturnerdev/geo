import type { ItemId } from '@geo/domain';

export interface VisibleLabelInput {
  /** Items whose name facet is established (FE08 supplies this set). */
  readonly established: ReadonlySet<ItemId>;
  /** Items in the current question are always hidden (D121). */
  readonly questionItems: ReadonlySet<ItemId>;
}

/**
 * app-shell owns label eligibility (D121, ADR-0001). The globe receives only
 * the resulting set and never applies label rules itself (FE06 Behaviour 8).
 */
export function selectVisibleLabels(input: VisibleLabelInput): ReadonlySet<ItemId> {
  const visible = new Set<ItemId>();
  for (const item of input.established) {
    if (!input.questionItems.has(item)) {
      visible.add(item);
    }
  }
  return visible;
}
