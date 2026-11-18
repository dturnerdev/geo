import { z } from 'zod';

// FE05 owns the user-facing locale types. Values stay as plain strings so the
// platform adapter can pass device data across the app-shell boundary without
// leaking browser or Android types into the domain.
export type Locale = 'en-GB' | 'en-US';
export type DistanceUnit = 'km' | 'mi';
export type RegionCode = string;
export type IanaZone = string;

// A device may expose a measurement preference. `uk` is treated as imperial
// because the UK displays road distances in miles (FE05 behaviour 2).
export type MeasurementSystem = 'metric' | 'us' | 'uk';

export interface DeviceLocaleInfo {
  readonly language: string;
  readonly region: RegionCode | null;
  readonly measurementSystem: MeasurementSystem | null;
  readonly timeZone: IanaZone;
}

export interface LocaleSettings {
  readonly locale: Locale;
  readonly units: DistanceUnit;
  readonly deviceRegion: RegionCode | null;
  readonly timeZone: IanaZone;
}

// Overrides come from settings. An explicit `deviceRegion: null` means the user
// cleared the region; an omitted field means "use what the device reports".
export interface LocaleOverrides {
  readonly locale?: Locale;
  readonly units?: DistanceUnit;
  readonly deviceRegion?: RegionCode | null;
}

export const localeSchema = z.enum(['en-GB', 'en-US']);
export const distanceUnitSchema = z.enum(['km', 'mi']);
export const measurementSystemSchema = z.enum(['metric', 'us', 'uk']);
export const regionCodeSchema = z.string().regex(/^[A-Z]{2}$/, 'must be ISO 3166-1 alpha-2');

export const deviceLocaleInfoSchema = z.object({
  language: z.string().min(1),
  region: regionCodeSchema.nullable(),
  measurementSystem: measurementSystemSchema.nullable(),
  timeZone: z.string().min(1),
});

export const localeSettingsSchema = z.object({
  locale: localeSchema,
  units: distanceUnitSchema,
  deviceRegion: regionCodeSchema.nullable(),
  timeZone: z.string().min(1),
});

export const localeOverridesSchema = z.object({
  locale: localeSchema.optional(),
  units: distanceUnitSchema.optional(),
  deviceRegion: regionCodeSchema.nullable().optional(),
});

export function isLocale(value: unknown): value is Locale {
  return value === 'en-GB' || value === 'en-US';
}

export function isDistanceUnit(value: unknown): value is DistanceUnit {
  return value === 'km' || value === 'mi';
}

export function isMeasurementSystem(value: unknown): value is MeasurementSystem {
  return value === 'metric' || value === 'us' || value === 'uk';
}

// Normalise a device or setting region so comparisons are case-insensitive.
// A missing or malformed region becomes null and locale detection falls back
// to en-GB/kilometres (FE05 edge cases).
export function normalizeRegion(value: string | null | undefined): RegionCode | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(trimmed) ? trimmed : null;
}
