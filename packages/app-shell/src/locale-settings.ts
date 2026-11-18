import {
  isDistanceUnit,
  isLocale,
  normalizeRegion,
  type DeviceLocaleInfo,
  type DomainEvent,
  type LocaleOverrides,
  type LocaleSettings,
  type ProjectedState,
} from '@geo/domain';
import type { EventFactory } from './event-factory.ts';
import { resolveLocale } from './locale.ts';

// Setting keys are part of the event payload contract. Keep them here rather
// than in the UI so read and write paths cannot drift apart.
export const LOCALE_SETTING_KEYS = {
  locale: 'locale',
  units: 'units',
  deviceRegion: 'region',
} as const;

function settingValue(state: ProjectedState, key: string): unknown {
  return state.settings[key]?.value;
}

// Rebuild overrides from the projection. The projection already applies
// last-writer-wins by `at`, so a restarted or imported log resolves to the same
// settings without any extra state (FE05 behaviour 3, AC-05.7).
export function localeOverridesFromSettings(state: ProjectedState): LocaleOverrides {
  const overrides: {
    locale?: LocaleSettings['locale'];
    units?: LocaleSettings['units'];
    deviceRegion?: LocaleSettings['deviceRegion'];
  } = {};

  const locale = settingValue(state, LOCALE_SETTING_KEYS.locale);
  if (isLocale(locale)) {
    overrides.locale = locale;
  }

  const units = settingValue(state, LOCALE_SETTING_KEYS.units);
  if (isDistanceUnit(units)) {
    overrides.units = units;
  }

  const region = settingValue(state, LOCALE_SETTING_KEYS.deviceRegion);
  if (region === null) {
    overrides.deviceRegion = null;
  } else if (typeof region === 'string') {
    const normalized = normalizeRegion(region);
    if (normalized !== null) {
      overrides.deviceRegion = normalized;
    }
  }

  return overrides;
}

export function localeSettingsFromProjection(
  state: ProjectedState,
  device: DeviceLocaleInfo,
): LocaleSettings {
  return resolveLocale(device, localeOverridesFromSettings(state));
}

// Build the SettingChanged events for settings changed on a screen. The caller
// appends them all in one transaction; the new values apply in the next
// projection immediately, without waiting for a pause (FE05 behaviour 3).
export function createLocaleSettingEvents(
  factory: EventFactory,
  overrides: LocaleOverrides,
): readonly DomainEvent[] {
  const events: DomainEvent[] = [];

  if (overrides.locale !== undefined) {
    events.push(
      factory.create('SettingChanged', {
        key: LOCALE_SETTING_KEYS.locale,
        value: overrides.locale,
      }),
    );
  }

  if (overrides.units !== undefined) {
    events.push(
      factory.create('SettingChanged', {
        key: LOCALE_SETTING_KEYS.units,
        value: overrides.units,
      }),
    );
  }

  if (overrides.deviceRegion !== undefined) {
    events.push(
      factory.create('SettingChanged', {
        key: LOCALE_SETTING_KEYS.deviceRegion,
        value: overrides.deviceRegion,
      }),
    );
  }

  return events;
}
