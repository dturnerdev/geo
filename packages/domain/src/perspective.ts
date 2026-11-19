import type { DomainEvent } from './events.ts';
import { normalizeRegion, type RegionCode } from './locale.ts';
import { sortEvents } from './ordering.ts';

// FE07 perspective selection and history. The learner-visible status values and
// the future perspective set remain content decisions, so only the existing
// MVP union is part of this contract (m1-map.md FE07 Interfaces).
export type PerspectiveId = 'uk' | 'us' | 'default';
export type BorderStyle = 'agreed' | 'disputed' | 'claim';

// A perspective override is stored as a SettingChanged event. The key is part of
// the event payload contract and is read back by perspectiveAt (FE07 behaviour
// 4 and 8).
export const PERSPECTIVE_SETTING_KEY = 'perspective';

export function isPerspectiveId(value: unknown): value is PerspectiveId {
  return value === 'uk' || value === 'us' || value === 'default';
}

// The selection table is exact: GB selects uk, US selects us, and everything
// else, including an absent region, selects default. A user override always
// wins (FE07 behaviour 4).
export function choosePerspective(
  deviceRegion: RegionCode | null,
  override: PerspectiveId | null,
): PerspectiveId {
  if (override !== null) {
    return override;
  }
  const region = normalizeRegion(deviceRegion);
  if (region === 'GB') {
    return 'uk';
  }
  if (region === 'US') {
    return 'us';
  }
  return 'default';
}

// Work out which perspective applied at a point in the log. Only SettingChanged
// events for the perspective key are relevant; invalid values are ignored so a
// malformed imported event cannot change the answer (FE07 behaviour 8, D117).
// Events strictly after `at` are excluded, and ties follow the normal (at, id)
// order.
export function perspectiveAt(events: Iterable<DomainEvent>, at: number): PerspectiveId {
  const ordered = sortEvents([...events].filter((event) => event.at <= at));
  let perspective: PerspectiveId = 'default';
  for (const event of ordered) {
    if (event.type !== 'SettingChanged' || event.payload.key !== PERSPECTIVE_SETTING_KEY) {
      continue;
    }
    if (isPerspectiveId(event.payload.value)) {
      perspective = event.payload.value;
    }
  }
  return perspective;
}
