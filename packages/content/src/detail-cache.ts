import { decodeJsonBody, packChunkPath } from './host.ts';
import { packPartSchema, type PackPart } from './pack-schema.ts';
import { networkDeferral, type DeferralReason, type NetworkConditions } from './scheduler.ts';
import type { ContentPack, PackChunk } from './content-source.ts';
import type { DetailLevel, RegionChunkId } from './geometry.ts';

// FE09 behaviour 4 and 04 §8.2: after the first completed round the service
// worker may cache the active pack's L1/L2 chunks. The planner is pure so the
// web and tests share one policy: no data saver, no disallowed network, and
// only same-origin pack-chunk URLs.

export interface DetailChunkReference {
  readonly level: DetailLevel;
  readonly region: RegionChunkId | null;
  readonly sha256: string;
}

export interface DetailCachePlanInput {
  readonly pack: ContentPack;
  /** The configured static pack host origin, for example `location.origin`. */
  readonly baseUrl: string;
  readonly conditions: NetworkConditions;
  readonly completedRound: boolean;
}

export type DetailCacheBlockedReason = 'no-completed-round' | 'offline' | DeferralReason;

export interface DetailCachePlan {
  readonly shouldStart: boolean;
  readonly reason: DetailCacheBlockedReason | null;
  readonly references: readonly DetailChunkReference[];
  /** Same-origin, content-addressed URLs only (AC-09.6). */
  readonly urls: readonly string[];
}

function levelsInChunk(chunk: PackChunk): readonly DetailChunkReference[] {
  let part: PackPart;
  try {
    const parsed = packPartSchema.safeParse(decodeJsonBody(chunk.data));
    if (!parsed.success) {
      return [];
    }
    part = parsed.data;
  } catch {
    return [];
  }

  const references: DetailChunkReference[] = [];
  for (const geometryChunk of part.geometry?.chunks ?? []) {
    references.push({
      level: geometryChunk.level,
      region: geometryChunk.region,
      sha256: chunk.sha256,
    });
  }
  for (const region of part.geometry?.regionChunks ?? []) {
    references.push({ level: region.level, region: region.id, sha256: chunk.sha256 });
  }
  return references;
}

/** Every L1/L2 chunk carried by a pack, in manifest order with duplicates removed. */
export function detailCacheReferences(pack: ContentPack): readonly DetailChunkReference[] {
  const seen = new Set<string>();
  const references: DetailChunkReference[] = [];
  for (const chunk of pack.chunks) {
    for (const reference of levelsInChunk(chunk)) {
      if (reference.level === 'L0') {
        continue;
      }
      const key = `${reference.level}:${reference.region ?? ''}:${reference.sha256}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      references.push(reference);
    }
  }
  return references;
}

function originOf(baseUrl: string): string {
  return new URL(baseUrl).origin;
}

export function planDetailCache(input: DetailCachePlanInput): DetailCachePlan {
  const origin = originOf(input.baseUrl);
  const references = detailCacheReferences(input.pack);
  const urls = references.map((reference) => `${origin}${packChunkPath(reference.sha256)}`);

  if (!input.completedRound) {
    return { shouldStart: false, reason: 'no-completed-round', references, urls };
  }
  if (!input.conditions.online) {
    return { shouldStart: false, reason: 'offline', references, urls };
  }
  const deferral = networkDeferral('background', input.conditions);
  if (deferral !== null) {
    return { shouldStart: false, reason: deferral, references, urls };
  }
  return { shouldStart: true, reason: null, references, urls };
}

/**
 * A service worker may only touch the existing immutable pack-chunk layout on
 * our own origin (04 §8.2, AC-09.6).
 */
export function isDetailChunkUrl(url: string, baseUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    parsed.origin === originOf(baseUrl) &&
    /^\/packs\/chunks\/[0-9a-f]{64}$/u.test(parsed.pathname) &&
    parsed.search === '' &&
    parsed.hash === ''
  );
}
