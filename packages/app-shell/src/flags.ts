import type {
  BuildChannel,
  DomainEvent,
  ExperimentDefinition,
  ExperimentId,
  FeatureFlagId,
  FlagExperimentDefinitions,
  FlagReader,
  FlagSnapshot,
  InstallId,
  ProjectedState,
  ValueSource,
  VariantId,
  VariantOf,
} from '@geo/domain';
import {
  assignExperimentVariant,
  AUTO_CONTINUE_FLAG,
  CODE_FLAG_DEFAULTS,
  codeDefaultFlag,
  defaultVariantFor,
} from '../../engine/src/flags/index.ts';
import type { EventFactory } from './event-factory.ts';

export interface FlagOverrides {
  readonly flags?: Readonly<Record<FeatureFlagId, boolean>>;
  readonly experiments?: Readonly<Record<ExperimentId, VariantId>>;
}

export interface RecordedAssignment {
  readonly variant: VariantId;
  readonly version: number;
}

export interface PendingAssignment extends RecordedAssignment {
  readonly experimentId: ExperimentId;
}

export interface FlagResolutionOptions {
  readonly definitions: FlagExperimentDefinitions;
  readonly channel: BuildChannel;
  readonly installId: InstallId;
  readonly assignments?: Readonly<Record<ExperimentId, RecordedAssignment>>;
  readonly developer?: FlagOverrides;
  readonly compliance?: FlagOverrides;
  readonly codeFlags?: Readonly<Record<FeatureFlagId, boolean>>;
}

export interface FlagResolution {
  readonly snapshot: FlagSnapshot;
  readonly pendingAssignments: readonly PendingAssignment[];
}

export interface ComplianceSettings {
  readonly noTimePressure: boolean;
}

// D158: "No time pressure" is a compliance override, above every experiment.
export function complianceOverridesFromSettings(settings: ComplianceSettings): FlagOverrides {
  return settings.noTimePressure ? { flags: { [AUTO_CONTINUE_FLAG]: false } } : {};
}

// Imported ExperimentAssigned events from another origin never reach the
// projection (D164), so this only carries this install's assignments.
export function assignmentsFromProjection(
  state: ProjectedState,
): Readonly<Record<ExperimentId, RecordedAssignment>> {
  const assignments: Record<ExperimentId, RecordedAssignment> = {};
  for (const [experimentId, value] of Object.entries(state.experiments)) {
    assignments[experimentId] = { variant: value.variant, version: value.version };
  }
  return assignments;
}

function hasVariant(experiment: ExperimentDefinition, variant: VariantId | undefined): boolean {
  return variant !== undefined && experiment.variants.some((entry) => entry.id === variant);
}

function freezeSnapshot(snapshot: FlagSnapshot): FlagSnapshot {
  return Object.freeze({
    channel: snapshot.channel,
    flags: Object.freeze({ ...snapshot.flags }),
    variants: Object.freeze({ ...snapshot.variants }),
    sources: Object.freeze({ ...snapshot.sources }),
  });
}

interface ResolvedExperiment {
  readonly variant: VariantId;
  readonly source: ValueSource;
  readonly pending: PendingAssignment | null;
}

function resolveExperiment(
  experiment: ExperimentDefinition,
  options: FlagResolutionOptions,
): ResolvedExperiment {
  const complianceVariant = options.compliance?.experiments?.[experiment.id];
  if (options.channel !== 'public' && hasVariant(experiment, complianceVariant)) {
    return {
      variant: complianceVariant as VariantId,
      source: 'compliance',
      pending: null,
    };
  }

  const developerVariant = options.developer?.experiments?.[experiment.id];
  if (options.channel === 'internal' && hasVariant(experiment, developerVariant)) {
    return {
      variant: developerVariant as VariantId,
      source: 'developer-override',
      pending: null,
    };
  }

  // Public builds always get the default variant, whatever assignments or
  // overrides are present (FE03 behaviour 2, AC-03.3).
  if (options.channel === 'public') {
    return {
      variant: defaultVariantFor(experiment),
      source: 'code-default',
      pending: null,
    };
  }

  const recorded = options.assignments?.[experiment.id];
  if (
    recorded !== undefined &&
    recorded.version === experiment.version &&
    hasVariant(experiment, recorded.variant)
  ) {
    return {
      variant: recorded.variant,
      source: 'experiment',
      pending: null,
    };
  }

  const assigned = assignExperimentVariant(
    options.installId,
    experiment.id,
    experiment.version,
    experiment.variants,
  );
  return {
    variant: assigned,
    source: 'experiment',
    pending: {
      experimentId: experiment.id,
      variant: assigned,
      version: experiment.version,
    },
  };
}

