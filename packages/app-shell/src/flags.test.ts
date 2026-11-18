import { flagExperimentDefinitionsSchema, type FlagExperimentDefinitions } from '@geo/domain';
import { autoContinueEnabled } from '../../engine/src/flags/index.ts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  complianceOverridesFromSettings,
  FlagResolver,
  resolveFlagSnapshot,
  type FlagOverrides,
} from './flags.ts';
import { testFactory } from './test-helpers.ts';

function definitionsWithFlag(defaultValue: boolean): FlagExperimentDefinitions {
  return flagExperimentDefinitionsSchema.parse({
    flags: [
      {
        id: 'dailyChallenge',
        default: defaultValue,
        description: 'Show the daily challenge slot.',
        owner: 'FE21',
        reviewDate: '2027-05-18',
      },
    ],
    experiments: [],
  });
}

function e01Definitions(version = 1, flagDefault = false): FlagExperimentDefinitions {
  return flagExperimentDefinitionsSchema.parse({
    flags: [
      {
        id: 'autoContinue',
        default: flagDefault,
        description: 'Allow automatic continue between rounds.',
        owner: 'FE27',
        reviewDate: '2027-05-18',
      },
    ],
    experiments: [
      {
        id: 'E01',
        version,
        flag: 'autoContinue',
        register: 'experiments/E01.md',
        variants: [
          { id: 'A', weight: 5000, flagValue: false },
          { id: 'B', weight: 5000, flagValue: true },
        ],
      },
    ],
  });
}

