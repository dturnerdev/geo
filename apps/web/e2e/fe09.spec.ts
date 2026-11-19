import { test } from '@playwright/test';

test.describe('FE09 detail cache browser checks', () => {
  test.skip('AC-09.3 after one completed round online, the web app zooms to L2 for a region in airplane mode', () => {
    // Skipped: root-scoped service-worker registration and the L1/L2 pack-chunk
    // endpoint are hosting concerns. The Vite dev server only allows a worker
    // under /src/, which cannot control the app page, and the M1 web harness
    // does not mount the FE06 globe/zoom UI yet. The cache policy and offline
    // fallback are covered by the unit tests; this remains a hosted E2E check.
  });
});
