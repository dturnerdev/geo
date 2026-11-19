import { describe, it } from 'vitest';

// These FE07 acceptance criteria need resources outside the assigned package
// paths: hosted reference screenshots and the hosted browser E2E suite.
describe('FE07 acceptance criteria that need external harnesses', () => {
  it.skip('AC-07.4 each border style draws with its own line pattern in both modes and colour-blind simulations distinguish them', () => {
    // Skipped: hosted reference screenshots and colour-blind simulations are a
    // separate blocked M1 setup task. The style-to-pattern data is covered by
    // border-pattern.test.ts.
  });

  it.skip('AC-07.9 after a perspective change everything shown uses the new perspective and no earlier rating changes', () => {
    // Skipped: the full check needs the app-shell pause flow, atlas state
    // (FE08, blocked on M3 LearnerState) and the hosted E2E suite. The
    // ContentView and history property tests cover the pure contracts.
  });
});
