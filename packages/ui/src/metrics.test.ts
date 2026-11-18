import { describe, expect, it } from 'vitest';
import { METRIC_NOT_ENOUGH_DATA_KEY, metricText } from './metrics.ts';

describe('FE04 metric display', () => {
  it('AC-04.11 a null metric shows "Not enough data yet", never 0', () => {
    const translate = (key: string): string =>
      key === METRIC_NOT_ENOUGH_DATA_KEY ? 'Not enough data yet' : key;
    expect(metricText(null, { translate, formatNumber: String })).toBe('Not enough data yet');
    expect(metricText(0, { translate, formatNumber: String })).toBe('0');
  });
});
