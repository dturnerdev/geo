import { err, ok, type Result } from '@geo/domain';
import { decodeJsonBody, type PackHost } from './host.ts';
import {
  issuesFromZod,
  manifestSigningMessage,
  mergePackParts,
  packManifestSchema,
  packPartSchema,
  packPayloadIsEqual,
  packPayloadSchema,
  type PackManifest,
  type PackPayload,
} from './pack-schema.ts';
import { createWebPackCrypto, sha256Hex, type PackCrypto } from './crypto.ts';
import { equalBytes } from './bytes.ts';
import {
  networkDeferral,
  UpdateScheduler,
  type DeferralReason,
  type NetworkConditions,
  type UpdateReason,
} from './scheduler.ts';
import type { PackSigningKeys } from './signing-keys.ts';

// Interfaces exactly as FE02 specifies (05-features/m0-foundations.md).
export interface ContentSource {
  current(): ContentPack;
  checkForUpdate(
    reason: 'launch' | 'background' | 'open',
  ): Promise<Result<UpdateStatus, PackError>>;
  applyReadyPack(): Result<PackVersion | null, PackError>;
}

export type PackError =
  | { kind: 'offline' }
  | { kind: 'bad-signature' }
  | { kind: 'bad-hash' }
  | { kind: 'invalid-content'; issues: readonly string[] }
  | { kind: 'unsupported-format' };

export type PackVersion = string;

export interface PackChunk {
  readonly sha256: string;
  readonly data: Uint8Array;
}

export interface ContentPack {
  readonly packVersion: PackVersion;
  readonly dataFormat: string;
  readonly manifest: PackManifest;
  readonly payload: PackPayload;
  readonly chunks: readonly PackChunk[];
}

export type UpdateStatus =
  | { readonly kind: 'up-to-date'; readonly packVersion: PackVersion }
  | {
      readonly kind: 'update-ready';
      readonly from: PackVersion;
      readonly to: PackVersion;
    }
  | { readonly kind: 'deferred'; readonly reason: DeferralReason };

export interface ContentDiagnostics {
  record(entry: {
    readonly at: number;
    readonly kind: 'pack-rollback' | 'error';
    readonly code: string;
    readonly count?: number;
  }): void;
}

export interface PackLifecycleHooks {
  readonly onStaged?: (pack: ContentPack) => void;
  readonly onApplied?: (pack: ContentPack, previous: ContentPack) => void;
  readonly onRolledBack?: (failed: ContentPack, restored: ContentPack, error: PackError) => void;
}

export type PackActivationGuard = (pack: ContentPack) => Result<void, PackError>;

export interface ContentSourceOptions {
  readonly host: PackHost;
  readonly keys: PackSigningKeys;
  readonly dataFormat: string;
  readonly bundledPack: ContentPack;
  readonly crypto?: PackCrypto;
  readonly scheduler?: UpdateScheduler;
  readonly network?: () => NetworkConditions;
  readonly now?: () => number;
  readonly hooks?: PackLifecycleHooks;
  readonly diagnostics?: ContentDiagnostics;
  readonly activationGuard?: PackActivationGuard;
}

const DEFAULT_NETWORK: NetworkConditions = {
  online: true,
  metered: false,
  dataSaver: false,
  batteryLow: false,
  mobileDataAllowed: false,
};

function defaultGuard(pack: ContentPack): Result<void, PackError> {
  const parsed = packPayloadSchema.safeParse(pack.payload);
  if (!parsed.success) {
    return err({ kind: 'invalid-content', issues: issuesFromZod(parsed.error) });
  }
  return ok(undefined);
}

function chunkSetMatches(manifest: PackManifest, pack: ContentPack): boolean {
  if (manifest.chunks.length !== pack.chunks.length) {
    return false;
  }
  return manifest.chunks.every((chunk, index) => pack.chunks[index]?.sha256 === chunk.sha256);
}

