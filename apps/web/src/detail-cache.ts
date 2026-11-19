import {
  createWebPackCrypto,
  isDetailChunkUrl,
  planDetailCache,
  sha256Hex,
  type DetailCachePlan,
  type DetailCachePlanInput,
} from '@geo/content';
import serviceWorkerUrl from './service-worker.ts?worker&url';

export const DETAIL_CACHE_NAME = 'geo-detail-v1';

export type DetailCacheSkipReason =
  | 'outside-pack-host'
  | 'cache-unavailable'
  | 'fetch-failed'
  | 'bad-status'
  | 'bad-hash'
  | 'store-failed';

export interface DetailCacheSkip {
  readonly url: string;
  readonly reason: DetailCacheSkipReason;
}

export interface DetailCacheOutcome {
  readonly cached: readonly string[];
  readonly skipped: readonly DetailCacheSkip[];
}

export interface DetailCacheDependencies {
  readonly cacheStorage?: CacheStorage;
  readonly fetchImpl?: typeof fetch;
  readonly hash?: (data: Uint8Array) => Promise<string>;
}

function defaultCacheStorage(): CacheStorage | null {
  const candidate = globalThis.caches;
  return candidate === undefined ? null : candidate;
}

function expectedHash(url: string): string | null {
  const match = /\/packs\/chunks\/([0-9a-f]{64})$/u.exec(new URL(url).pathname);
  return match?.[1] ?? null;
}

/**
 * Cache same-origin immutable L1/L2 chunks through the Cache API. The service
 * worker uses the same rules; this function exists so the page can prime the
 * cache when a worker is not available and so tests can exercise the policy.
 * The SHA-256 in the URL must match the bytes before an entry is stored
 * (04 §8.2).
 */
export async function cacheDetailChunkUrls(
  urls: readonly string[],
  baseUrl: string,
  dependencies: DetailCacheDependencies = {},
): Promise<DetailCacheOutcome> {
  const cacheStorage = dependencies.cacheStorage ?? defaultCacheStorage();
  if (cacheStorage === null) {
    return {
      cached: [],
      skipped: urls.map((url) => ({ url, reason: 'cache-unavailable' })),
    };
  }

  const fetchImpl = dependencies.fetchImpl ?? globalThis.fetch;
  const hash = dependencies.hash ?? ((data: Uint8Array) => sha256Hex(createWebPackCrypto(), data));
  const cache = await cacheStorage.open(DETAIL_CACHE_NAME);
  const cached: string[] = [];
  const skipped: DetailCacheSkip[] = [];

  for (const url of urls) {
    if (!isDetailChunkUrl(url, baseUrl)) {
      skipped.push({ url, reason: 'outside-pack-host' });
      continue;
    }

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: 'GET',
        credentials: 'omit',
        cache: 'no-cache',
        redirect: 'error',
      });
    } catch {
      skipped.push({ url, reason: 'fetch-failed' });
      continue;
    }

    if (!response.ok) {
      skipped.push({ url, reason: 'bad-status' });
      continue;
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const digest = await hash(bytes);
    if (digest !== expectedHash(url)) {
      skipped.push({ url, reason: 'bad-hash' });
      continue;
    }

    try {
      await cache.put(url, new Response(bytes, { status: 200 }));
      cached.push(url);
    } catch {
      skipped.push({ url, reason: 'store-failed' });
    }
  }

  return { cached, skipped };
}

export interface DetailServiceWorkerOptions {
  /** Hosting may allow the built worker asset to control the app's root scope. */
  readonly scope?: string;
}

export async function registerDetailServiceWorker(
  options: DetailServiceWorkerOptions = {},
): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }
  try {
    return await navigator.serviceWorker.register(serviceWorkerUrl, {
      type: 'module',
      ...(options.scope === undefined ? {} : { scope: options.scope }),
    });
  } catch {
    // Caching is an optimisation: with no worker the best cached level stays
    // on screen and no user-facing error is shown (FE09 behaviour 4).
    return null;
  }
}

/**
 * Ask the service worker to cache the active pack's L1/L2 chunks. The network
 * and data-saver decision is made before this call by `planDetailCache`.
 */
export async function startDetailCache(input: DetailCachePlanInput): Promise<DetailCachePlan> {
  const plan = planDetailCache(input);
  if (!plan.shouldStart || plan.urls.length === 0) {
    return plan;
  }

  const registration = await registerDetailServiceWorker();
  const worker =
    registration?.active ??
    registration?.waiting ??
    registration?.installing ??
    navigator.serviceWorker.controller;
  worker?.postMessage({ type: 'cache-detail-chunks', urls: plan.urls });
  return plan;
}
