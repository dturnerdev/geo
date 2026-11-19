import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  createHaptics,
  createMixer,
  DEFAULT_CHANNEL_LEVELS,
  DEFAULT_CHANNEL_MUTES,
  hapticForOutcome,
  hasVibrationApi,
  HAPTIC_GAP_MS,
  HAPTIC_PATTERNS,
  type AudioContextLike,
  type FeedbackOutcome,
  type Haptics,
} from './index.ts';

const OUTCOMES: readonly FeedbackOutcome[] = [
  'correct',
  'bearing-hit',
  'atlas-bloom',
  'incorrect',
  'close',
  'shown',
  'hint',
];

class FakeOscillator {
  frequency = { value: 0 };
  type = 'sine';
  started = 0;
  stopped = 0;
  start(at: number): void {
    this.started += 1;
    this.stopped = at;
  }
  stop(): void {
    this.stopped += 1;
  }
  connect(): void {}
}

class FakeGain {
  gain = { value: 0, setValueAtTime: (value: number) => void (this.gain.value = value) };
  connect(): void {}
}

function fakeContext(state = 'suspended'): {
  context: AudioContextLike;
  oscillators: FakeOscillator[];
  resume: () => Promise<void>;
} {
  const oscillators: FakeOscillator[] = [];
  const context: AudioContextLike & { state: string } = {
    currentTime: 1,
    state,
    destination: {},
    resume: () => {
      context.state = 'running';
      return Promise.resolve();
    },
    createOscillator: () => {
      const oscillator = new FakeOscillator();
      oscillators.push(oscillator);
      return oscillator;
    },
    createGain: () => new FakeGain(),
  };
  return { context, oscillators, resume: () => context.resume() };
}

const CLIP = { frequency: 440, durationSeconds: 0.1 };

describe('FE12 haptics', () => {
  it('AC-12.1 no haptic fires for incorrect, close, shown or hint', () => {
    fc.assert(
      fc.property(fc.constantFrom(...OUTCOMES), (outcome) => {
        const id = hapticForOutcome(outcome);
        return ['correct', 'bearing-hit', 'atlas-bloom'].includes(outcome)
          ? id !== null
          : id === null;
      }),
    );
  });

  it('AC-12.1 the Haptics type rejects a negative outcome', () => {
    // Compile-time only: this function is never called, so no haptic can fire.
    const fireNegative = (haptics: Haptics): void => {
      // @ts-expect-error only H01-H03 are haptic ids
      haptics.fire('incorrect');
    };
    expect(fireNegative).toBeTypeOf('function');
  });

  it('AC-12.2 haptics never fire more than once per 300 ms', () => {
    let now = 1_000;
    const patterns: (number | number[])[] = [];
    const haptics = createHaptics({
      supported: true,
      vibrate: (pattern) => {
        patterns.push(pattern);
        return true;
      },
      now: () => now,
    });

    haptics.fire('H01');
    now += HAPTIC_GAP_MS - 1;
    haptics.fire('H02');
    haptics.fire('H03');
    expect(patterns).toEqual([HAPTIC_PATTERNS.H01]);

    now += 1;
    haptics.fire('H03');
    expect(patterns).toEqual([HAPTIC_PATTERNS.H01, [15, 40, 25]]);
  });

  it('AC-12.3 without navigator.vibrate nothing errors and the setting is unsupported', () => {
    const patterns: (number | number[])[] = [];
    expect(hasVibrationApi()).toBe(false);
    const haptics = createHaptics({
      supported: false,
      vibrate: (pattern) => {
        patterns.push(pattern);
        return true;
      },
    });
    expect(haptics.supported).toBe(false);
    expect(() => haptics.fire('H01')).not.toThrow();
    expect(patterns).toEqual([]);
  });
});

describe('FE12 mixer boundary', () => {
  it('AC-12.6 music is off by default and A10 produces no audio', async () => {
    expect(DEFAULT_CHANNEL_LEVELS.music).toBe(0);
    expect(DEFAULT_CHANNEL_MUTES.music).toBe(true);

    const { context, oscillators } = fakeContext();
    const mixer = createMixer({
      context,
      soundClip: () => CLIP,
      startsLocked: false,
    });
    mixer.play('A10');
    await mixer.unlock();
    mixer.play('A10');
    expect(oscillators).toHaveLength(0);
  });

  it('AC-12.9 nothing plays before the first user gesture on web', async () => {
    const { context, oscillators } = fakeContext();
    const mixer = createMixer({
      context,
      soundClip: () => CLIP,
      startsLocked: true,
    });

    expect(mixer.started).toBe(false);
    mixer.play('A01');
    expect(oscillators).toHaveLength(0);
    expect(() => mixer.play('A01')).not.toThrow();

    await mixer.unlock();
    expect(mixer.started).toBe(true);
    mixer.play('A01');
    expect(oscillators).toHaveLength(1);
  });

  it('AC-12.6 a missing voice clip leaves the game running', async () => {
    const { context } = fakeContext();
    const mixer = createMixer({ context, voiceClip: () => null, startsLocked: false });
    const result = await mixer.speak('country-fr', 'en-GB');
    expect(result.ok).toBe(false);
  });
});
