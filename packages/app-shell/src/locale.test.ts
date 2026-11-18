import {
  mergeEventLogs,
  projectEvents,
  type DeviceLocaleInfo,
  type LocaleSettings,
} from '@geo/domain';
import { describe, expect, it } from 'vitest';
import {
  createLocaleSettingEvents,
  LOCALE_SETTING_KEYS,
  localeOverridesFromSettings,
  localeSettingsFromProjection,
} from './locale-settings.ts';
import { resolveLocale } from './locale.ts';
import { makeSetting, testFactory } from './test-helpers.ts';

function device(overrides: Partial<DeviceLocaleInfo> = {}): DeviceLocaleInfo {
  return {
    language: 'en-GB',
    region: 'GB',
    measurementSystem: null,
    timeZone: 'Europe/London',
    ...overrides,
  };
}

function settings(deviceInfo: DeviceLocaleInfo): LocaleSettings {
  return resolveLocale(deviceInfo, {});
}

describe('resolveLocale', () => {
  it('AC-05.1 matches the detection table for every row', () => {
    expect(settings(device({ language: 'en-US', region: 'US' }))).toEqual({
      locale: 'en-US',
      units: 'mi',
      deviceRegion: 'US',
      timeZone: 'Europe/London',
    });
    expect(settings(device({ language: 'en-GB', region: 'GB' }))).toEqual({
      locale: 'en-GB',
      units: 'km',
      deviceRegion: 'GB',
      timeZone: 'Europe/London',
    });
    expect(settings(device({ language: 'en-AU', region: 'AU' }))).toMatchObject({
      locale: 'en-GB',
      units: 'km',
      deviceRegion: 'AU',
    });
    expect(settings(device({ language: 'fr-FR', region: 'US' }))).toMatchObject({
      locale: 'en-US',
      units: 'mi',
      deviceRegion: 'US',
    });
    expect(settings(device({ language: 'de-DE', region: 'DE' }))).toMatchObject({
      locale: 'en-GB',
      units: 'km',
      deviceRegion: 'DE',
    });
  });

  it('AC-05.1 lets a device measurement preference override the units column', () => {
    expect(settings(device({ region: 'US', measurementSystem: 'metric' })).units).toBe('km');
    expect(settings(device({ region: 'GB', measurementSystem: 'us' })).units).toBe('mi');
    expect(settings(device({ region: 'GB', measurementSystem: 'uk' })).units).toBe('mi');
  });

  it('AC-05.1 falls back to en-GB and kilometres when the device region is missing', () => {
    const resolved = settings(device({ language: 'en-US', region: null }));
    expect(resolved.locale).toBe('en-GB');
    expect(resolved.units).toBe('km');
    expect(resolved.deviceRegion).toBeNull();
    expect(resolved.timeZone).toBe('Europe/London');
  });

  it('AC-05.1 applies language, units and region overrides independently', () => {
    const resolved = resolveLocale(device({ region: 'GB' }), {
      locale: 'en-US',
      units: 'mi',
      deviceRegion: 'US',
    });
    expect(resolved).toEqual({
      locale: 'en-US',
      units: 'mi',
      deviceRegion: 'US',
      timeZone: 'Europe/London',
    });
  });

  it('normalizes a lower-case region and keeps the device zone untouched', () => {
    const resolved = resolveLocale(device({ region: 'us', timeZone: 'America/New_York' }), {});
    expect(resolved.deviceRegion).toBe('US');
    expect(resolved.locale).toBe('en-US');
    expect(resolved.timeZone).toBe('America/New_York');
  });
});

describe('locale settings projection', () => {
  it('AC-05.7 an override survives restart and import with last-writer-wins', () => {
    const { factory } = testFactory();
    const local = makeSetting(factory, 1_000, LOCALE_SETTING_KEYS.units, 'mi');
    const locales = createLocaleSettingEvents(factory, {
      locale: 'en-US',
      deviceRegion: 'US',
    });
    const original = projectEvents([...locales, local]);
    expect(original.settings[LOCALE_SETTING_KEYS.units]?.value).toBe('mi');

    // A restart replays the same log, not any in-memory state.
    const restarted = projectEvents([...locales, local]);
    expect(localeSettingsFromProjection(restarted, device())).toMatchObject({
      locale: 'en-US',
      units: 'mi',
      deviceRegion: 'US',
    });

    // An older imported override loses; a newer one wins. Imported logs come
    // from another device, so they use their own monotonic clock.
    const olderImport = makeSetting(testFactory().factory, 500, LOCALE_SETTING_KEYS.units, 'km');
    const olderMerged = projectEvents(mergeEventLogs([local], [olderImport]));
    expect(localeOverridesFromSettings(olderMerged).units).toBe('mi');

    const newerImport = makeSetting(testFactory().factory, 2_000, LOCALE_SETTING_KEYS.units, 'km');
    const newerMerged = projectEvents(mergeEventLogs([local], [newerImport]));
    expect(localeOverridesFromSettings(newerMerged).units).toBe('km');
  });

  it('AC-05.7 writes one SettingChanged event per changed field', () => {
    const { factory } = testFactory();
    const events = createLocaleSettingEvents(factory, {
      locale: 'en-GB',
      units: 'km',
      deviceRegion: null,
    });

    expect(events.map((event) => event.type)).toEqual([
      'SettingChanged',
      'SettingChanged',
      'SettingChanged',
    ]);
    expect(events.map((event) => event.payload)).toEqual([
      { key: LOCALE_SETTING_KEYS.locale, value: 'en-GB' },
      { key: LOCALE_SETTING_KEYS.units, value: 'km' },
      { key: LOCALE_SETTING_KEYS.deviceRegion, value: null },
    ]);
  });

  it('ignores malformed setting values instead of guessing', () => {
    const { factory } = testFactory();
    const state = projectEvents([
      makeSetting(factory, 1_000, LOCALE_SETTING_KEYS.locale, 'fr-FR'),
      makeSetting(factory, 1_001, LOCALE_SETTING_KEYS.units, 'metres'),
      makeSetting(factory, 1_002, LOCALE_SETTING_KEYS.deviceRegion, 'not-a-region'),
    ]);

    expect(localeOverridesFromSettings(state)).toEqual({});
  });
});