function resolveFlag(
  flagId: FeatureFlagId,
  definitions: FlagExperimentDefinitions,
  variants: Readonly<Record<ExperimentId, VariantId>>,
  options: FlagResolutionOptions,
): { readonly value: boolean; readonly source: ValueSource } {
  const complianceValue = options.compliance?.flags?.[flagId];
  if (complianceValue !== undefined) {
    return { value: complianceValue, source: 'compliance' };
  }

  const developerValue = options.developer?.flags?.[flagId];
  if (options.channel === 'internal' && developerValue !== undefined) {
    return { value: developerValue, source: 'developer-override' };
  }

  const linkedExperiment = definitions.experiments.find((experiment) => experiment.flag === flagId);
  if (linkedExperiment !== undefined) {
    const variant = variants[linkedExperiment.id];
    const flagValue = linkedExperiment.variants.find((entry) => entry.id === variant)?.flagValue;
    if (flagValue !== undefined) {
      return { value: flagValue, source: 'experiment' };
    }
  }

  const packFlag = definitions.flags.find((flag) => flag.id === flagId);
  if (packFlag !== undefined) {
    return { value: packFlag.default, source: 'pack' };
  }

  const codeFlags = options.codeFlags;
  if (codeFlags !== undefined && codeFlags[flagId] !== undefined) {
    return { value: codeFlags[flagId], source: 'code-default' };
  }

  return { value: codeDefaultFlag(flagId), source: 'code-default' };
}

// Resolves one immutable snapshot. app-shell is the only package that reads
// packs, the channel and assignment events; the engine receives this snapshot
// (FE03 Interfaces, 07 §4).
export function resolveFlagSnapshot(options: FlagResolutionOptions): FlagResolution {
  const variants: Record<ExperimentId, VariantId> = {};
  const sources: Record<string, ValueSource> = {};
  const pendingAssignments: PendingAssignment[] = [];

  for (const experiment of options.definitions.experiments) {
    const resolved = resolveExperiment(experiment, options);
    variants[experiment.id] = resolved.variant;
    sources[experiment.id] = resolved.source;
    if (resolved.pending !== null) {
      pendingAssignments.push(resolved.pending);
    }
  }

  const flagIds = new Set<FeatureFlagId>(Object.keys(CODE_FLAG_DEFAULTS));
  for (const flag of options.definitions.flags) {
    flagIds.add(flag.id);
  }
  for (const flagId of Object.keys(options.codeFlags ?? {})) {
    flagIds.add(flagId);
  }

  const flags: Record<FeatureFlagId, boolean> = {};
  for (const flagId of flagIds) {
    const resolved = resolveFlag(flagId, options.definitions, variants, options);
    flags[flagId] = resolved.value;
    sources[flagId] = resolved.source;
  }

  return {
    snapshot: freezeSnapshot({
      channel: options.channel,
      flags,
      variants,
      sources,
    }),
    pendingAssignments,
  };
}

export interface FlagLifecycleHooks {
  readonly onAssigned?: (event: DomainEvent) => void;
  readonly onExposed?: (event: DomainEvent) => void;
}

export interface FlagResolverOptions extends FlagResolutionOptions {
  readonly factory: EventFactory;
  readonly hooks?: FlagLifecycleHooks;
}

export interface FlagRefreshInput extends Omit<FlagResolutionOptions, 'installId' | 'assignments'> {
  readonly roundInProgress: boolean;
}

export type FlagRefreshOutcome =
  | {
      readonly status: 'applied';
      readonly snapshot: FlagSnapshot;
      readonly events: readonly DomainEvent[];
    }
  | { readonly status: 'deferred'; readonly reason: 'round-in-progress' };