describe('FE03 flag resolution', () => {
  it('AC-03.3 public builds always resolve to default variants and ignore overrides', () => {
    const { identity } = testFactory();
    const definitions = flagExperimentDefinitionsSchema.parse({
      flags: [
        {
          id: 'autoContinue',
          default: true,
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
        {
          id: 'E08',
          version: 1,
          register: 'experiments/E08.md',
          variants: [
            { id: 'A', weight: 5000 },
            { id: 'B', weight: 5000 },
          ],
        },
      ],
    });

    const developer: FlagOverrides = {
      flags: { autoContinue: true },
      experiments: { E01: 'B', E08: 'B' },
    };
    const compliance: FlagOverrides = { experiments: { E01: 'B', E08: 'B' } };

    const resolved = resolveFlagSnapshot({
      definitions,
      channel: 'public',
      installId: identity.installId,
      assignments: {
        E01: { variant: 'B', version: 1 },
        E08: { variant: 'B', version: 1 },
      },
      developer,
      compliance,
    });

    expect(resolved.snapshot.variants).toEqual({ E01: 'A', E08: 'A' });
    expect(resolved.snapshot.sources.E01).toBe('code-default');
    expect(resolved.snapshot.sources.E08).toBe('code-default');
    expect(resolved.pendingAssignments).toEqual([]);
    // The default variant's flag value wins over the pack value.
    expect(resolved.snapshot.flags.autoContinue).toBe(false);
  });

  it('AC-03.4 with "No time pressure" on, E01 can never produce auto-continue', () => {
    const { identity } = testFactory();
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.constantFrom<'A' | 'B'>('A', 'B'),
        (packValue, developerFlag, assignedByExperiment, developerVariant) => {
          const resolved = resolveFlagSnapshot({
            definitions: e01Definitions(1, packValue),
            channel: 'internal',
            installId: identity.installId,
            assignments: assignedByExperiment ? { E01: { variant: 'B', version: 1 } } : {},
            developer: {
              flags: { autoContinue: developerFlag },
              experiments: { E01: developerVariant },
            },
            compliance: complianceOverridesFromSettings({ noTimePressure: true }),
          });

          expect(resolved.snapshot.flags.autoContinue).toBe(false);
          expect(autoContinueEnabled(resolved.snapshot)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('AC-03.5 a flag switched off in a new pack changes at the next pause, not mid-round', () => {
    const { factory, identity } = testFactory();
    const resolver = new FlagResolver({
      factory,
      channel: 'internal',
      installId: identity.installId,
      definitions: definitionsWithFlag(true),
    });
    expect(resolver.isOn('dailyChallenge')).toBe(true);

    const off = definitionsWithFlag(false);
    const midRound = resolver.refreshAtPause({
      definitions: off,
      channel: 'internal',
      roundInProgress: true,
    });
    expect(midRound).toEqual({ status: 'deferred', reason: 'round-in-progress' });
    expect(resolver.isOn('dailyChallenge')).toBe(true);

    const atPause = resolver.refreshAtPause({
      definitions: off,
      channel: 'internal',
      roundInProgress: false,
    });
    expect(atPause.status).toBe('applied');
    expect(resolver.isOn('dailyChallenge')).toBe(false);
    expect(resolver.explain('dailyChallenge')).toBe('pack');
  });

  it('records one assignment and is sticky until the experiment version changes', () => {
    const { factory, identity } = testFactory();
    const assigned: string[] = [];
    const resolver = new FlagResolver({
      factory,
      channel: 'internal',
      installId: identity.installId,
      definitions: e01Definitions(1),
      hooks: {
        onAssigned: (event) => {
          if (event.type === 'ExperimentAssigned') {
            assigned.push(`${event.payload.experimentId}:${String(event.payload.version)}`);
          }
        },
      },
    });

    expect(assigned).toEqual(['E01:1']);
    const variant = resolver.variant('E01');

    const restarted = new FlagResolver({
      factory,
      channel: 'internal',
      installId: identity.installId,
      definitions: e01Definitions(1),
      assignments: { E01: { variant, version: 1 } },
      hooks: {
        onAssigned: (event) => {
          if (event.type === 'ExperimentAssigned') {
            assigned.push(`${event.payload.experimentId}:${String(event.payload.version)}`);
          }
        },
      },
    });
    expect(restarted.variant('E01')).toBe(variant);
    expect(assigned).toEqual(['E01:1']);

    const changed = restarted.refreshAtPause({
      definitions: e01Definitions(2),
      channel: 'internal',
      roundInProgress: false,
    });
    expect(changed.status).toBe('applied');
    if (changed.status === 'applied') {
      expect(changed.events).toHaveLength(1);
      expect(changed.events[0]?.type).toBe('ExperimentAssigned');
      expect(changed.events[0]?.payload).toMatchObject({ experimentId: 'E01', version: 2 });
    }
    expect(assigned).toEqual(['E01:1', 'E01:2']);
  });

  it('logs ExperimentExposed once per session and only for a non-default variant', () => {
    const { factory, identity } = testFactory();
    const exposed: string[] = [];
    const resolver = new FlagResolver({
      factory,
      channel: 'internal',
      installId: identity.installId,
      definitions: e01Definitions(1),
      developer: { experiments: { E01: 'B' } },
      hooks: {
        onExposed: (event) => {
          if (event.type === 'ExperimentExposed') {
            exposed.push(`${event.payload.experimentId}:${event.payload.variant}`);
          }
        },
      },
    });

    expect(resolver.variant('E01')).toBe('B');
    const first = resolver.expose('E01', 'pause');
    expect(first?.type).toBe('ExperimentExposed');
    expect(resolver.expose('E01', 'pause')).toBeNull();
    expect(exposed).toEqual(['E01:B']);
  });

  it('does not expose a default variant', () => {
    const { factory, identity } = testFactory();
    const resolver = new FlagResolver({
      factory,
      channel: 'internal',
      installId: identity.installId,
      definitions: e01Definitions(1),
      developer: { experiments: { E01: 'A' } },
    });
    expect(resolver.expose('E01', 'pause')).toBeNull();
  });

  it('freezes the snapshot the engine receives', () => {
    const { identity } = testFactory();
    const resolved = resolveFlagSnapshot({
      definitions: e01Definitions(),
      channel: 'internal',
      installId: identity.installId,
    });
    expect(Object.isFrozen(resolved.snapshot)).toBe(true);
    expect(Object.isFrozen(resolved.snapshot.flags)).toBe(true);
    expect(Object.isFrozen(resolved.snapshot.variants)).toBe(true);
    expect(Object.isFrozen(resolved.snapshot.sources)).toBe(true);
  });

  it('falls back to the code default when an experiment is removed at the next pause', () => {
    const { factory, identity } = testFactory();
    const resolver = new FlagResolver({
      factory,
      channel: 'internal',
      installId: identity.installId,
      definitions: e01Definitions(1),
      developer: { experiments: { E01: 'B' } },
    });
    expect(resolver.variant('E01')).toBe('B');

    const removed = resolver.refreshAtPause({
      definitions: definitionsWithFlag(false),
      channel: 'internal',
      roundInProgress: false,
    });
    expect(removed.status).toBe('applied');
    expect(resolver.variant('E01')).toBe('A');
    expect(resolver.explain('autoContinue')).toBe('code-default');
  });

  it('ignores imported assignments from another origin before resolution', () => {
    const { identity } = testFactory();
    const resolved = resolveFlagSnapshot({
      definitions: e01Definitions(1),
      channel: 'closed',
      installId: identity.installId,
      assignments: {},
    });
    expect(resolved.pendingAssignments).toHaveLength(1);
  });
});
