// These packages have no workspace dependency wiring yet (the scaffold task
// owns package manifests), so import the exact source types directly.
import type { DistanceUnit, LocaleSettings } from '../../domain/src/locale.ts';
import type { LocalDay } from '../../engine/src/time/index.ts';

const METRES_PER_KILOMETRE = 1_000;
const METRES_PER_MILE = 1_609.344;

function intrinsicUnit(unit: DistanceUnit): 'kilometer' | 'mile' {
  return unit === 'km' ? 'kilometer' : 'mile';
}

// D116 says distances are shown rounded but the placeholder file does not
// record an increment. Use one decimal below ten display units and whole units
// above that so short distances never collapse to zero. Report this as a spec
// question rather than treating it as a fixed product decision.
function fractionDigits(value: number): number {
  return value < 10 ? 1 : 0;
}

// Format through Intl in the resolved locale. Internal geometry stays in
// metres; only this display boundary converts (FE05 behaviour 4, D115).
export function formatDistance(metres: number, settings: LocaleSettings): string {
  if (!Number.isFinite(metres) || metres < 0) {
    throw new RangeError('distance must be a finite, non-negative number of metres');
  }

  const value = settings.units === 'km' ? metres / METRES_PER_KILOMETRE : metres / METRES_PER_MILE;
  const maximumFractionDigits = fractionDigits(value);

  return new Intl.NumberFormat(settings.locale, {
    style: 'unit',
    unit: intrinsicUnit(settings.units),
    unitDisplay: 'short',
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
}

// Local days are calendar dates, so format them in UTC to avoid re-applying a
// time zone and shifting the date (FE05 behaviour 4).
export function formatLocalDay(day: LocalDay, settings: LocaleSettings): string {
  const date = new Date(Date.UTC(day.year, day.month - 1, day.day));
  return new Intl.DateTimeFormat(settings.locale, {
    timeZone: 'UTC',
    dateStyle: 'medium',
  }).format(date);
}
