import { describe, expect, it, vi } from 'vitest';
import type { MetricsReport } from '../../engine/src/metrics/index.ts';
import {
  buildSummary,
  countBucket,
  isSummaryShareAvailable,
  shareSummary,
  summaryFileContents,
  summaryPreview,
  testerSummarySchema,
  type SummaryMeta,
  type TesterSummary,
} from './metrics-summary.ts';

function report(): MetricsReport {
  return {
    durableKnowledge: 3,
    surpriseAccuracy: 0.75,
    efficiencyPerHour: 1.5,
    calibration: { logLoss: 0.42, rmseBins: 0.08 },
    transfer: 0.5,
    byVariant: new Map([
      [
        'E01',
        new Map([
          [
            'A',
            {
              durableKnowledge: 2,
              surpriseAccuracy: null,
              efficiencyPerHour: null,
              calibration: null,
              transfer: null,
              byVariant: new Map(),
            },
          ],
        ]),
      ],
    ]),
  };
}

const meta: SummaryMeta = {
  appVersion: '1.2.3',
  packVersion: '2026.11',
  buildChannel: 'closed',
  platform: 'android',
  osMajorVersion: 15,
  experimentVariants: { E01: 'A' },
  counts: { answers: 12, rounds: 2, activeDays: 3 },
};

describe('FE04 tester summary', () => {
  it('AC-04.5 the summary file validates against the allowlist schema; any extra field fails CI', () => {
    const summary = buildSummary(report(), meta);
    expect(testerSummarySchema.safeParse(summary).success).toBe(true);
    expect(
      testerSummarySchema.safeParse({
        ...summary,
        installId: '0192f000-0000-7000-8000-0000000000aa',
      }).success,
    ).toBe(false);

    const contents = summaryFileContents(summary);
    expect(contents).not.toContain('0192f000-0000-7000-8000');
    expect(contents).not.toContain('eventId');
    expect(contents).not.toContain('timestamp');
    expect(contents).not.toContain('itemId');
    expect(contents).not.toContain('response');
  });

  it('AC-04.6 the summary preview matches the shared file byte for byte', () => {
    const summary = buildSummary(report(), meta);
    const preview = summaryPreview(summary);
    expect(preview.fileContents).toBe(summaryFileContents(summary));
    expect(preview.fileContents).toBe(JSON.stringify(testerSummarySchema.parse(summary)));
  });

  it('AC-04.7 generating or sharing a summary makes no network request', async () => {
    const fetchSpy = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy;
    try {
      const summary = buildSummary(report(), meta);
      summaryFileContents(summary);
      summaryPreview(summary);
      const share = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
      await shareSummary(summary, { share });
      expect(share).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('AC-04.10 no "Share a summary" option exists in public builds', () => {
    expect(isSummaryShareAvailable('public')).toBe(false);
    expect(isSummaryShareAvailable('internal')).toBe(true);
    expect(isSummaryShareAvailable('closed')).toBe(true);
    expect(() => buildSummary(report(), { ...meta, buildChannel: 'public' })).toThrow();
  });

  it.skip('AC-04.10 public bundle inspection contains no summary sharing code', () => {
    // Needs the hosted CI bundle-inspection job (gate 8) once the app is built.
  });

  it('counts are shared only as fixed buckets', () => {
    expect(countBucket(0)).toBe('0');
    expect(countBucket(9)).toBe('1-9');
    expect(countBucket(10)).toBe('10-49');
    expect(countBucket(50)).toBe('50-199');
    expect(countBucket(200)).toBe('200+');

    const summary: TesterSummary = buildSummary(report(), {
      ...meta,
      counts: { answers: 12, rounds: 2, activeDays: 3 },
    });
    expect(summary.counts).toEqual({
      answers: '10-49',
      rounds: '1-9',
      activeDays: '1-9',
    });
  });
});
