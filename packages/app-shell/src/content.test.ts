import { BUNDLED_CONTENT_PACK, type ContentSource, type UpdateStatus } from '@geo/content';
import { ok, type Result } from '@geo/domain';
import { InMemoryStore } from '@geo/storage';
import { describe, expect, it } from 'vitest';
import { applyReadyContentPackAtPause } from './content.ts';
import { testFactory } from './test-helpers.ts';

function fakeSource(applied: { count: number }): ContentSource {
  return {
    current: () => BUNDLED_CONTENT_PACK,
    checkForUpdate: (): Promise<Result<UpdateStatus, never>> =>
      Promise.resolve(ok({ kind: 'up-to-date', packVersion: BUNDLED_CONTENT_PACK.packVersion })),
    applyReadyPack: () => {
      applied.count += 1;
      return ok('2.0.0');
    },
  };
}

describe('FE02 app-shell integration', () => {
  it('AC-02.3 a ready pack is never applied while a round is in progress', async () => {
    const applied = { count: 0 };
    const store = new InMemoryStore();
    const { factory } = testFactory();
    const options = {
      source: fakeSource(applied),
      factory,
      store,
    };

    const duringRound = await applyReadyContentPackAtPause({
      ...options,
      roundInProgress: true,
    });
    expect(duringRound).toEqual({ status: 'deferred', reason: 'round-in-progress' });
    expect(applied.count).toBe(0);
    expect(await store.count()).toBe(0);

    const atPause = await applyReadyContentPackAtPause({
      ...options,
      roundInProgress: false,
    });
    expect(atPause).toEqual({
      status: 'applied',
      packVersion: '2.0.0',
      dataFormat: BUNDLED_CONTENT_PACK.dataFormat,
    });
    expect(applied.count).toBe(1);
    expect(await store.count()).toBe(1);

    const events = [];
    for await (const event of store.readAll()) {
      events.push(event);
    }
    expect(events[0]?.type).toBe('ContentPackApplied');
    expect(events[0]?.payload).toEqual({
      packVersion: '2.0.0',
      dataFormat: BUNDLED_CONTENT_PACK.dataFormat,
    });
  });

  it.skip('AC-02.3 a ready pack is never applied while a round is in progress (E2E with forced update mid-round)', () => {
    // Skipped: no web/Android E2E runner is available in this worktree.
  });
});
