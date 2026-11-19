import { describe, expect, it } from 'vitest';
import { createLngLat, type BorderLine } from './geometry.ts';
import {
  parsePackPayload,
  mergePackParts,
  parsePackPart,
  type PackManifest,
} from './pack-schema.ts';
import type { ContentPack } from './content-source.ts';
import {
  buildContentView,
  itemKind,
  perspectiveItemStatus,
  perspectiveIssuesAsStrings,
  validatePerspectivePacks,
  type ContentItem,
  type PerspectivePack,
} from './perspective.ts';

const BORDER: BorderLine = {
  id: 'border.gbr-ir',
  style: 'disputed',
  points: [createLngLat(-8, 54), createLngLat(-6, 55)],
};

function contentItem(
  id: string,
  kind: string,
  status: string,
  names: Partial<Record<'en-GB' | 'en-US', string>>,
): ContentItem {
  return {
    id,
    kind: itemKind(kind),
    status: perspectiveItemStatus(status),
    names,
    fame: 5,
  };
}

const UK: PerspectivePack = {
  id: 'uk',
  extends: null,
  source: 'Natural Earth 1:10m',
  reviewer: 'reviewer:test',
  items: [
    contentItem('country.gbr', 'sovereign', 'sovereign', {
      'en-GB': 'United Kingdom',
      'en-US': 'United Kingdom',
    }),
    contentItem('territory.gib', 'territory', 'territory', {
      'en-GB': 'Gibraltar',
      'en-US': 'Gibraltar',
    }),
  ],
  borders: [BORDER],
  factOverrides: [
    { item: 'country.gbr', facet: 'capital', value: 'London' },
    { item: 'country.gbr', facet: 'drivesOn', value: 'left' },
  ],
};

const US: PerspectivePack = {
  id: 'us',
  extends: null,
  source: 'Natural Earth 1:10m',
  reviewer: 'reviewer:test',
  items: [contentItem('country.usa', 'sovereign', 'sovereign', { 'en-GB': 'United States' })],
  borders: [],
  factOverrides: [],
};

const DEFAULT: PerspectivePack = {
  id: 'default',
  extends: null,
  source: 'Natural Earth 1:10m',
  reviewer: 'reviewer:test',
  items: [contentItem('disputed.example', 'disputed', 'disputed', { 'en-GB': 'Example' })],
  borders: [],
  factOverrides: [],
};

const MANIFEST: PackManifest = {
  formatVersion: 1,
  packVersion: 'test',
  dataFormat: '1',
  createdAt: 0,
  chunks: [{ sha256: '0'.repeat(64) }],
  signature: { keyId: 'test', value: 'signature' },
};

function packWith(perspectives: readonly PerspectivePack[]): ContentPack {
  return {
    packVersion: 'test',
    dataFormat: '1',
    manifest: MANIFEST,
    payload: parsePackPayload({ perspectives }),
    chunks: [],
  };
}

