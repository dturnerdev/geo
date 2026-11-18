import type { DomainEvent, ItemId } from '../../../domain/src/index.ts';

// Metric vocabulary. Experiment and variant identifiers are plain strings
// until FE03 provides their branded versions.
export type ExperimentId = string;
export type VariantId = string;
export type ItemFacetKey = string;

// FE04 only needs the parts of the content index that affect metrics. The
// content package supplies the full pack; retired items stop counting towards
// durable knowledge but their history still counts everywhere else.
export interface ContentIndex {
  readonly retiredItemIds?: readonly ItemId[];
  readonly retiredItemFacets?: readonly ItemFacetKey[];
}

export interface CalibrationReport {
  readonly logLoss: number;
  readonly rmseBins: number;
}

export interface MetricsReport {
  readonly durableKnowledge: number;
  readonly surpriseAccuracy: number | null;
  readonly efficiencyPerHour: number | null;
  readonly calibration: CalibrationReport | null;
  readonly transfer: number | null;
  readonly byVariant: ReadonlyMap<ExperimentId, ReadonlyMap<VariantId, MetricsReport>>;
}

export interface MetricsInput {
  readonly events: Iterable<DomainEvent>;
  readonly content: ContentIndex;
  readonly now: number;
}

// The canonical key for an item-facet. A missing facet is the item's default
// facet, which keeps older logs (FE01 schema 1) usable.
export function itemFacetKey(itemId: ItemId, facet?: string): ItemFacetKey {
  return facet === undefined || facet === '' ? itemId : `${itemId}#${facet}`;
}
