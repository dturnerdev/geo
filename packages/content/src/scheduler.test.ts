import { describe, expect, it } from 'vitest';
import { networkDeferral, ONE_DAY_MS, TWELVE_HOURS_MS, UpdateScheduler } from './scheduler.ts';

const unmetered = {
  online: true,
  metered: false,
  dataSaver: false,
  batteryLow: false,
  mobileDataAllowed: true,
} as const;

describe('FE02 update scheduling', () => {
  it('AC-02.6 no more than two background checks in any 24 hours', () => {
    const scheduler = new UpdateScheduler();
    expect(scheduler.canCheck('background', 0)).toEqual({ allowed: true });
    scheduler.recordCheck('background', 0);
    expect(scheduler.canCheck('background', TWELVE_HOURS_MS)).toEqual({ allowed: true });
    scheduler.recordCheck('background', TWELVE_HOURS_MS);
    expect(scheduler.canCheck('background', ONE_DAY_MS)).toEqual({
      allowed: false,
      reason: 'frequency-limit',
    });

    // Once the oldest check leaves the sliding window, a new check is allowed.
    expect(scheduler.canCheck('background', ONE_DAY_MS + 1)).toEqual({
      allowed: true,
    });
  });

  it('a launch check waits 12 hours but a web open check does not', () => {
    const scheduler = new UpdateScheduler({ initialLastCheckAt: 1_000 });
    expect(scheduler.canCheck('launch', 1_000 + TWELVE_HOURS_MS - 1)).toEqual({
      allowed: false,
      reason: 'too-soon',
    });
    expect(scheduler.canCheck('launch', 1_000 + TWELVE_HOURS_MS)).toEqual({
      allowed: true,
    });
    expect(scheduler.canCheck('open', 1_001)).toEqual({ allowed: true });
  });

  it('background checks require unmetered data and a battery that is not low', () => {
    expect(networkDeferral('background', { ...unmetered, metered: true })).toBe('metered');
    expect(networkDeferral('background', { ...unmetered, batteryLow: true })).toBe('battery-low');
    expect(networkDeferral('background', { ...unmetered, dataSaver: true })).toBe('data-saver');
    expect(networkDeferral('background', unmetered)).toBeNull();
  });

  it('respects the mobile data setting for launch and open checks', () => {
    expect(
      networkDeferral('launch', { ...unmetered, metered: true, mobileDataAllowed: false }),
    ).toBe('mobile-data-off');
    expect(networkDeferral('open', { ...unmetered, metered: true })).toBeNull();
  });
});
