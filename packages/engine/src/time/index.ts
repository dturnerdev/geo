// The engine package manifest has no workspace dependency yet (owned by the
// scaffold task), so use the domain source path for this type-only import.
import type { IanaZone } from '../../../domain/src/locale.ts';

// A local day is identified by the calendar date on which it started. The
// `key` is stable across platforms and is the value stored in daily-challenge
// events. Months and days are 1-based, matching Intl parts.
export interface LocalDay {
  readonly key: string;
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

const LOCAL_DAY_START_HOUR = 4;

interface CalendarDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

function localCalendarDate(at: number, tz: IanaZone): CalendarDate {
  if (!Number.isFinite(at)) {
    throw new RangeError('at must be a finite UTC timestamp');
  }

  // Format the instant directly; engine code never creates Date objects
  // (07 §7 rule 15). `h23` keeps midnight as 00 rather than 24.
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);

  let year: number | undefined;
  let month: number | undefined;
  let day: number | undefined;
  let hour: number | undefined;
  for (const part of parts) {
    switch (part.type) {
      case 'year':
        year = Number(part.value);
        break;
      case 'month':
        month = Number(part.value);
        break;
      case 'day':
        day = Number(part.value);
        break;
      case 'hour':
        hour = Number(part.value);
        break;
      default:
        break;
    }
  }

  if (year === undefined || month === undefined || day === undefined || hour === undefined) {
    throw new RangeError(`could not resolve local calendar date for ${tz}`);
  }

  return hour < LOCAL_DAY_START_HOUR
    ? previousCalendarDate({ year, month, day })
    : { year, month, day };
}

function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function previousCalendarDate(date: CalendarDate): CalendarDate {
  if (date.day > 1) {
    return { year: date.year, month: date.month, day: date.day - 1 };
  }
  if (date.month > 1) {
    const month = date.month - 1;
    return { year: date.year, month, day: daysInMonth(date.year, month) };
  }
  return { year: date.year - 1, month: 12, day: 31 };
}

function pad(value: number, length: number): string {
  return value.toString().padStart(length, '0');
}

// The local day runs 04:00 to 04:00 (D134, FE05 behaviour 5). Using the local
// calendar date and hour rather than subtracting four real hours keeps the
// boundary correct on DST change days, when a local day can be 23 or 25 hours.
export function localDay(at: number, tz: IanaZone): LocalDay {
  const date = localCalendarDate(at, tz);
  return {
    key: `${pad(date.year, 4)}-${pad(date.month, 2)}-${pad(date.day, 2)}`,
    year: date.year,
    month: date.month,
    day: date.day,
  };
}
