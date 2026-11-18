import { describe, expect, it } from 'vitest';
import { localDay } from './index.ts';

function keyAt(isoUtc: string, tz: string): string {
  return localDay(Date.parse(isoUtc), tz).key;
}

describe('localDay', () => {
  it('AC-05.2 puts 03:59 local on the previous day and 04:00 on the new day', () => {
    expect(keyAt('2026-11-18T03:59:00Z', 'Europe/London')).toBe('2026-11-17');
    expect(keyAt('2026-11-18T04:00:00Z', 'Europe/London')).toBe('2026-11-18');
    expect(keyAt('2026-11-18T08:59:00Z', 'America/New_York')).toBe('2026-11-17');
    expect(keyAt('2026-11-18T09:00:00Z', 'America/New_York')).toBe('2026-11-18');
  });

  it('AC-05.2 keeps the 04:00 boundary on Europe/London clock-change days', () => {
    // Spring forward: 01:00 GMT becomes 02:00 BST on 29 March 2026.
    expect(keyAt('2026-03-29T02:59:00Z', 'Europe/London')).toBe('2026-03-28');
    expect(keyAt('2026-03-29T03:00:00Z', 'Europe/London')).toBe('2026-03-29');

    // Fall back: 02:00 BST becomes 01:00 GMT on 25 October 2026.
    expect(keyAt('2026-10-25T03:59:00Z', 'Europe/London')).toBe('2026-10-24');
    expect(keyAt('2026-10-25T04:00:00Z', 'Europe/London')).toBe('2026-10-25');
  });

  it('AC-05.2 keeps the 04:00 boundary on America/New_York clock-change days', () => {
    // Spring forward: 02:00 EST becomes 03:00 EDT on 8 March 2026.
    expect(keyAt('2026-03-08T07:59:00Z', 'America/New_York')).toBe('2026-03-07');
    expect(keyAt('2026-03-08T08:00:00Z', 'America/New_York')).toBe('2026-03-08');

    // Fall back: 02:00 EDT becomes 01:00 EST on 1 November 2026.
    expect(keyAt('2026-11-01T08:59:00Z', 'America/New_York')).toBe('2026-10-31');
    expect(keyAt('2026-11-01T09:00:00Z', 'America/New_York')).toBe('2026-11-01');
  });

  it('AC-05.3 produces the reference replay on this host', () => {
    const reference = [
      ['2026-01-01T00:00:00Z', 'UTC', '2025-12-31'],
      ['2026-01-01T04:00:00Z', 'UTC', '2026-01-01'],
      ['2026-03-29T02:59:00Z', 'Europe/London', '2026-03-28'],
      ['2026-03-29T03:00:00Z', 'Europe/London', '2026-03-29'],
      ['2026-11-01T08:59:00Z', 'America/New_York', '2026-10-31'],
      ['2026-11-01T09:00:00Z', 'America/New_York', '2026-11-01'],
      ['2026-11-18T22:29:00Z', 'Asia/Kolkata', '2026-11-18'],
      ['2026-11-18T22:30:00Z', 'Asia/Kolkata', '2026-11-19'],
      ['2026-11-18T14:59:00Z', 'Pacific/Auckland', '2026-11-18'],
      ['2026-11-18T15:00:00Z', 'Pacific/Auckland', '2026-11-19'],
    ] as const;

    for (const [isoUtc, tz, expected] of reference) {
      expect(localDay(Date.parse(isoUtc), tz), `${isoUtc} in ${tz}`).toMatchObject({
        key: expected,
      });
    }
  });

  it.skip('AC-05.3 Android reference replay runs on the Galaxy A07 4G', () => {
    // Skipped: physical reference device and Android E2E driver are unavailable
    // in this worktree. The fixture above is shared with the device replay.
  });

  it('uses each event time zone so travel can shorten or lengthen a local day', () => {
    const instant = Date.parse('2026-11-18T20:00:00Z');
    expect(localDay(instant, 'Europe/London')).toMatchObject({ key: '2026-11-18' });
    expect(localDay(instant, 'Pacific/Auckland')).toMatchObject({ key: '2026-11-19' });
  });

  it('handles month, year and leap-day boundaries without Date arithmetic', () => {
    expect(keyAt('2026-03-01T03:59:00Z', 'UTC')).toBe('2026-02-28');
    expect(keyAt('2028-03-01T03:59:00Z', 'UTC')).toBe('2028-02-29');
    expect(keyAt('2027-01-01T03:59:00Z', 'UTC')).toBe('2026-12-31');
  });
});