export class StaticContentSource implements ContentSource {
  private readonly host: PackHost;
  private readonly keys: PackSigningKeys;
  private readonly dataFormat: string;
  private readonly crypto: PackCrypto;
  private readonly scheduler: UpdateScheduler;
  private readonly network: () => NetworkConditions;
  private readonly now: () => number;
  private readonly hooks: PackLifecycleHooks;
  private readonly diagnostics: ContentDiagnostics | undefined;
  private readonly activationGuard: PackActivationGuard;
  private readonly chunks = new Map<string, Uint8Array>();

  private currentPack: ContentPack;
  private previousPack: ContentPack | null = null;
  private readyPack: ContentPack | null = null;
  private lastEtag: string | undefined;

  constructor(options: ContentSourceOptions) {
    this.host = options.host;
    this.keys = options.keys;
    this.dataFormat = options.dataFormat;
    this.crypto = options.crypto ?? createWebPackCrypto();
    this.scheduler = options.scheduler ?? new UpdateScheduler();
    this.network = options.network ?? (() => DEFAULT_NETWORK);
    this.now = options.now ?? (() => Date.now());
    this.hooks = options.hooks ?? {};
    this.diagnostics = options.diagnostics;
    this.activationGuard = options.activationGuard ?? defaultGuard;
    this.currentPack = options.bundledPack;
    this.rememberChunks(options.bundledPack);
  }

  current(): ContentPack {
    return this.currentPack;
  }

  async checkForUpdate(reason: UpdateReason): Promise<Result<UpdateStatus, PackError>> {
    const conditions = this.network();
    if (!conditions.online) {
      return err({ kind: 'offline' });
    }

    const networkDefer = networkDeferral(reason, conditions);
    if (networkDefer !== null) {
      return ok({ kind: 'deferred', reason: networkDefer });
    }

    const at = this.now();
    const decision = this.scheduler.canCheck(reason, at);
    if (!decision.allowed) {
      return ok({
        kind: 'deferred',
        reason: decision.reason ?? 'too-soon',
      });
    }
    this.scheduler.recordCheck(reason, at);

    let response;
    try {
      response = await this.host.fetchManifest(this.dataFormat, this.lastEtag);
    } catch {
      return err({ kind: 'offline' });
    }

    if (response.status === 304) {
      return ok({ kind: 'up-to-date', packVersion: this.currentPack.packVersion });
    }
    if (response.status !== 200) {
      return err({ kind: 'offline' });
    }

    let rawManifest: unknown;
    try {
      rawManifest = decodeJsonBody(response.body);
    } catch {
      return err({
        kind: 'invalid-content',
        issues: ['manifest is not valid JSON'],
      });
    }

    const parsedManifest = packManifestSchema.safeParse(rawManifest);
    if (!parsedManifest.success) {
      return err({
        kind: 'invalid-content',
        issues: issuesFromZod(parsedManifest.error),
      });
    }
    const manifest = parsedManifest.data;

    const key = this.signingKeyFor(manifest);
    if (key === null) {
      return err({ kind: 'bad-signature' });
    }
    const signatureValid = await this.crypto.verifyEd25519({
      publicKey: key.publicKey,
      signature: manifest.signature.value,
      message: manifestSigningMessage(manifest),
    });
    if (!signatureValid) {
      return err({ kind: 'bad-signature' });
    }

    if (manifest.dataFormat !== this.dataFormat) {
      return err({ kind: 'unsupported-format' });
    }

    if (manifest.packVersion === this.currentPack.packVersion) {
      if (!chunkSetMatches(manifest, this.currentPack)) {
        return err({
          kind: 'invalid-content',
          issues: ['a pack version changed its immutable chunks'],
        });
      }
      this.lastEtag = response.etag;
      return ok({ kind: 'up-to-date', packVersion: this.currentPack.packVersion });
    }

    const fetchedChunks: PackChunk[] = [];
    for (const descriptor of manifest.chunks) {
      const cached = this.chunks.get(descriptor.sha256);
      if (cached !== undefined) {
        fetchedChunks.push({ sha256: descriptor.sha256, data: cached });
        continue;
      }

      let chunkResponse;
      try {
        chunkResponse = await this.host.fetchChunk(descriptor.sha256);
      } catch {
        return err({ kind: 'offline' });
      }
      // A missing chunk abandons the update; completed chunks stay cached for
      // the next check (FE02 edge cases).
      if (chunkResponse.status !== 200) {
        return err({ kind: 'bad-hash' });
      }
      const hash = await sha256Hex(this.crypto, chunkResponse.body);
      if (hash !== descriptor.sha256) {
        return err({ kind: 'bad-hash' });
      }
      this.chunks.set(descriptor.sha256, chunkResponse.body);
      fetchedChunks.push({ sha256: descriptor.sha256, data: chunkResponse.body });
    }

    const parts = [];
    for (const chunk of fetchedChunks) {
      let rawPart: unknown;
      try {
        rawPart = decodeJsonBody(chunk.data);
      } catch {
        return err({
          kind: 'invalid-content',
          issues: [`chunk ${chunk.sha256} is not valid JSON`],
        });
      }
      const parsedPart = packPartSchema.safeParse(rawPart);
      if (!parsedPart.success) {
        return err({
          kind: 'invalid-content',
          issues: issuesFromZod(parsedPart.error),
        });
      }
      parts.push(parsedPart.data);
    }

    const assembled = packPayloadSchema.safeParse(mergePackParts(parts));
    if (!assembled.success) {
      return err({
        kind: 'invalid-content',
        issues: issuesFromZod(assembled.error),
      });
    }

    if (packPayloadIsEqual(assembled.data, this.currentPack.payload)) {
      this.lastEtag = response.etag;
      return ok({ kind: 'up-to-date', packVersion: this.currentPack.packVersion });
    }

    const ready: ContentPack = {
      packVersion: manifest.packVersion,
      dataFormat: manifest.dataFormat,
      manifest,
      payload: assembled.data,
      chunks: fetchedChunks,
    };
    this.readyPack = ready;
    this.lastEtag = response.etag;
    this.hooks.onStaged?.(ready);
    return ok({
      kind: 'update-ready',
      from: this.currentPack.packVersion,
      to: ready.packVersion,
    });
  }