describe('FE07 ContentView', () => {
  it('exposes only items, names and borders from the active perspective', () => {
    const pack = packWith([UK, US, DEFAULT]);
    const uk = buildContentView(pack, 'uk');
    const us = buildContentView(pack, 'us');

    expect(uk.perspective).toBe('uk');
    expect(uk.item('country.gbr')?.names['en-GB']).toBe('United Kingdom');
    expect(uk.item('country.usa')).toBeUndefined();
    expect(us.item('country.gbr')).toBeUndefined();
    expect(us.item('country.usa')?.status).toBe('sovereign');

    expect(uk.itemsOfKind(itemKind('sovereign')).map((item) => item.id)).toEqual(['country.gbr']);
    expect(uk.itemsOfKind(itemKind('territory')).map((item) => item.id)).toEqual(['territory.gib']);
    expect(us.itemsOfKind(itemKind('territory'))).toEqual([]);

    expect(uk.displayName('country.gbr', 'en-GB')).toBe('United Kingdom');
    expect(uk.displayName('country.gbr', 'en-US')).toBe('United Kingdom');
    expect(uk.borders()).toEqual([BORDER]);
    expect(us.borders()).toEqual([]);
  });

  it('fails closed when the requested locale is absent instead of inventing a fallback', () => {
    const us = buildContentView(packWith([UK, US, DEFAULT]), 'us');

    expect(() => us.displayName('country.usa', 'en-US')).toThrow(/locale fallback is unresolved/u);
  });

  it('rejects a pack that has no record for the requested perspective', () => {
    expect(() => buildContentView(packWith([UK]), 'us')).toThrow(/no perspective "us"/u);
  });

  it('rejects an unflattened perspective rather than mixing inheritance at runtime', () => {
    const child: PerspectivePack = { ...US, extends: 'uk' };

    expect(() => buildContentView(packWith([UK, child]), 'us')).toThrow(/must be flattened/u);
  });

  it('builds deterministically for the same pack and perspective', () => {
    const pack = packWith([UK, US, DEFAULT]);
    const first = buildContentView(pack, 'uk');
    const second = buildContentView(pack, 'uk');

    expect(first.perspective).toBe(second.perspective);
    expect(first.itemsOfKind(itemKind('sovereign'))).toEqual(
      second.itemsOfKind(itemKind('sovereign')),
    );
    expect(first.borders()).toEqual(second.borders());
  });

  it('merges perspective records from pack chunks before building a view', () => {
    const merged = mergePackParts([
      parsePackPart({ perspectives: [UK] }),
      parsePackPart({ perspectives: [US, DEFAULT] }),
    ]);
    const pack: ContentPack = {
      packVersion: 'test',
      dataFormat: '1',
      manifest: MANIFEST,
      payload: parsePackPayload(merged),
      chunks: [],
    };

    expect(pack.payload.perspectives.map((record) => record.id)).toEqual(['uk', 'us', 'default']);
    expect(buildContentView(pack, 'us').item('country.usa')?.id).toBe('country.usa');
  });
});

describe('FE07 perspective pack validation', () => {
  it('accepts complete perspective records', () => {
    expect(validatePerspectivePacks([UK, US, DEFAULT])).toEqual([]);
  });

  it('rejects duplicate perspective ids, items, borders and fact overrides', () => {
    const duplicatePerspective: PerspectivePack = { ...UK };
    const duplicateItem: PerspectivePack = {
      ...UK,
      items: [...UK.items, UK.items[0] ?? UK.items[0]!],
    };
    const duplicateBorder: PerspectivePack = { ...UK, borders: [BORDER, BORDER] };
    const duplicateOverride: PerspectivePack = {
      ...UK,
      factOverrides: [
        { item: 'country.gbr', facet: 'capital', value: 'London' },
        { item: 'country.gbr', facet: 'capital', value: 'Paris' },
      ],
    };

    const messages = perspectiveIssuesAsStrings(
      validatePerspectivePacks([
        UK,
        duplicatePerspective,
        duplicateItem,
        duplicateBorder,
        duplicateOverride,
      ]),
    ).join('\n');

    expect(messages).toContain('duplicate perspective "uk"');
    expect(messages).toContain('duplicate item "country.gbr"');
    expect(messages).toContain('duplicate border "border.gbr-ir"');
    expect(messages).toContain('duplicate fact override for "country.gbr" / "capital"');
  });

  it('rejects missing parents and inheritance cycles', () => {
    const missingParent: PerspectivePack = { ...US, extends: 'uk' };
    const first: PerspectivePack = { ...UK, extends: 'us' };
    const second: PerspectivePack = { ...US, extends: 'uk' };

    expect(
      perspectiveIssuesAsStrings(validatePerspectivePacks([missingParent])).join('\n'),
    ).toContain('missing parent perspective "uk"');
    expect(
      perspectiveIssuesAsStrings(validatePerspectivePacks([first, second])).join('\n'),
    ).toContain('inheritance cycle');
    expect(
      perspectiveIssuesAsStrings(validatePerspectivePacks([{ ...UK, extends: 'uk' }])).join('\n'),
    ).toContain('cannot extend itself');
  });

  it('makes the signed pack payload validator reject invalid perspective records', () => {
    expect(() => parsePackPayload({ perspectives: [{ ...UK, source: '' }] })).toThrow(/source/u);
    expect(() => parsePackPayload({ perspectives: [UK, UK] })).toThrow(/duplicate perspective/u);
  });
});
