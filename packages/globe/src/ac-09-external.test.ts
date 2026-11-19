import { describe, it } from 'vitest';

// These FE09 acceptance criteria need resources outside the assigned package
// paths: an Android package build and Redmi A5 hardware.
describe('FE09 acceptance criteria that need external harnesses', () => {
  it.skip('AC-09.2 the Android package with L0–L2 is at most 40 MB (CI gate 8)', () => {
    // Skipped: the Android package is built and measured by the hosted CI gate
    // and no APK/AAB build is available locally. The web size budget test and
    // gate 8 script cover the shared threshold logic.
  });

  it.skip('AC-09.8 Redmi A5 survives five minutes of zooming across all levels without a crash or memory breach', () => {
    // Skipped: physical-device memory and performance run, manual and logged.
  });
});
