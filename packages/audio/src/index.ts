// FE12 audio and haptics boundary (D57, D76, D89, D156, D161, D162, D178).
import type { ItemId } from '../../domain/src/ids.ts';
import type { Locale } from '../../domain/src/locale.ts';
import { err, ok, type Result } from '../../domain/src/result.ts';

export type AudioChannel = 'master' | 'voice' | 'music' | 'effects';
export type SoundId = 'A01' | 'A02' | 'A03' | 'A04' | 'A05' | 'A06' | 'A07' | 'A08' | 'A09' | 'A10';
export type HapticId = 'H01' | 'H02' | 'H03';

// The spec interfaces name AudioError but define no fields. Keep it opaque
// rather than inventing a learner-visible contract (recorded as a spec question).
export type AudioError = unknown;

export interface Mixer {
  play(sound: SoundId, options?: { pitchStep?: number }): void;
  speak(item: ItemId, accent: Locale): Promise<Result<void, AudioError>>;
  setLevel(channel: AudioChannel, level: number): void;
  setMuted(channel: AudioChannel, muted: boolean): void;
}

export interface Haptics {
  readonly supported: boolean;
  fire(id: HapticId): void;
}

// Outcomes that may reach the feedback layer. Only the three positive ones
// map to a haptic (D162); the rest deliberately have no HapticId.
export type FeedbackOutcome =
  'correct' | 'bearing-hit' | 'atlas-bloom' | 'incorrect' | 'close' | 'shown' | 'hint';

export function hapticForOutcome(outcome: FeedbackOutcome): HapticId | null {
  switch (outcome) {
    case 'correct':
      return 'H01';
    case 'bearing-hit':
      return 'H02';
    case 'atlas-bloom':
      return 'H03';
    case 'incorrect':
    case 'close':
    case 'shown':
    case 'hint':
      return null;
  }
}

// placeholders.md: H01/H02 10 ms, H03 15/40/25 ms, gap >= 300 ms.
export const HAPTIC_PATTERNS: Readonly<Record<HapticId, number | readonly number[]>> = {
  H01: 10,
  H02: 10,
  H03: [15, 40, 25],
};
export const HAPTIC_GAP_MS = 300;

export const AUDIO_CHANNELS: readonly AudioChannel[] = ['master', 'voice', 'music', 'effects'];
// D161: music exists as a channel but is off by default and ships no file.
export const DEFAULT_CHANNEL_LEVELS: Readonly<Record<AudioChannel, number>> = {
  master: 1,
  voice: 1,
  music: 0,
  effects: 1,
};
export const DEFAULT_CHANNEL_MUTES: Readonly<Record<AudioChannel, boolean>> = {
  master: false,
  voice: false,
  music: true,
  effects: false,
};

// D76: at most five rising steps. Placeholder step size is one semitone.
export const MAX_COMBO_STEP = 5;
export const COMBO_SEMITONES_PER_STEP = 1;

export function comboPitchRatio(pitchStep: number): number {
  if (!Number.isFinite(pitchStep) || pitchStep <= 0) {
    return 1;
  }
  const capped = Math.min(Math.floor(pitchStep), MAX_COMBO_STEP) * COMBO_SEMITONES_PER_STEP;
  return 2 ** (capped / 12);
}

export interface HapticsOptions {
  readonly supported?: boolean;
  readonly enabled?: boolean;
  readonly vibrate?: (pattern: number | number[]) => boolean;
  readonly now?: () => number;
}

export interface HapticsController extends Haptics {
  setEnabled(enabled: boolean): void;
}

// Safe feature detection: no navigator access when it is absent (tests, Node,
// older WebViews). Nothing throws before a user gesture or when unsupported.
export function hasVibrationApi(): boolean {
  try {
    return (
      typeof navigator !== 'undefined' &&
      typeof (navigator as { vibrate?: unknown }).vibrate === 'function'
    );
  } catch {
    return false;
  }
}

function defaultVibrate(pattern: number | number[]): boolean {
  if (!hasVibrationApi()) {
    return false;
  }
  const vibrate = (navigator as { vibrate?: (value: number | number[]) => boolean }).vibrate;
  return typeof vibrate === 'function' ? vibrate.call(navigator, pattern) : false;
}

export function createHaptics(options: HapticsOptions = {}): HapticsController {
  const supported = options.supported ?? hasVibrationApi();
  const vibrate = options.vibrate ?? defaultVibrate;
  const now = options.now ?? (() => Date.now());
  let enabled = options.enabled ?? true;
  let lastFiredAt = Number.NEGATIVE_INFINITY;

  return {
    supported,
    fire(id: HapticId): void {
      if (!supported || !enabled) {
        return;
      }
      const at = now();
      if (at - lastFiredAt < HAPTIC_GAP_MS) {
        return;
      }
      lastFiredAt = at;
      const pattern = HAPTIC_PATTERNS[id];
      vibrate(typeof pattern === 'number' ? pattern : [...pattern]);
    },
    setEnabled(next: boolean): void {
      enabled = next;
    },
  };
}

