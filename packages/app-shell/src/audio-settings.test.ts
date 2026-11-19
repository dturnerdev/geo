import { projectEvents } from '@geo/domain';
import { describe, expect, it } from 'vitest';
import {
  AUDIO_LEVEL_SETTING_KEYS,
  AUDIO_MUTE_SETTING_KEYS,
  audioSettingsFromProjection,
  DEFAULT_AUDIO_SETTINGS,
  createAudioSettingEvents,
} from './audio-settings.ts';
import { testFactory } from './test-helpers.ts';

describe('FE12 persisted channel settings', () => {
  it('AC-12.5 each channel\u2019s slider and mute work separately and survive restart', () => {
    const { factory } = testFactory();
    const changed = {
      levels: { ...DEFAULT_AUDIO_SETTINGS.levels, voice: 0.4, effects: 0.9 },
      mutes: { ...DEFAULT_AUDIO_SETTINGS.mutes, master: true, music: false },
      hapticsEnabled: false,
    };

    const events = createAudioSettingEvents(factory, DEFAULT_AUDIO_SETTINGS, changed);
    expect(events).toHaveLength(5);
    expect(events.map((event) => event.type)).toEqual(Array(5).fill('SettingChanged'));

    // A restart rebuilds from the projection alone, with no in-memory state.
    const restarted = audioSettingsFromProjection(projectEvents(events));
    expect(restarted).toEqual(changed);
    expect(restarted.levels.voice).toBe(0.4);
    expect(restarted.levels.effects).toBe(0.9);
    expect(restarted.levels.master).toBe(DEFAULT_AUDIO_SETTINGS.levels.master);
    expect(restarted.mutes.master).toBe(true);
    expect(restarted.mutes.music).toBe(false);
    expect(restarted.mutes.voice).toBe(DEFAULT_AUDIO_SETTINGS.mutes.voice);
  });

  it('AC-12.5 one slider or mute change writes exactly one SettingChanged', () => {
    const { factory } = testFactory();
    const voiceLevel = {
      ...DEFAULT_AUDIO_SETTINGS,
      levels: { ...DEFAULT_AUDIO_SETTINGS.levels, voice: 0.25 },
    };
    const levelEvents = createAudioSettingEvents(factory, DEFAULT_AUDIO_SETTINGS, voiceLevel);
    expect(levelEvents).toHaveLength(1);
    expect(levelEvents[0]?.payload).toEqual({
      key: AUDIO_LEVEL_SETTING_KEYS.voice,
      value: 0.25,
    });

    const effectsMute = {
      ...DEFAULT_AUDIO_SETTINGS,
      mutes: { ...DEFAULT_AUDIO_SETTINGS.mutes, effects: true },
    };
    const muteEvents = createAudioSettingEvents(factory, DEFAULT_AUDIO_SETTINGS, effectsMute);
    expect(muteEvents).toHaveLength(1);
    expect(muteEvents[0]?.payload).toEqual({
      key: AUDIO_MUTE_SETTING_KEYS.effects,
      value: true,
    });
  });

  it('AC-12.6 music is off by default', () => {
    expect(DEFAULT_AUDIO_SETTINGS.levels.music).toBe(0);
    expect(DEFAULT_AUDIO_SETTINGS.mutes.music).toBe(true);
    expect(audioSettingsFromProjection(projectEvents([]))).toEqual(DEFAULT_AUDIO_SETTINGS);
  });

  it('ignores malformed persisted values and keeps the defaults', () => {
    const { factory } = testFactory();
    const events = [
      factory.create('SettingChanged', { key: AUDIO_LEVEL_SETTING_KEYS.voice, value: 2 }),
      factory.create('SettingChanged', { key: AUDIO_MUTE_SETTING_KEYS.effects, value: 'yes' }),
    ];
    const settings = audioSettingsFromProjection(projectEvents(events));
    expect(settings.levels.voice).toBe(DEFAULT_AUDIO_SETTINGS.levels.voice);
    expect(settings.mutes.effects).toBe(DEFAULT_AUDIO_SETTINGS.mutes.effects);
  });
});
