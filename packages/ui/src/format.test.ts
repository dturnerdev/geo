import type { LocaleSettings } from '../../domain/src/locale.ts';
import { describe, expect, it } from 'vitest';
import { formatDistance, formatLocalDay } from './format.ts';

function settings(
  locale: LocaleSettings['locale'],
  units: LocaleSettings['units'],
): LocaleSettings {
  return {
    locale,
    units,
    deviceRegion: locale === 'en-US' ? 'US' : 'GB',
    timeZone: locale === 'en-US' ? 'America/New_York' : 'Europe/London',
  };
}

describe('formatDistance', () => {
  it('uses en-GB number formatting and kilometres', () => {
    expect(formatDistance(1_240_000, settings('en-GB', 'km'))).toBe('1,240 km');
    expect(formatDistance(400, settings('en-GB', 'km'))).toBe('0.4 km');
  });

  it('uses en-US number formatting and miles', () => {
    expect(formatDistance(1_609_344, settings('en-US', 'mi'))).toBe('1,000 mi');
    expect(formatDistance(80_467.2, settings('en-US', 'mi'))).toBe('50 mi');
  });

  it('rounds short distances without collapsing them to zero', () => {
    expect(formatDistance(0, settings('en-GB', 'km'))).toBe('0 km');
    expect(formatDistance(149, settings('en-GB', 'km'))).toBe('0.1 km');
  });

  it('rejects values that cannot be a distance', () => {
    expect(() => formatDistance(-1, settings('en-GB', 'km'))).toThrow(RangeError);
    expect(() => formatDistance(Number.NaN, settings('en-GB', 'km'))).toThrow(RangeError);
  });
});

describe('formatLocalDay', () => {
  it('formats a local day with the locale date pattern', () => {
    const day = { key: '2026-11-18', year: 2026, month: 11, day: 18 };
    expect(formatLocalDay(day, settings('en-GB', 'km'))).toBe('18 Nov 2026');
    expect(formatLocalDay(day, settings('en-US', 'mi'))).toBe('Nov 18, 2026');
  });
});
