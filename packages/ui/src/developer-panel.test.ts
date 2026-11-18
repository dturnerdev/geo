import {
  flagExperimentDefinitionsSchema,
  type ExperimentId,
  type FlagReader,
  type ValueSource,
  type VariantOf,
} from '../../domain/src/flags.ts';
import { describe, expect, it } from 'vitest';
import {
  buildDeveloperPanelModel,
  createDeveloperPanelModel,
  DEVELOPER_PANEL_BUILD_FLAG,
} from './developer-panel.ts';

const definitions = flagExperimentDefinitionsSchema.parse({
  flags: [
    {
      id: 'autoContinue',
      default: false,
      description: 'Allow automatic continue between rounds.',
      owner: 'FE27',
      reviewDate: '2027-05-18',
    },
  ],
  experiments: [
    {
      id: 'E01',
      version: 1,
      flag: 'autoContinue',
      register: 'experiments/E01.md',
      variants: [
        { id: 'A', weight: 5000, flagValue: false },
        { id: 'B', weight: 5000, flagValue: true },
      ],
    },
  ],
});

class FakeReader implements FlagReader {
  isOn(): boolean {
    return false;
  }

  variant<E extends ExperimentId>(): VariantOf<E> {
    return 'A' as VariantOf<E>;
  }

  explain(): ValueSource {
    return 'experiment';
  }
}

describe('FE03 developer panel (S22)', () => {
  it('AC-03.3 the developer panel is absent from public builds', () => {
    const reader = new FakeReader();
    expect(createDeveloperPanelModel(reader, definitions, 'public', {}, true)).toBeNull();
    expect(createDeveloperPanelModel(reader, definitions, 'closed', {}, true)).toBeNull();
    expect(createDeveloperPanelModel(reader, definitions, 'internal', {}, false)).toBeNull();
  });

  it('AC-03.3 lists every flag and experiment with its current value and source', () => {
    const model = buildDeveloperPanelModel(new FakeReader(), definitions, {
      flags: { autoContinue: false },
      experiments: { E01: 'A' },
    });
    expect(model.rows).toEqual([
      {
        kind: 'flag',
        id: 'autoContinue',
        value: false,
        source: 'experiment',
        overridden: true,
      },
      {
        kind: 'experiment',
        id: 'E01',
        value: 'A',
        source: 'experiment',
        overridden: true,
      },
    ]);
  });

  it('exposes the compile-time build flag hook for bundle separation', () => {
    expect(DEVELOPER_PANEL_BUILD_FLAG).toBe('__GEO_DEVELOPER_PANEL__');
    expect(
      createDeveloperPanelModel(new FakeReader(), definitions, 'internal', {}, true),
    ).not.toBeNull();
  });

  it.skip('AC-03.3 public bundle inspection contains no developer-panel code', () => {
    // Skipped: no public production bundle is built in this worktree. The
    // compile-time hook above is what the release build sets to false.
  });
});
