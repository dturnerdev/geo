import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { cacheDetailChunkUrls, DETAIL_CACHE_NAME } from './detail-cache.ts';

const ORIGIN = 'https://app.example';

function digest(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function fakeCache() {
  const stored = new Map<string, Response>();
  const cache = {
    put: vi.fn((url: string, response: Response) => {
      stored.set(url, response);
      return Promise.resolve();
    }),
  };
  return {
    stored,
    cache,
    storage: {
      open: vi.fn((name: string) => {
        expect(name).toBe(DETAIL_CACHE_NAME);
        return Promise.resolve(cache);
      }),
    } as unknown as CacheStorage,
  };
}

function responseFor(body: string): Response {
  return new Response(new TextEncoder().encode(body), { status: 200 });
}

describe('FE09 web detail cache', () => {
  it('AC-09.6 caches only same-origin content-addressed chunk URLs', async () => {
    const bytes = new TextEncoder().encode('{"geometry":{}}');
    const hash = digest(bytes);
    const ownUrl = `${ORIGIN}/packs/chunks/${hash}`;
    const fetchImpl = vi.fn(() => Promise.resolve(responseFor('{"geometry":{}}')));
    const { storage, stored } = fakeCache();

    const outcome = await cacheDetailChunkUrls(
      [ownUrl, `https://cdn.example/packs/chunks/${hash}`],
      ORIGIN,
      {
        cacheStorage: storage,
        fetchImpl: fetchImpl as unknown as typeof fetch,
        hash: () => Promise.resolve(hash),
      },
    );

    expect(outcome.cached).toEqual([ownUrl]);
    expect(outcome.skipped).toEqual([
      { url: `https://cdn.example/packs/chunks/${hash}`, reason: 'outside-pack-host' },
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(ownUrl, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-cache',
      redirect: 'error',
    });
    expect(stored.has(ownUrl)).toBe(true);
  });

  it('does not promote a chunk whose bytes do not match its URL hash', async () => {
    const hash = 'a'.repeat(64);
    const url = `${ORIGIN}/packs/chunks/${hash}`;
    const { storage, stored } = fakeCache();

    const outcome = await cacheDetailChunkUrls([url], ORIGIN, {
      cacheStorage: storage,
      fetchImpl: (() => Promise.resolve(responseFor('{"geometry":{}}'))) as unknown as typeof fetch,
      hash: () => Promise.resolve('b'.repeat(64)),
    });

    expect(outcome.cached).toEqual([]);
    expect(outcome.skipped).toEqual([{ url, reason: 'bad-hash' }]);
    expect(stored.size).toBe(0);
  });

  it('reports a missing cache/network without throwing', async () => {
    const url = `${ORIGIN}/packs/chunks/${'a'.repeat(64)}`;
    const outcome = await cacheDetailChunkUrls([url], ORIGIN, {
      fetchImpl: (() => {
        throw new Error('offline');
      }) as unknown as typeof fetch,
      hash: () => Promise.resolve('a'.repeat(64)),
    });
    expect(outcome.skipped).toEqual([{ url, reason: 'cache-unavailable' }]);
  });
});
