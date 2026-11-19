import { describe, expect, it } from 'vitest';
import { layoutLabels, MAX_LABELS_ON_SCREEN } from './label-layout.ts';
import type { LabelCandidate } from './label-layout.ts';

function candidate(
  item: string,
  fame: number | null,
  x: number,
  y = 0,
  width = 20,
  height = 10,
): LabelCandidate {
  return { item, text: item, fame, anchor: { x, y }, size: { width, height } };
}

describe('FE06 label layout', () => {
  it('AC-06.9 with an empty visible-label set, no labels are drawn', () => {
    expect(layoutLabels([])).toEqual([]);
  });

  it('orders by fame, breaks ties by ItemId and treats null fame as lowest', () => {
    const placed = layoutLabels([
      candidate('unknown', null, 0),
      candidate('b', 5, 100),
      candidate('a', 5, 200),
      candidate('top', 9, 300),
    ]);
    expect(placed.map((label) => label.item)).toEqual(['top', 'a', 'b', 'unknown']);
  });

  it('drops overlapping lower-priority labels and never moves an anchor', () => {
    const placed = layoutLabels([
      candidate('high', 9, 100, 100),
      candidate('low', 1, 101, 100),
      candidate('other', 2, 400, 100),
    ]);
    expect(placed.map((label) => label.item)).toEqual(['high', 'other']);
    expect(placed[0]?.anchor).toEqual({ x: 100, y: 100 });
  });

  it('caps the number of labels at the FE06 placeholder', () => {
    const many = Array.from({ length: 80 }, (_, index) =>
      candidate(`item-${index}`, index, index * 200),
    );
    expect(layoutLabels(many)).toHaveLength(MAX_LABELS_ON_SCREEN);
    expect(MAX_LABELS_ON_SCREEN).toBe(60);
  });
});