  // Called by app-shell only at a pause, never while a round is open
  // (FE02 behaviour 5, D163).
  applyReadyPack(): Result<PackVersion | null, PackError> {
    if (this.readyPack === null) {
      return ok(null);
    }

    const candidate = this.readyPack;
    const guard = this.activationGuard(candidate);
    if (!guard.ok) {
      this.readyPack = null;
      this.diagnostics?.record({
        at: this.now(),
        kind: 'pack-rollback',
        code: 'pack.activation-failed',
        count: guard.error.kind === 'invalid-content' ? guard.error.issues.length : 1,
      });
      this.hooks.onRolledBack?.(candidate, this.currentPack, guard.error);
      return err(guard.error);
    }

    const previous = this.currentPack;
    this.currentPack = candidate;
    this.previousPack = previous;
    this.readyPack = null;
    this.rememberChunks(candidate);
    this.hooks.onApplied?.(candidate, previous);
    return ok(candidate.packVersion);
  }

  // An explicit rollback keeps the previous pack available (FE02 behaviour 6).
  rollback(): Result<PackVersion | null, PackError> {
    if (this.previousPack === null) {
      return ok(null);
    }
    const failed = this.currentPack;
    const restored = this.previousPack;
    this.currentPack = restored;
    this.previousPack = null;
    this.readyPack = null;
    this.rememberChunks(restored);
    this.diagnostics?.record({
      at: this.now(),
      kind: 'pack-rollback',
      code: 'pack.manual-rollback',
    });
    this.hooks.onRolledBack?.(failed, restored, {
      kind: 'invalid-content',
      issues: ['rolled back by the app'],
    });
    return ok(restored.packVersion);
  }

  private rememberChunks(pack: ContentPack): void {
    for (const chunk of pack.chunks) {
      this.chunks.set(chunk.sha256, chunk.data);
    }
  }

  private signingKeyFor(manifest: PackManifest) {
    if (this.keys.current.id === manifest.signature.keyId) {
      return this.keys.current;
    }
    if (this.keys.next.id === manifest.signature.keyId) {
      return this.keys.next;
    }
    return null;
  }
}

export function chunksEqual(left: Uint8Array, right: Uint8Array): boolean {
  return equalBytes(left, right);
}
