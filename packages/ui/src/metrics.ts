export const METRIC_NOT_ENOUGH_DATA_KEY = 'metrics.notEnoughData';

export interface MetricTextOptions {
  readonly translate: (key: string) => string;
  readonly formatNumber: (value: number) => string;
}

// A null metric is shown as "Not enough data yet", never as 0 (FE04 item 4,
// AC-04.4, AC-04.11).
export function metricText(value: number | null, options: MetricTextOptions): string {
  return value === null
    ? options.translate(METRIC_NOT_ENOUGH_DATA_KEY)
    : options.formatNumber(value);
}
