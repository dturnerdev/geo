import type { ItemId } from '../../domain/src/ids.ts';

// FE06 placeholder: at most 60 labels on screen (placeholders.md, "Map and atlas").
export const MAX_LABELS_ON_SCREEN = 60;
const LABEL_PADDING_PX = 4;

export interface LabelCandidate {
  readonly item: ItemId;
  readonly text: string;
  readonly fame: number | null;
  readonly anchor: { readonly x: number; readonly y: number };
  readonly size: { readonly width: number; readonly height: number };
}

export interface LabelRectangle {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export interface PlacedLabel {
  readonly item: ItemId;
  readonly text: string;
  readonly anchor: { readonly x: number; readonly y: number };
  readonly rect: LabelRectangle;
}

function fameRank(fame: number | null): number {
  return fame !== null && Number.isFinite(fame) ? fame : Number.NEGATIVE_INFINITY;
}

function compareCandidates(a: LabelCandidate, b: LabelCandidate): number {
  const fameDifference = fameRank(b.fame) - fameRank(a.fame);
  if (fameDifference !== 0 && Number.isFinite(fameDifference)) {
    return fameDifference;
  }
  if (a.fame !== b.fame) {
    // Infinite values and mixed finite/null values still need a stable order.
    return fameRank(b.fame) > fameRank(a.fame) ? 1 : -1;
  }
  return a.item < b.item ? -1 : a.item > b.item ? 1 : 0;
}

function rectangleFor(candidate: LabelCandidate): LabelRectangle {
  const halfWidth = candidate.size.width / 2;
  const halfHeight = candidate.size.height / 2;
  return {
    left: candidate.anchor.x - halfWidth - LABEL_PADDING_PX,
    top: candidate.anchor.y - halfHeight - LABEL_PADDING_PX,
    right: candidate.anchor.x + halfWidth + LABEL_PADDING_PX,
    bottom: candidate.anchor.y + halfHeight + LABEL_PADDING_PX,
  };
}

function intersects(a: LabelRectangle, b: LabelRectangle): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function isFiniteCandidate(candidate: LabelCandidate): boolean {
  return (
    Number.isFinite(candidate.anchor.x) &&
    Number.isFinite(candidate.anchor.y) &&
    Number.isFinite(candidate.size.width) &&
    Number.isFinite(candidate.size.height) &&
    candidate.size.width > 0 &&
    candidate.size.height > 0
  );
}

/**
 * Deterministic label selection (ADR-0001): descending fame, ascending
 * ItemId for ties, null fame last. Labels never move from their anchors.
 */
export function layoutLabels(
  candidates: readonly LabelCandidate[],
  maxLabels = MAX_LABELS_ON_SCREEN,
): readonly PlacedLabel[] {
  if (maxLabels <= 0) {
    return [];
  }

  const ordered = candidates.filter(isFiniteCandidate).slice().sort(compareCandidates);
  const accepted: PlacedLabel[] = [];
  const acceptedRects: LabelRectangle[] = [];

  for (const candidate of ordered) {
    if (accepted.length >= maxLabels) {
      break;
    }
    const rect = rectangleFor(candidate);
    if (acceptedRects.some((existing) => intersects(existing, rect))) {
      continue;
    }
    accepted.push({
      item: candidate.item,
      text: candidate.text,
      anchor: candidate.anchor,
      rect,
    });
    acceptedRects.push(rect);
  }

  return accepted;
}
