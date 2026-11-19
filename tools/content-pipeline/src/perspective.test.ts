import { describe, expect, it } from 'vitest';
import { createLngLat, type BorderLine } from '../../../packages/content/src/geometry.ts';
import {
  itemKind,
  perspectiveItemStatus,
  perspectiveIssuesAsStrings,
  type ContentItem,
  type PerspectivePack,
} from '../../../packages/content/src/perspective.ts';
import { flattenPerspective, flattenPerspectives } from './perspective.ts';

const PARENT_BORDER: BorderLine = {
  id: 'border.gbr-irl',
  style: 'agreed',
  points: [createLngLat(-6, 54), createLngLat(-6, 55)],
};

const CHILD_BORDER: BorderLine = {
  id: 'border.claim',
  style: 'claim',
  points: [createLngLat(-5, 54), createLngLat(-5, 55)],
};

function item(id: string, status: string, name: string): ContentItem {
  return {
    id,
    kind: itemKind('sovereign'),
    status: perspectiveItemStatus(status),
    names: { 'en-GB': name, 'en-US': name },
    fame: 1,
  };
}

const PARENT: PerspectivePack = {
  id: 'uk',
  extends: null,
  source: 'Natural Earth 1:10m',
  reviewer: 'reviewer:one',
  items: [
    item('country.gbr', 'sovereign', 'United Kingdom'),
    item('territory.gib', 'territory', 'Gibraltar'),
  ],
  borders: [PARENT_BORDER],
  factOverrides: [{ item: 'country.gbr', facet: 'capital', value: 'London' }],
};

const CHILD: PerspectivePack = {
  id: 'us',
  extends: 'uk',
  source: 'Natural Earth 1:10m',
  reviewer: 'reviewer:two',
  items: [
    item('country.gbr', 'territory', 'Britain'),
    item('country.usa', 'sovereign', 'United States'),
  ],
  borders: [{ ...PARENT_BORDER, style: 'disputed' }, CHILD_BORDER],
  factOverrides: [{ item: 'country.gbr', facet: 'drivesOn', value: 'left' }],
};

const DEFAULT: PerspectivePack = {
  id: 'default',
  extends: null,
  source: 'Natural Earth 1:10m',
  reviewer: 'reviewer:three',
  items: [item('country.fra', 'sovereign', 'France')],
  borders: [],
  factOverrides: [],
};

describe('FE07 perspective pipeline', () => {
  it('flattens inheritance so the app only sees complete perspectives', () => {
    const result = flattenPerspective([PARENT, CHILD, DEFAULT], 'us');
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(JSON.stringify(result.error.issues));
    }

    expect(result.value.id).toBe('us');
    expect(result.value.extends).toBeNull();
    expect(result.value.source).toBe(CHILD.source);
    expect(result.value.reviewer).toBe(CHILD.reviewer);
    expect(result.value.items.map((entry) => [entry.id, entry.status])).toEqual([
      ['country.gbr', 'territory'],
      ['territory.gib', 'territory'],
      ['country.usa', 'sovereign'],
    ]);
    expect(result.value.borders.map((border) => [border.id, border.style])).toEqual([
      ['border.gbr-irl', 'disputed'],
      ['border.claim', 'claim'],
    ]);
    expect(result.value.factOverrides).toEqual([
      { item: 'country.gbr', facet: 'capital', value: 'London' },
      { item: 'country.gbr', facet: 'drivesOn', value: 'left' },
    ]);
  });

  it('flattens every perspective deterministically and leaves the input untouched', () => {
    const before = JSON.stringify([PARENT, CHILD, DEFAULT]);
    const first = flattenPerspectives([PARENT, CHILD, DEFAULT]);
    const second = flattenPerspectives([PARENT, CHILD, DEFAULT]);

    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    if (!first.ok) {
      throw new Error(JSON.stringify(first.error.issues));
    }
    expect(first.value.map((pack) => pack.id)).toEqual(['uk', 'us', 'default']);
    expect(first.value.every((pack) => pack.extends === null)).toBe(true);
    expect(JSON.stringify([PARENT, CHILD, DEFAULT])).toBe(before);
  });

  it('AC-07.7 the pipeline rejects a perspective change that has no source or reviewer', () => {
    const missingSource: PerspectivePack = { ...CHILD, source: '   ' };
    const missingReviewer: PerspectivePack = { ...CHILD, reviewer: '' };

    const sourceResult = flattenPerspectives([PARENT, missingSource]);
    expect(sourceResult.ok).toBe(false);
    if (sourceResult.ok) {
      throw new Error('expected invalid perspective');
    }
    expect(JSON.stringify(sourceResult.error.issues)).toContain('non-empty source');

    const reviewerResult = flattenPerspective([PARENT, missingReviewer], 'us');
    expect(reviewerResult.ok).toBe(false);
    if (reviewerResult.ok) {
      throw new Error('expected invalid perspective');
    }
    expect(JSON.stringify(reviewerResult.error.issues)).toContain('non-empty reviewer');
  });

  it('rejects missing parents and cycles before flattening', () => {
    const missingParent: PerspectivePack = { ...CHILD, extends: 'default' };
    const cycleParent: PerspectivePack = { ...PARENT, extends: 'us' };

    const missing = flattenPerspectives([missingParent]);
    expect(missing.ok).toBe(false);
    if (missing.ok) {
      throw new Error('expected invalid perspective');
    }
    expect(JSON.stringify(missing.error.issues)).toContain('missing parent perspective');
    expect(perspectiveIssuesAsStrings(missing.error.issues).join('\n')).toContain(
      'missing parent perspective "default"',
    );

    const cycle = flattenPerspectives([cycleParent, CHILD]);
    expect(cycle.ok).toBe(false);
    if (cycle.ok) {
      throw new Error('expected invalid perspective');
    }
    expect(JSON.stringify(cycle.error.issues)).toContain('inheritance cycle');
  });

  it.skip('AC-07.8 the flattened uk and us perspectives match a reviewed golden fixture', () => {
    // Skipped: content/perspectives/*.toml and the reviewed golden fixture are a
    // blocked M1 setup task. The four learner-visible choices recorded in the
    // merged contracts report are unresolved, so no fixture is invented here.
  });
});
