import type { HapticId, Haptics, Mixer } from '../../audio/src/index.ts';
import type { ItemId } from '../../domain/src/ids.ts';
import type { Locale } from '../../domain/src/locale.ts';

export interface VoiceCaption {
  readonly item: ItemId;
  readonly accent: Locale;
  readonly text: string;
}

export function voiceCaption(item: ItemId, accent: Locale, text: string): VoiceCaption {
  return { item, accent, text };
}

// D57: captions are always shown for voice. The caption is returned even when
// the clip is missing, fails to decode or the mixer rejects the request.
export async function speakWithCaption(
  mixer: Mixer,
  item: ItemId,
  accent: Locale,
  text: string,
): Promise<VoiceCaption> {
  try {
    await mixer.speak(item, accent);
  } catch {
    // The caption still shows and the game continues (FE12 edge cases).
  }
  return voiceCaption(item, accent, text);
}

// Web hides the haptics switch where navigator.vibrate is absent (AC-12.3).
export function hapticsSettingVisible(supported: boolean): boolean {
  return supported;
}

// A null id means the outcome is never allowed a haptic (D162, AC-12.1).
export function fireOutcomeHaptic(haptics: Haptics, id: HapticId | null, enabled: boolean): void {
  if (id === null || !enabled) {
    return;
  }
  haptics.fire(id);
}
