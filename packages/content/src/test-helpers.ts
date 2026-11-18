import { createHash, generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import { canonicalJson } from './canonical-json.ts';
import { utf8Encode } from './bytes.ts';
import {
  mergePackParts,
  parsePackPayload,
  parsePackPart,
  type PackManifest,
  type PackPart,
} from './pack-schema.ts';
import type { ContentPack, PackChunk } from './content-source.ts';
import type { PackSigningKeys } from './signing-keys.ts';
import type { PackHost, PackHostResponse } from './host.ts';

export interface TestSigningKey {
  readonly id: string;
  readonly keys: PackSigningKeys;
  readonly privateKey: KeyObject;
}

export function createTestSigningKeys(id = 'test-key'): TestSigningKey {
  const pair = generateKeyPairSync('ed25519');
  const der = pair.publicKey.export({ format: 'der', type: 'spki' });
  const raw = der.subarray(der.length - 32).toString('base64');
  return {
    id,
    privateKey: pair.privateKey,
    keys: {
      current: { id, publicKey: raw },
      next: { id: `${id}-next`, publicKey: raw },
    },
  };
}

export interface BuildPackOptions {
  readonly parts: readonly PackPart[];
  readonly packVersion: string;
  readonly dataFormat?: string;
  readonly signing: TestSigningKey;
  readonly keyId?: string;
  readonly rollbackTo?: string;
  /** Sign a different body but keep the real manifest, for AC-02.2. */
  readonly signWith?: KeyObject;
  readonly chunkBytes?: readonly Uint8Array[];
}

export interface BuiltPack {
  readonly manifest: PackManifest;
  readonly chunks: readonly PackChunk[];
  readonly pack: ContentPack;
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function buildPack(options: BuildPackOptions): BuiltPack {
  const chunkBytes =
    options.chunkBytes ?? options.parts.map((part) => utf8Encode(JSON.stringify(part)));
  const chunks = chunkBytes.map((data) => ({
    sha256: sha256(data),
    data,
  }));

  const body = {
    formatVersion: 1 as const,
    packVersion: options.packVersion,
    dataFormat: options.dataFormat ?? '1',
    createdAt: 1_763_500_800_000,
    chunks: chunks.map((chunk) => ({ sha256: chunk.sha256 })),
    ...(options.rollbackTo === undefined ? {} : { rollbackTo: options.rollbackTo }),
  };
  const signature = sign(
    null,
    Buffer.from(canonicalJson(body), 'utf8'),
    options.signWith ?? options.signing.privateKey,
  ).toString('base64');
  const manifest: PackManifest = {
    ...body,
    signature: { keyId: options.keyId ?? options.signing.id, value: signature },
  };
  const payload = parsePackPayload(
    mergePackParts(options.parts.map((part) => parsePackPart(part))),
  );
  return {
    manifest,
    chunks,
    pack: {
      packVersion: options.packVersion,
      dataFormat: manifest.dataFormat,
      manifest,
      payload,
      chunks,
    },
  };
}

export class MemoryPackHost implements PackHost {
  manifest: PackHostResponse | null = null;
  readonly chunks = new Map<string, PackHostResponse>();
  readonly manifestRequests: (string | undefined)[] = [];
  readonly chunkRequests: string[] = [];

  fetchManifest(_dataFormat: string, etag?: string): Promise<PackHostResponse> {
    this.manifestRequests.push(etag);
    if (this.manifest === null) {
      return Promise.reject(new Error('offline'));
    }
    return Promise.resolve(this.manifest);
  }

  fetchChunk(sha256: string): Promise<PackHostResponse> {
    this.chunkRequests.push(sha256);
    const response = this.chunks.get(sha256);
    if (response === undefined) {
      return Promise.reject(new Error('offline'));
    }
    return Promise.resolve(response);
  }

  publish(pack: BuiltPack, etag = '"pack-etag"'): void {
    this.manifest = {
      status: 200,
      body: utf8Encode(JSON.stringify(pack.manifest)),
      etag,
    };
    this.chunks.clear();
    for (const chunk of pack.chunks) {
      this.chunks.set(chunk.sha256, {
        status: 200,
        body: chunk.data,
      });
    }
  }
}

export class OfflineHost implements PackHost {
  fetchManifest(): Promise<PackHostResponse> {
    return Promise.reject(new Error('offline'));
  }

  fetchChunk(): Promise<PackHostResponse> {
    return Promise.reject(new Error('offline'));
  }
}
