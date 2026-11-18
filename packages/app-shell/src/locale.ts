import {
  normalizeRegion,
  type DeviceLocaleInfo,
  type DistanceUnit,
  type Locale,
  type LocaleOverrides,
  type LocaleSettings,
} from '@geo/domain';

function unitsFromMeasurement(system: DeviceLocaleInfo['measurementSystem']): DistanceUnit | null {
  switch (system) {
    case 'metric':
      return 'km';
    case 'us':
    case 'uk':
      return 'mi';
    case null:
      return null;
  }
}

// Resolve the effective locale without any network or IP lookup (D103). The
// detection table in FE05 collapses to the device region because en-GB and
// en-US are the only supported locales; a region override participates in
// detection so changing region also changes the fallback language.
export function resolveLocale(
  device: DeviceLocaleInfo,
  overrides: LocaleOverrides,
): LocaleSettings {
  const deviceRegion =
    overrides.deviceRegion === undefined
      ? normalizeRegion(device.region)
      : normalizeRegion(overrides.deviceRegion);
  const isUnitedStates = deviceRegion === 'US';
  const locale: Locale = overrides.locale ?? (isUnitedStates ? 'en-US' : 'en-GB');
  const units =
    overrides.units ??
    unitsFromMeasurement(device.measurementSystem) ??
    (isUnitedStates ? 'mi' : 'km');

  return {
    locale,
    units,
    deviceRegion,
    timeZone: device.timeZone,
  };
}
