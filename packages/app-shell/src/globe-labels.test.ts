import { describe, expect, it } from 'vitest';
import { selectVisibleLabels } from './globe-labels.ts';

describe('FE06 label eligibility in app-shell', () => {
  it('passes established items minus the current question items (D121)', () => {
    const visible = selectVisibleLabels({
      established: new Set(['peru', 'chile', 'fiji']),
      questionItems: new Set(['chile']),
    });
    expect([...visible]).toEqual(['peru', 'fiji']);
  });

  it('returns an empty set when nothing is established', () => {
    const visible = selectVisibleLabels({
      established: new Set(),
      questionItems: new Set(['peru']),
    });
    expect(visible.size).toBe(0);
  });

  it('does not mutate the input sets', () => {
    const established = new Set(['peru']);
    const questionItems = new Set<string>();
    const visible = selectVisibleLabels({ established, questionItems });
    expect([...visible]).toEqual(['peru']);
    expect([...established]).toEqual(['peru']);
    expect(questionItems.size).toBe(0);
  });
});