export interface SoundClip {
  readonly frequency: number;
  readonly durationSeconds: number;
  readonly pitchStep?: number;
}

export interface EffectVoice {
  stop(): void;
  readonly startedAt: number;
}

export interface AudioContextLike {
  readonly currentTime: number;
  readonly state: string;
  resume(): Promise<void>;
  createOscillator(): OscillatorLike;
  createGain(): GainLike;
  readonly destination: AudioNodeLike;
}

export interface AudioNodeLike {
  connect?(node: AudioNodeLike): void;
}

export interface GainLike extends AudioNodeLike {
  readonly gain: { value: number; setValueAtTime(value: number, time: number): void };
}

export interface OscillatorLike extends AudioNodeLike {
  readonly frequency: { value: number };
  type: string;
  start(time: number): void;
  stop(time: number): void;
}

export interface MixerOptions {
  readonly context?: AudioContextLike | null;
  readonly createContext?: () => AudioContextLike | null;
  readonly voiceClip?: (item: ItemId, accent: Locale) => SoundClip | null;
  readonly soundClip?: (sound: SoundId) => SoundClip | null;
  readonly maxEffectVoices?: number;
  readonly startsLocked?: boolean;
}

export interface MixerController extends Mixer {
  // Called from the first user gesture. Nothing plays before this on web.
  unlock(): Promise<void>;
  readonly started: boolean;
  readonly levels: Readonly<Record<AudioChannel, number>>;
  readonly mutes: Readonly<Record<AudioChannel, boolean>>;
}

const EFFECT_VOICE_CAP = 2;

// The full Web Audio graph, native @capacitor/haptics bridge and AAC assets are
// deliberately not wired in this milestone: the haptics ADR and test audio are
// blocked. This controller keeps the exact FE12 interface and is a safe no-op
// until a context and clips are supplied.
export function createMixer(options: MixerOptions = {}): MixerController {
  let context = options.context ?? null;
  const createContext = options.createContext;
  const levels: Record<AudioChannel, number> = { ...DEFAULT_CHANNEL_LEVELS };
  const mutes: Record<AudioChannel, boolean> = { ...DEFAULT_CHANNEL_MUTES };
  const voices: EffectVoice[] = [];
  let started = !(options.startsLocked ?? false);

  const audible = (channel: AudioChannel): boolean =>
    !mutes.master && !mutes[channel] && levels.master > 0 && levels[channel] > 0;

  const playClip = (clip: SoundClip, channel: AudioChannel): void => {
    if (!started || !audible(channel)) {
      return;
    }
    const audioContext = context;
    if (audioContext === null || audioContext.state !== 'running') {
      return;
    }
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = clip.frequency * comboPitchRatio(clip.pitchStep ?? 0);
    const level = levels.master * levels[channel];
    gain.gain.setValueAtTime(level, audioContext.currentTime);
    oscillator.connect?.(gain);
    gain.connect?.(audioContext.destination);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + clip.durationSeconds);
    const voice: EffectVoice = {
      startedAt: audioContext.currentTime,
      stop: () => {
        try {
          oscillator.stop(audioContext.currentTime);
        } catch {
          // Already stopped: safe no-op.
        }
      },
    };
    voices.push(voice);
    while (voices.length > (options.maxEffectVoices ?? EFFECT_VOICE_CAP)) {
      voices.shift()?.stop();
    }
  };

  return {
    get started(): boolean {
      return started;
    },
    get levels(): Readonly<Record<AudioChannel, number>> {
      return { ...levels };
    },
    get mutes(): Readonly<Record<AudioChannel, boolean>> {
      return { ...mutes };
    },
    play(sound: SoundId, playOptions: { pitchStep?: number } = {}): void {
      // A10 is reserved and no music file ships (D161).
      if (sound === 'A10') {
        return;
      }
      const clip = options.soundClip?.(sound) ?? null;
      if (clip === null) {
        return;
      }
      playClip({ ...clip, pitchStep: playOptions.pitchStep ?? 0 }, 'effects');
    },
    speak(item: ItemId, accent: Locale): Promise<Result<void, AudioError>> {
      if (!started) {
        return Promise.resolve(err({}));
      }
      const clip = options.voiceClip?.(item, accent) ?? null;
      if (clip === null) {
        // The UI still shows the caption; the game continues (FE12 edge case).
        return Promise.resolve(err({}));
      }
      playClip(clip, 'voice');
      return Promise.resolve(ok(undefined));
    },
    setLevel(channel: AudioChannel, level: number): void {
      if (!Number.isFinite(level)) {
        return;
      }
      levels[channel] = Math.min(1, Math.max(0, level));
    },
    setMuted(channel: AudioChannel, muted: boolean): void {
      mutes[channel] = muted;
    },
    async unlock(): Promise<void> {
      if (started) {
        return;
      }
      if (context === null && createContext !== undefined) {
        context = createContext();
      }
      if (context === null) {
        return;
      }
      try {
        await context.resume();
        started = true;
      } catch {
        // Autoplay refusal is expected and silent (FE12 behaviour 7).
        started = false;
      }
    },
  };
}
