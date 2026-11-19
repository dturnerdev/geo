import { describe, it } from 'vitest';

// These acceptance criteria need resources that are not available in the
// assigned package paths: hosted reference screenshots, physical Android
// hardware, a browser WebGL context-loss harness, and the Playwright e2e
// suite under apps/web (owned elsewhere).
describe('FE06 acceptance criteria that need external harnesses', () => {
  it.skip('AC-06.2 CI gate 6 screenshots match for poles, the 180° line, Fiji, Malta and flat Antarctica', () => {
    // Skipped: the reference screenshot set and hosted gate 6 are a separate
    // blocked M1 setup task; reference devices are unavailable locally.
  });

  it.skip('AC-06.3 Galaxy A07 4G reaches 60 fps and Redmi A5 stays at 30 fps without crashes', () => {
    // Skipped: physical-device performance run, manual and logged.
  });

  it.skip('AC-06.6 a forced context loss mid-round restores the globe without losing the round', () => {
    // Skipped: needs a browser WebGL context-loss harness in the hosted e2e
    // suite. The controller retains camera, overlays, labels and atlas state
    // and rebuilds GPU resources on `webglcontextrestored`.
  });

  it.skip('AC-06.8 globe keys do nothing unless the globe has focus', () => {
    // Skipped: Playwright e2e lives under apps/web/e2e, outside the FE06
    // package paths; hosted-only browser harness.
  });
});
