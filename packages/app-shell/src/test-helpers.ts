import { eventContextSchema, type DomainEvent, type EventContext } from '@geo/domain';
import type { Clock } from './clock.ts';
import { EventFactory } from './event-factory.ts';
import { createInstallIdentity, type InstallIdentity } from './identity.ts';
import type { RandomBytes } from './ids.ts';

let randomState = 0x12345678;

export const deterministicRandom: RandomBytes = (length) => {
  const bytes = new Uint8Array(length);
  for (let index = 0; index < length; index += 1) {
    randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
    bytes[index] = randomState & 0xff;
  }
  return bytes;
};

export class TestClock implements Clock {
  constructor(
    private current = 1_700_000_000_000,
    private zoneName = 'Europe/London',
  ) {}

  now(): number {
    return this.current;
  }

  set(now: number): void {
    this.current = now;
  }

  zone(): string {
    return this.zoneName;
  }
}

export function testIdentity(at = 1_700_000_000_000): InstallIdentity {
  return createInstallIdentity(at, deterministicRandom);
}

export function testContext(id = 1): EventContext {
  return eventContextSchema.parse({
    id,
    appVersion: '0.0.0',
    contentPackVersion: '1.0.0',
    graderVersions: { tap: '1' },
    platform: 'test',
  });
}

export interface TestFactory {
  readonly factory: EventFactory;
  readonly clock: TestClock;
  readonly identity: InstallIdentity;
  readonly context: EventContext;
}

export function testFactory(clock = new TestClock()): TestFactory {
  const identity = testIdentity();
  const context = testContext();
  return {
    factory: new EventFactory({
      clock,
      identity,
      contextId: context.id,
    }),
    clock,
    identity,
    context,
  };
}

export function makeAnswer(
  factory: EventFactory,
  at: number,
  itemId = 'country-fr',
  responseTimeMs = 1_200,
): DomainEvent {
  return factory.create(
    'AnswerRecorded',
    {
      itemId,
      roundId: 'round-1',
      rating: 3,
      level: 1,
      format: 'tap',
      response: { lng: 2.35, lat: 48.85 },
      geometry: { distanceMetres: 1200 },
      aids: [],
      hintsUsed: 0,
      surprise: false,
      roundSeed: 'seed-1',
      responseTimeMs,
    },
    { at },
  );
}

export function makeSetting(
  factory: EventFactory,
  at: number,
  key: string,
  value: unknown,
): DomainEvent {
  return factory.create('SettingChanged', { key, value }, { at });
}
