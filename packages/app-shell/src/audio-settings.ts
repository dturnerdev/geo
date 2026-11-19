import type { DomainEvent, ProjectedState } from '@geo/domain';
import {
  AUDIO_CHANNELS,
  DEFAULT_CHANNEL_LEVELS,
  DEFAULT_CHANNEL_MUTES,
  type AudioChannel,
} from '../../audio/src/index.ts';
import type { EventFactory } from './event-factory.ts';

// Setting keys are part of the event payload contract (FE05, FE12).
export const AUDIO_LEVEL_SETTING_KEYS: Readonly<Record<AudioChannel, string>> = {
  master: 'audio.master.level',
  voice: 'audio.voice.level',
  music: 'audio.music.level',
  effects: 'audio.effects.level',
};

export const AUDIO_MUTE_SETTING_KEYS: Readonly<Record<AudioChannel, string>> = {
  master: 'audio.master.muted',
  voice: 'audio.voice.muted',
  music: 'audio.music.muted',
  effects: 'audio.effects.muted',
};

export const HAPTICS_SETTING_KEY = 'haptics.enabled';

export interface AudioSettings {
  readonly levels: Readonly<Record<AudioChannel, number>>;
  readonly mutes: Readonly<Record<AudioChannel, boolean>>;
  readonly hapticsEnabled: boolean;
}

// D161: music is off by default and no music ships. D162: haptics are on by
// default where the platform supports them.
export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  levels: { ...DEFAULT_CHANNEL_LEVELS },
  mutes: { ...DEFAULT_CHANNEL_MUTES },
  hapticsEnabled: true,
};

function settingValue(state: ProjectedState, key: string): unknown {
  return state.settings[key]?.value;
}

function readLevel(state: ProjectedState, channel: AudioChannel): number {
  const value = settingValue(state, AUDIO_LEVEL_SETTING_KEYS[channel]);
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : DEFAULT_AUDIO_SETTINGS.levels[channel];
}

function readMuted(state: ProjectedState, channel: AudioChannel): boolean {
  const value = settingValue(state, AUDIO_MUTE_SETTING_KEYS[channel]);
  return typeof value === 'boolean' ? value : DEFAULT_AUDIO_SETTINGS.mutes[channel];
}

// Rebuild from the projection only, so a restart or import resolves the same
// levels and mutes without extra state (FE05 behaviour 3, AC-12.5).
export function audioSettingsFromProjection(state: ProjectedState): AudioSettings {
  const levels = {} as Record<AudioChannel, number>;
  const mutes = {} as Record<AudioChannel, boolean>;
  for (const channel of AUDIO_CHANNELS) {
    levels[channel] = readLevel(state, channel);
    mutes[channel] = readMuted(state, channel);
  }
  const haptics = settingValue(state, HAPTICS_SETTING_KEY);
  return {
    levels,
    mutes,
    hapticsEnabled: typeof haptics === 'boolean' ? haptics : DEFAULT_AUDIO_SETTINGS.hapticsEnabled,
  };
}

export interface AudioSettingChange {
  readonly key: string;
  readonly value: number | boolean;
}

export function changedAudioSettings(
  before: AudioSettings,
  after: AudioSettings,
): readonly AudioSettingChange[] {
  const changes: AudioSettingChange[] = [];
  for (const channel of AUDIO_CHANNELS) {
    if (before.levels[channel] !== after.levels[channel]) {
      changes.push({ key: AUDIO_LEVEL_SETTING_KEYS[channel], value: after.levels[channel] });
    }
    if (before.mutes[channel] !== after.mutes[channel]) {
      changes.push({ key: AUDIO_MUTE_SETTING_KEYS[channel], value: after.mutes[channel] });
    }
  }
  if (before.hapticsEnabled !== after.hapticsEnabled) {
    changes.push({ key: HAPTICS_SETTING_KEY, value: after.hapticsEnabled });
  }
  return changes;
}

// One SettingChanged per changed field. The caller appends them in one
// transaction, so sliders and mutes take effect on the next projection.
export function createAudioSettingEvents(
  factory: EventFactory,
  before: AudioSettings,
  after: AudioSettings,
): readonly DomainEvent[] {
  return changedAudioSettings(before, after).map((change) =>
    factory.create('SettingChanged', { key: change.key, value: change.value }),
  );
}
