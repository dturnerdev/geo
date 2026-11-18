import { utf8Decode } from './bytes.ts';

// Static pack host layout (FE02 behaviour 2). Requests are restricted to our
// host, carry no cookies, no query parameters and no identifying headers.
export const PACK_PATH_PREFIX = '/packs';

const DATA_FORMAT_PATTERN = /^[A-Za-z0-9._-]+$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

export function packManifestPath(dataFormat: string): string {
  if (!DATA_FORMAT_PATTERN.test(dataFormat)) {
    throw new TypeError('data format is not a safe path segment');
  }
  return `${PACK_PATH_PREFIX}/manifest-v${dataFormat}.json`;
}

export function packChunkPath(sha256: string): string {
  if (!SHA256_PATTERN.test(sha256)) {
    throw new TypeError('chunk path must be a lower-case SHA-256 hash');
  }
  return `${PACK_PATH_PREFIX}/chunks/${sha256}`;
}

export interface PackHostResponse {
  readonly status: number;
  readonly body: Uint8Array;
  readonly etag?: string;
}

export interface PackHost {
  fetchManifest(dataFormat: string, etag?: string): Promise<PackHostResponse>;
  fetchChunk(sha256: string): Promise<PackHostResponse>;
}

export interface FetchResponseLike {
  readonly status: number;
  readonly headers: { get(name: string): string | null };
  arrayBuffer(): Promise<ArrayBufferLike>;
}

export interface FetchInitLike {
  readonly method: 'GET';
  readonly credentials: 'omit';
  readonly cache: 'no-cache';
  readonly redirect: 'error';
  readonly headers: Readonly<Record<string, string>>;
}

export type FetchLike = (url: string, init: FetchInitLike) => Promise<FetchResponseLike>;

export interface StaticPackHostOptions {
  /** Absolute origin plus optional path prefix, with no query or fragment. */
  readonly baseUrl: string;
  readonly fetch?: FetchLike;
}

function defaultFetch(): FetchLike {
  const candidate = (
    globalThis as {
      readonly fetch?: (url: string, init: FetchInitLike) => Promise<FetchResponseLike>;
    }
  ).fetch;
  if (candidate === undefined) {
    throw new Error('fetch is unavailable (FE02)');
  }
  return (url, init) => candidate(url, init);
}

function normaliseBaseUrl(baseUrl: string): string {
  if (!/^https?:\/\/[^?#\s]+$/u.test(baseUrl)) {
    throw new TypeError('pack host must be an absolute http(s) URL with no query or fragment');
  }
  const authority = baseUrl.replace(/^https?:\/\//u, '').split('/')[0] ?? '';
  if (authority.includes('@')) {
    throw new TypeError('pack host must not contain credentials');
  }
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

export class StaticPackHost implements PackHost {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: StaticPackHostOptions) {
    this.baseUrl = normaliseBaseUrl(options.baseUrl);
    this.fetchImpl = options.fetch ?? defaultFetch();
  }

  get origin(): string {
    return this.baseUrl;
  }

  async fetchManifest(dataFormat: string, etag?: string): Promise<PackHostResponse> {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (etag !== undefined) {
      headers['if-none-match'] = etag;
    }
    return this.get(`${this.baseUrl}${packManifestPath(dataFormat)}`, headers);
  }

  async fetchChunk(sha256: string): Promise<PackHostResponse> {
    return this.get(`${this.baseUrl}${packChunkPath(sha256)}`, {
      accept: 'application/json',
    });
  }

  private async get(
    url: string,
    headers: Readonly<Record<string, string>>,
  ): Promise<PackHostResponse> {
    if (!url.startsWith(`${this.baseUrl}${PACK_PATH_PREFIX}/`)) {
      throw new TypeError('refusing to request a URL outside the pack host');
    }
    const response = await this.fetchImpl(url, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-cache',
      redirect: 'error',
      headers,
    });
    const body = new Uint8Array(await response.arrayBuffer());
    const etag = response.headers.get('etag') ?? undefined;
    return {
      status: response.status,
      body,
      ...(etag === undefined ? {} : { etag }),
    };
  }
}

export function decodeJsonBody(body: Uint8Array): unknown {
  return JSON.parse(utf8Decode(body)) as unknown;
}
