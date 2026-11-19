import { describe, expect, it } from 'vitest';
import type { Mixer } from '../../audio/src/index.ts';
import { hapticsSettingVisible, speakWithCaption } from './feedback.ts';

function failingMixer(): Mixer {
  return {
    play: () => undefined,
    speak: () => Promise.reject(new Error('clip missing')),
    setLevel: () => undefined,
    setMuted: () => undefined,
  };
}

describe('FE12 captions and feedback', () => {
  it('AC-12.7 every voice clip shows a caption', async () => {
    const caption = await speakWithCaption(
      failingMixer(),
      'country-fr',
      'en-GB',
      'France, a country in Western Europe.',
    );
    expect(caption).toEqual({
      item: 'country-fr',
      accent: 'en-GB',
      text: 'France, a country in Western Europe.',
    });
  });

  it.skip('AC-12.7 the mounted web UI shows the caption during playback (E2E)', () => {
    // Skipped: the web play screen and voice asset set are not part of this
    // FE12 slice, and Playwright has no mounted audio surface to assert against.
  });

  it('AC-12.3 the haptics setting is hidden when the platform is unsupported', () => {
    expect(hapticsSettingVisible(false)).toBe(false);
    expect(hapticsSettingVisible(true)).toBe(true);
  });
});
