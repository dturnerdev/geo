import { describe, it } from 'vitest';

// FE12 Android checks that need CI gate 11, a release pipeline or physical
// reference devices. The pure mixer, haptics and settings slices are tested in
// packages/audio, packages/ui and packages/app-shell.
describe('FE12 Android external checks', () => {
  it.skip('AC-12.4 the merged Android manifest contains only the D178 permissions (CI gate 11)', () => {
    // Skipped here: tools/ci/src/check-manifest.ts (gate 11) owns the merged
    // manifest assertion. apps/android has `types: []`, so this package cannot
    // import the Node filesystem gate in its own test run.
  });

  it.skip('AC-12.8 a release build with any non-commercial test audio fails CI', () => {
    // Skipped: no release CI pipeline, build channel injection or approved
    // licence-tagged audio set exists in this worktree (M2-plan setup item 0).
  });

  it.skip('AC-12.10 haptics follow Android\u2019s touch-feedback setting (manual, reference devices)', () => {
    // Skipped: explicitly manual on the Galaxy A07 4G and Redmi A5, which are
    // unavailable locally. Native @capacitor/haptics is not a permitted
    // dependency yet (the FE12 Android haptics ADR is unresolved).
  });
});