// Holds the snapshot that the current round uses. Changes from a new pack are
// only resolved at a pause, never mid-round (FE03 behaviour 6, D163).
export class FlagResolver implements FlagReader {
  private readonly factory: EventFactory;
  private readonly hooks: FlagLifecycleHooks;
  private readonly installId: InstallId;
  private assignments: Record<ExperimentId, RecordedAssignment>;
  private definitions: FlagExperimentDefinitions;
  private channel: BuildChannel;
  private developer: FlagOverrides;
  private compliance: FlagOverrides;
  private codeFlags: Readonly<Record<FeatureFlagId, boolean>>;
  private snapshot: FlagSnapshot;
  private readonly exposed = new Set<ExperimentId>();

  constructor(options: FlagResolverOptions) {
    this.factory = options.factory;
    this.hooks = options.hooks ?? {};
    this.installId = options.installId;
    this.assignments = { ...options.assignments };
    this.definitions = options.definitions;
    this.channel = options.channel;
    this.developer = options.developer ?? {};
    this.compliance = options.compliance ?? {};
    this.codeFlags = options.codeFlags ?? {};

    const resolved = resolveFlagSnapshot(this.currentInput());
    this.snapshot = resolved.snapshot;
    this.rememberAssignments(resolved.pendingAssignments);
    this.emitAssignments(resolved.pendingAssignments);
  }

  isOn(flag: FeatureFlagId): boolean {
    return this.snapshot.flags[flag] ?? false;
  }

  variant<E extends ExperimentId>(experiment: E): VariantOf<E> {
    return (this.snapshot.variants[experiment] ?? 'A') as VariantOf<E>;
  }

  explain(flagOrExperiment: string): ValueSource {
    return this.snapshot.sources[flagOrExperiment] ?? 'unknown';
  }

  currentSnapshot(): FlagSnapshot {
    return this.snapshot;
  }

  refreshAtPause(input: FlagRefreshInput): FlagRefreshOutcome {
    if (input.roundInProgress) {
      return { status: 'deferred', reason: 'round-in-progress' };
    }

    this.definitions = input.definitions;
    this.channel = input.channel;
    this.developer = input.developer ?? {};
    this.compliance = input.compliance ?? {};
    this.codeFlags = input.codeFlags ?? {};

    const resolved = resolveFlagSnapshot(this.currentInput());
    this.snapshot = resolved.snapshot;
    this.rememberAssignments(resolved.pendingAssignments);
    const events = this.emitAssignments(resolved.pendingAssignments);
    return { status: 'applied', snapshot: resolved.snapshot, events };
  }

  // ExperimentExposed is logged at most once per session, and only when the
  // variant differs from the public default (FE03 behaviour 5).
  expose(experiment: ExperimentId, surface: string): DomainEvent | null {
    const definition = this.definitions.experiments.find((entry) => entry.id === experiment);
    if (definition === undefined) {
      return null;
    }
    const variant = this.snapshot.variants[experiment];
    if (variant === undefined || variant === defaultVariantFor(definition)) {
      return null;
    }
    if (this.exposed.has(experiment)) {
      return null;
    }

    this.exposed.add(experiment);
    const event = this.factory.create('ExperimentExposed', {
      experimentId: experiment,
      variant,
      surface,
    });
    this.hooks.onExposed?.(event);
    return event;
  }

  private currentInput(): FlagResolutionOptions {
    return {
      definitions: this.definitions,
      channel: this.channel,
      installId: this.installId,
      assignments: this.assignments,
      developer: this.developer,
      compliance: this.compliance,
      codeFlags: this.codeFlags,
    };
  }

  private rememberAssignments(pending: readonly PendingAssignment[]): void {
    for (const assignment of pending) {
      this.assignments[assignment.experimentId] = {
        variant: assignment.variant,
        version: assignment.version,
      };
    }
  }

  private emitAssignments(pending: readonly PendingAssignment[]): readonly DomainEvent[] {
    return pending.map((assignment) => {
      const event = this.factory.create('ExperimentAssigned', {
        experimentId: assignment.experimentId,
        variant: assignment.variant,
        version: assignment.version,
      });
      this.hooks.onAssigned?.(event);
      return event;
    });
  }
}
