// FE09 detail cache. Vite bundles this file as a worker asset and the app
// registers it as a service worker. It only accepts our own immutable
// pack-chunk URLs (04 §8.2, AC-09.6).
const CACHE_NAME = 'geo-detail-v1';
const CHUNK_PATH = /^\/packs\/chunks\/[0-9a-f]{64}$/u;

interface ExtendableEventLike {
  waitUntil(promise: Promise<unknown>): void;
}

interface MessageEventLike extends ExtendableEventLike {
  readonly data: unknown;
}

interface FetchEventLike extends ExtendableEventLike {
  readonly request: Request;
  respondWith(response: Promise<Response>): void;
}

interface ServiceWorkerScopeLike {
  readonly location: Location;
  readonly clients: { claim(): Promise<void> };
  skipWaiting(): void;
  addEventListener(type: 'install', listener: () => void): void;
  addEventListener(type: 'activate', listener: (event: ExtendableEventLike) => void): void;
  addEventListener(type: 'message', listener: (event: MessageEventLike) => void): void;
  addEventListener(type: 'fetch', listener: (event: FetchEventLike) => void): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const scope = globalThis as unknown as ServiceWorkerScopeLike;

function isOwnChunk(url: URL): boolean {
  return (
    url.origin === scope.location.origin &&
    CHUNK_PATH.test(url.pathname) &&
    url.search === '' &&
    url.hash === ''
  );
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function cacheChunk(url: string): Promise<boolean> {
  const parsed = new URL(url);
  if (!isOwnChunk(parsed)) {
    return false;
  }
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'omit',
    cache: 'no-cache',
    redirect: 'error',
  });
  if (!response.ok) {
    return false;
  }
  const bytes = await response.arrayBuffer();
  const expected = parsed.pathname.slice(parsed.pathname.lastIndexOf('/') + 1);
  if ((await sha256Hex(bytes)) !== expected) {
    return false;
  }
  const cache = await caches.open(CACHE_NAME);
  await cache.put(url, new Response(bytes, { status: 200 }));
  return true;
}

scope.addEventListener('install', () => {
  scope.skipWaiting();
});

scope.addEventListener('activate', (event) => {
  event.waitUntil(scope.clients.claim());
});

scope.addEventListener('message', (event) => {
  const data = event.data;
  if (!isRecord(data) || data['type'] !== 'cache-detail-chunks') {
    return;
  }
  const urls = data['urls'];
  if (!Array.isArray(urls)) {
    return;
  }
  event.waitUntil(
    Promise.all(
      urls
        .filter((url): url is string => typeof url === 'string')
        .map((url) => cacheChunk(url).catch(() => false)),
    ),
  );
});

// Cached chunks answer offline; anything else falls through to the network so
// normal pack verification still runs in `@geo/content`.
scope.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (!isOwnChunk(url)) {
    return;
  }
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      return cached ?? fetch(event.request);
    }),
  );
});
