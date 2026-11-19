import { describe, it } from 'vitest';

describe('FE10 external accessibility and manual checks', () => {
  it.skip('AC-10.5 every map-based game can be completed by keyboard alone and by screen reader through the list alternative (Playwright + axe-core, manual screen-reader pass)', () => {
    // Skipped: this AC needs a mounted web UI, Playwright, axe-core and a
    // manual screen-reader pass. axe-core is not a permitted dependency and no
    // hosted browser/device harness is available in this build environment.
  });

  it.skip('AC-10.9 no timer is visible in any game (screenshot review, manual)', () => {
    // Skipped: this is explicitly a manual screenshot review across the game
    // catalogue. No reviewed screenshot set is supplied in this environment.
  });
});
