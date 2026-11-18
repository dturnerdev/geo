import { z } from 'zod';
import type { MetricsReport } from '../../engine/src/metrics/index.ts';

export type BuildChannel = 'internal' | 'closed' | 'public';

export interface SummaryMeta {
  readonly appVersion: string;
  readonly packVersion: string;
  readonly buildChannel: BuildChannel;
  readonly platform: string;
  readonly osMajorVersion: number;
  readonly experimentVariants: Readonly<Record<string, string>>;
  readonly counts: {
    readonly answers: number;
    readonly rounds: number;
    readonly activeDays: number;
  };
}

// Counts are shared in fixed buckets, never as exact figures (FE04 item 8).
export type CountBucket = '0' | '1-9' | '10-49' | '50-199' | '200+';

export interface SummaryCalibration {
  readonly logLoss: number;
  readonly rmseBins: number;
}

export interface SummaryMetrics {
  readonly durableKnowledge: number;
  readonly surpriseAccuracy: number | null;
  readonly efficiencyPerHour: number | null;
  readonly calibration: SummaryCalibration | null;
  readonly transfer: number | null;
  readonly byVariant: readonly {
    readonly experimentId: string;
    readonly variants: readonly {
      readonly variantId: string;
      readonly metrics: SummaryMetrics;
    }[];
  }[];
}

export interface TesterSummary {
  readonly appVersion: string;
  readonly packVersion: string;
  readonly buildChannel: BuildChannel;
  readonly platform: string;
  readonly osMajorVersion: number;
  readonly experimentVariants: Readonly<Record<string, string>>;
  readonly metrics: SummaryMetrics;
  readonly counts: {
    readonly answers: CountBucket;
    readonly rounds: CountBucket;
    readonly activeDays: CountBucket;
  };
}

// "Share a summary" is only in internal and closed builds (D151, AC-04.10).
export function isSummaryShareAvailable(channel: BuildChannel): boolean {
  return channel !== 'public';
}

export function countBucket(value: number): CountBucket {
  if (value <= 0) {
    return '0';
  }
  if (value <= 9) {
    return '1-9';
  }
  if (value <= 49) {
    return '10-49';
  }
  if (value <= 199) {
    return '50-199';
  }
  return '200+';
}

const calibrationSchema = z
  .object({
    logLoss: z.number(),
    rmseBins: z.number(),
  })
  .strict();

// Recursive because each per-variant report has the same shape (FE04).
const summaryMetricsSchema: z.ZodType<SummaryMetrics> = z.lazy(() =>
  z
    .object({
      durableKnowledge: z.number(),
      surpriseAccuracy: z.number().nullable(),
      efficiencyPerHour: z.number().nullable(),
      calibration: calibrationSchema.nullable(),
      transfer: z.number().nullable(),
      byVariant: z.array(
        z
          .object({
            experimentId: z.string().min(1),
            variants: z.array(
              z
                .object({
                  variantId: z.string().min(1),
                  metrics: summaryMetricsSchema,
                })
                .strict(),
            ),
          })
          .strict(),
      ),
    })
    .strict(),
);

export const testerSummarySchema = z
  .object({
    appVersion: z.string().min(1),
    packVersion: z.string().min(1),
    buildChannel: z.enum(['internal', 'closed', 'public']),
    platform: z.string().min(1),
    osMajorVersion: z.number().int().nonnegative(),
    experimentVariants: z.record(z.string().min(1), z.string().min(1)),
    metrics: summaryMetricsSchema,
    counts: z
      .object({
        answers: z.enum(['0', '1-9', '10-49', '50-199', '200+']),
        rounds: z.enum(['0', '1-9', '10-49', '50-199', '200+']),
        activeDays: z.enum(['0', '1-9', '10-49', '50-199', '200+']),
      })
      .strict(),
  })
  .strict();

function toSummaryMetrics(report: MetricsReport): SummaryMetrics {
  const byVariant = [...report.byVariant.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([experimentId, variants]) => ({
      experimentId,
      variants: [...variants.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([variantId, metrics]) => ({
          variantId,
          metrics: toSummaryMetrics(metrics),
        })),
    }));

  return {
    durableKnowledge: report.durableKnowledge,
    surpriseAccuracy: report.surpriseAccuracy,
    efficiencyPerHour: report.efficiencyPerHour,
    calibration:
      report.calibration === null
        ? null
        : {
            logLoss: report.calibration.logLoss,
            rmseBins: report.calibration.rmseBins,
          },
    transfer: report.transfer,
    byVariant,
  };
}

export function buildSummary(report: MetricsReport, meta: SummaryMeta): TesterSummary {
  if (!isSummaryShareAvailable(meta.buildChannel)) {
    throw new Error('Share a summary is not available in public builds (AC-04.10)');
  }

  const experimentVariants = Object.fromEntries(
    Object.entries(meta.experimentVariants).sort(([left], [right]) => left.localeCompare(right)),
  );

  return testerSummarySchema.parse({
    appVersion: meta.appVersion,
    packVersion: meta.packVersion,
    buildChannel: meta.buildChannel,
    platform: meta.platform,
    osMajorVersion: meta.osMajorVersion,
    experimentVariants,
    metrics: toSummaryMetrics(report),
    counts: {
      answers: countBucket(meta.counts.answers),
      rounds: countBucket(meta.counts.rounds),
      activeDays: countBucket(meta.counts.activeDays),
    },
  });
}

export const SUMMARY_FILE_NAME = 'geography-summary.json';

// The preview and the shared file are the same bytes by construction (AC-04.6).
export function summaryFileContents(summary: TesterSummary): string {
  return JSON.stringify(testerSummarySchema.parse(summary));
}

export interface SummaryPreview {
  readonly fileContents: string;
  readonly rows: readonly { readonly key: string; readonly value: string }[];
}

export function summaryPreview(summary: TesterSummary): SummaryPreview {
  const valid = testerSummarySchema.parse(summary);
  return {
    fileContents: summaryFileContents(valid),
    rows: [
      { key: 'summary.appVersion', value: valid.appVersion },
      { key: 'summary.packVersion', value: valid.packVersion },
      { key: 'summary.buildChannel', value: valid.buildChannel },
      { key: 'summary.platform', value: valid.platform },
      { key: 'summary.osMajorVersion', value: String(valid.osMajorVersion) },
      { key: 'summary.counts.answers', value: valid.counts.answers },
      { key: 'summary.counts.rounds', value: valid.counts.rounds },
      { key: 'summary.counts.activeDays', value: valid.counts.activeDays },
    ],
  };
}

export interface SummarySharePort {
  share(fileName: string, contents: string): Promise<void>;
}

// Sharing is handed to the platform. The app never sends the file itself
// (FE04 item 8, AC-04.7).
export async function shareSummary(summary: TesterSummary, port: SummarySharePort): Promise<void> {
  await port.share(SUMMARY_FILE_NAME, summaryFileContents(summary));
}
