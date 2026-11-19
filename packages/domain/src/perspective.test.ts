import { describe, expect, it } from 'vitest';
import {
  CURRENT_EVENT_SCHEMA,
  domainEventSchema,
  type DomainEvent,
  type EventPayloadOf,
  type EventType,
} from './events.ts';
import { choosePerspective, PERSPECTIVE_SETTING_KEY, perspectiveAt } from './perspective.ts';

let sequence = 0;

function fixtureEvent<TType extends EventType>(
  type: TType,
  payload: EventPayloadOf<TType>,
  at: number,
): DomainEvent {
  sequence += 1;
  const suffix = sequence.toString(16).padStart(12, '0');
  return domainEventSchema.parse({
    id: `0192f000-0000-7000-8000-${suffix}`,
    type,
    schema: CURRENT_EVENT_SCHEMA[type],
    at,
    tz: 'Europe/London',
    origin: '0192f000-0000-7000-8000-0000000000aa',
    contextId: 1,
    payload,
  });
}

function perspectiveChange(value: unknown, at: number): DomainEvent {
  return fixtureEvent('SettingChanged', { key: PERSPECTIVE_SETTING_KEY, value }, at);
}

describe('FE07 perspective selection', () => {
  it('AC-07.1 choosePerspective matches the selection table for every row', () => {
    const table: readonly (readonly [string | null, 'uk' | 'us' | 'default' | null, string])[] = [
      ['GB', null, 'uk'],
      ['US', null, 'us'],
      ['FR', null, 'default'],
      ['DE', null, 'default'],
      [null, null, 'default'],
      ['GB', 'us', 'us'],
      ['US', 'uk', 'uk'],
      ['FR', 'default', 'default'],
      [null, 'uk', 'uk'],
    ];

    for (const [deviceRegion, override, expected] of table) {
      expect(choosePerspective(deviceRegion, override)).toBe(expected);
    }
  });

  it('normalises the device region before selecting a perspective', () => {
    expect(choosePerspective('gb', null)).toBe('uk');
    expect(choosePerspective(' us ', null)).toBe('us');
    expect(choosePerspective('zz', null)).toBe('default');
  });
});

describe('FE07 perspective history', () => {
  it('defaults to default when no perspective setting exists', () => {
    expect(perspectiveAt([], 1_000)).toBe('default');
  });

  it('uses the last perspective SettingChanged at or before the requested time', () => {
    const events = [
      perspectiveChange('uk', 1_000),
      perspectiveChange('us', 2_000),
      perspectiveChange('default', 3_000),
    ];

    expect(perspectiveAt(events, 999)).toBe('default');
    expect(perspectiveAt(events, 1_000)).toBe('uk');
    expect(perspectiveAt(events, 1_999)).toBe('uk');
    expect(perspectiveAt(events, 2_000)).toBe('us');
    expect(perspectiveAt(events, 3_000)).toBe('default');
  });

  it('ignores other settings, invalid values and events after the requested time', () => {
    const events = [
      perspectiveChange('uk', 1_000),
      fixtureEvent('SettingChanged', { key: 'units', value: 'mi' }, 1_500),
      perspectiveChange('not-a-perspective', 1_600),
      perspectiveChange('us', 2_000),
    ];

    expect(perspectiveAt(events, 1_700)).toBe('uk');
    expect(perspectiveAt(events, 1_999)).toBe('uk');
    expect(perspectiveAt(events, 2_000)).toBe('us');
  });

  it('breaks a same-millisecond tie with the event id order', () => {
    const first = perspectiveChange('uk', 1_000);
    const second = perspectiveChange('us', 1_000);

    expect(perspectiveAt([second, first], 1_000)).toBe('us');
    expect(perspectiveAt([first, second], 1_000)).toBe('us');
  });
});
