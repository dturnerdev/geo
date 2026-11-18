import { describe, expect, it } from 'vitest';
import { TabCoordinator } from './tab-lock.ts';

describe('web tab lock', () => {
  it.skip('AC-01.10 second tab shows S19, Use here moves the lock within 1 s', () => {
    // Skipped: needs the Playwright browser harness, which is not installed in
    // this worktree. TabCoordinator is exercised by the web build only.
  });

  it('falls back to an active tab when the Web Locks API is unavailable', async () => {
    const coordinator = new TabCoordinator('test-fallback');
    await expect(coordinator.claim()).resolves.toBe('active');
  });
});
