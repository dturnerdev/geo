import type {
  BuildChannel,
  ExperimentId,
  FeatureFlagId,
  FlagExperimentDefinitions,
  FlagReader,
  ValueSource,
  VariantId,
} from '../../domain/src/flags.ts';

// Build tools replace this global with the literal true only for internal and
// closed builds. When it is false or absent, the panel factory returns null and
// bundlers can drop this module from public builds (FE03 behaviour 7, AC-03.3).
export const DEVELOPER_PANEL_BUILD_FLAG = '__GEO_DEVELOPER_PANEL__';

declare const __GEO_DEVELOPER_PANEL__: boolean | undefined;

export function developerPanelCompiledIn(): boolean {
  return typeof __GEO_DEVELOPER_PANEL__ !== 'undefined' && __GEO_DEVELOPER_PANEL__ === true;
}

export interface DeveloperPanelOverrides {
  readonly flags?: Readonly<Record<FeatureFlagId, boolean>>;
  readonly experiments?: Readonly<Record<ExperimentId, VariantId>>;
}

export type DeveloperPanelRow =
  | {
      readonly kind: 'flag';
      readonly id: FeatureFlagId;
      readonly value: boolean;
      readonly source: ValueSource;
      readonly overridden: boolean;
    }
  | {
      readonly kind: 'experiment';
      readonly id: ExperimentId;
      readonly value: VariantId;
      readonly source: ValueSource;
      readonly overridden: boolean;
    };

export interface DeveloperPanelModel {
  readonly rows: readonly DeveloperPanelRow[];
}

// Pure view model for S22. It only reads through FlagReader, so the panel can
// never become a second source of truth for a value (FE03 behaviour 7).
export function buildDeveloperPanelModel(
  reader: FlagReader,
  definitions: FlagExperimentDefinitions,
  overrides: DeveloperPanelOverrides = {},
): DeveloperPanelModel {
  const rows: DeveloperPanelRow[] = [];

  for (const flag of definitions.flags) {
    rows.push({
      kind: 'flag',
      id: flag.id,
      value: reader.isOn(flag.id),
      source: reader.explain(flag.id),
      overridden: overrides.flags?.[flag.id] !== undefined,
    });
  }

  for (const experiment of definitions.experiments) {
    rows.push({
      kind: 'experiment',
      id: experiment.id,
      value: reader.variant(experiment.id),
      source: reader.explain(experiment.id),
      overridden: overrides.experiments?.[experiment.id] !== undefined,
    });
  }

  return { rows };
}

export function createDeveloperPanelModel(
  reader: FlagReader,
  definitions: FlagExperimentDefinitions,
  channel: BuildChannel,
  overrides: DeveloperPanelOverrides = {},
  compiledIn = developerPanelCompiledIn(),
): DeveloperPanelModel | null {
  if (!compiledIn || channel !== 'internal') {
    return null;
  }
  return buildDeveloperPanelModel(reader, definitions, overrides);
}
