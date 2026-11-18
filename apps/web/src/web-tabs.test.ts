import { describe, expect, it } from 'vitest';
import { TabCoordinator } from './tab-lock.ts';

describe('web tab lock', () => {
  it.skip('AC-01.10 second tab shows S19, Use here moves the lock within 1 s', () => {
    // Covered by the Playwright check in apps/web/e2e/m0.spec.ts; the Vitest
    // environment has no Web Locks API or BroadcastChannel.
  });

  it('falls back to an active tab when the Web Locks API is unavailable', async () => {
    const coordinator = new TabCoordinator('test-fallback');
    await expect(coordinator.claim()).resolves.toBe('active');
  });
});
