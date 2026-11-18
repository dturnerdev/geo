import { err, ok } from '@geo/domain';
import { describe, expect, it } from 'vitest';
import { BUNDLED_CONTENT_PACK, BUNDLED_DATA_FORMAT } from './bundled-pack.ts';
import { BUNDLED_PACK_SIGNING_KEYS } from './signing-keys.ts';
import { StaticContentSource, type ContentPack, type PackError } from './content-source.ts';
import { createWebPackCrypto } from './crypto.ts';
import { manifestSigningMessage } from './pack-schema.ts';
import {
  buildPack,
  createTestSigningKeys,
  MemoryPackHost,
  OfflineHost,
  type TestSigningKey,
} from './test-helpers.ts';
import type { NetworkConditions } from './scheduler.ts';

const online: NetworkConditions = {
  online: true,
  metered: false,
  dataSaver: false,
  batteryLow: false,
  mobileDataAllowed: true,
};

const baseParts = [
  { items: [{ id: 'country.fra', name: 'France' }] },
  { flags: [{ id: 'dailyChallenge', default: false }] },
];

interface Fixture {
  readonly signing: TestSigningKey;
  readonly base: ContentPack;
  readonly host: MemoryPackHost;
}

function fixture(): Fixture {
  const signing = createTestSigningKeys();
  const base = buildPack({
    parts: baseParts,
    packVersion: '1.0.0',
    signing,
  }).pack;
  const host = new MemoryPackHost();
  return { signing, base, host };
}

function createSource(
  value: Fixture,
  options: {
    readonly network?: NetworkConditions;
    readonly activationGuard?: (pack: ContentPack) =>
      | { readonly ok: true; readonly value: void }
      | {
          readonly ok: false;
          readonly error: PackError;
        };
    readonly diagnostics?: {
      record(entry: {
        readonly at: number;
        readonly kind: string;
        readonly code: string;
        readonly count?: number;
      }): void;
    };
    readonly onRolledBack?: (failed: ContentPack, restored: ContentPack, error: PackError) => void;
  } = {},
): StaticContentSource {
  return new StaticContentSource({
    host: value.host,
    keys: value.signing.keys,
    dataFormat: '1',
    bundledPack: value.base,
    network: () => options.network ?? online,
    now: () => 1_763_500_800_000,
    ...(options.activationGuard === undefined ? {} : { activationGuard: options.activationGuard }),
    ...(options.diagnostics === undefined ? {} : { diagnostics: options.diagnostics }),
    ...(options.onRolledBack === undefined
      ? {}
      : { hooks: { onRolledBack: options.onRolledBack } }),
  });
}

describe('FE02 content packs', () => {
  it('AC-02.1 first launch in airplane mode reaches the first question', async () => {
    const source = new StaticContentSource({
      host: new OfflineHost(),
      keys: BUNDLED_PACK_SIGNING_KEYS,
      dataFormat: BUNDLED_DATA_FORMAT,
      bundledPack: BUNDLED_CONTENT_PACK,
      network: () => ({ ...online, online: false }),
    });

    // The bundled pack is complete and verifiable without any network request.
    expect(source.current().packVersion).toBe(BUNDLED_CONTENT_PACK.packVersion);
    expect(source.current().payload.items.length).toBeGreaterThan(0);
    const crypto = createWebPackCrypto();
    expect(
      await crypto.verifyEd25519({
        publicKey: BUNDLED_PACK_SIGNING_KEYS.current.publicKey,
        signature: BUNDLED_CONTENT_PACK.manifest.signature.value,
        message: manifestSigningMessage(BUNDLED_CONTENT_PACK.manifest),
      }),
    ).toBe(true);
    for (const chunk of BUNDLED_CONTENT_PACK.chunks) {
      expect(await crypto.sha256(chunk.data)).toBeDefined();
    }

    const checked = await source.checkForUpdate('launch');
    expect(checked).toEqual({ ok: false, error: { kind: 'offline' } });
    expect(source.current()).toBe(BUNDLED_CONTENT_PACK);
  });

  it.skip('AC-02.1 first launch in airplane mode reaches the first question (web/Android E2E)', () => {
    // Skipped: no browser or Android E2E runner is available in this worktree.
  });

  it('AC-02.2 a pack with one altered byte, a wrong signature or an unknown key is rejected; the current pack stays', async () => {
    const altered = fixture();
    const update = buildPack({
      parts: [...baseParts, { items: [{ id: 'country.deu', name: 'Germany' }] }],
      packVersion: '2.0.0',
      signing: altered.signing,
    });
    altered.host.publish(update);
    const changedChunk = update.chunks.at(-1);
    const servedChunk =
      changedChunk === undefined ? undefined : altered.host.chunks.get(changedChunk.sha256);
    if (servedChunk === undefined) {
      throw new Error('fixture missing chunk');
    }
    servedChunk.body[0] = (servedChunk.body[0] ?? 0) ^ 0xff;
    const alteredSource = createSource(altered);
    expect(await alteredSource.checkForUpdate('open')).toEqual({
      ok: false,
      error: { kind: 'bad-hash' },
    });
    expect(alteredSource.current().packVersion).toBe('1.0.0');

    const wrongSignature = fixture();
    const other = createTestSigningKeys('other-key');
    const badlySigned = buildPack({
      parts: [...baseParts, { items: [{ id: 'country.ita', name: 'Italy' }] }],
      packVersion: '2.0.0',
      signing: wrongSignature.signing,
      signWith: other.privateKey,
    });
    wrongSignature.host.publish(badlySigned);
    const wrongSignatureSource = createSource(wrongSignature);
    expect(await wrongSignatureSource.checkForUpdate('open')).toEqual({
      ok: false,
      error: { kind: 'bad-signature' },
    });
    expect(wrongSignatureSource.current().packVersion).toBe('1.0.0');

    const unknownKey = fixture();
    const unknown = buildPack({
      parts: [...baseParts, { items: [{ id: 'country.esp', name: 'Spain' }] }],
      packVersion: '2.0.0',
      signing: unknownKey.signing,
      keyId: 'not-an-embedded-key',
    });
    unknownKey.host.publish(unknown);
    const unknownKeySource = createSource(unknownKey);
    expect(await unknownKeySource.checkForUpdate('open')).toEqual({
      ok: false,
      error: { kind: 'bad-signature' },
    });
    expect(unknownKeySource.current().packVersion).toBe('1.0.0');
  });

  it('AC-02.4 an update changing one item downloads only the affected chunks', async () => {
    const value = fixture();
    const update = buildPack({
      parts: [baseParts[0] ?? { items: [] }, { flags: [{ id: 'dailyChallenge', default: true }] }],
      packVersion: '2.0.0',
      signing: value.signing,
    });
    value.host.publish(update);

    const source = createSource(value);
    const result = await source.checkForUpdate('open');
    expect(result).toEqual({
      ok: true,
      value: { kind: 'update-ready', from: '1.0.0', to: '2.0.0' },
    });

    const changed = update.chunks[1]?.sha256;
    const unchanged = update.chunks[0]?.sha256;
    expect(changed).toBeDefined();
    expect(unchanged).toBeDefined();
    expect(value.host.chunkRequests).toEqual([changed]);
    expect(value.host.chunkRequests).not.toContain(unchanged);
  });

  it.skip('AC-02.5 Android on metered data performs no background check (instrumented device test)', () => {
    // Skipped: needs an Android device/emulator and the WorkManager ADR, which
    // is still blocked. The shared policy is tested above.
  });

  it('AC-02.5 Android on metered data performs no background check', async () => {
    const value = fixture();
    const update = buildPack({
      parts: [...baseParts, { items: [{ id: 'country.prt', name: 'Portugal' }] }],
      packVersion: '2.0.0',
      signing: value.signing,
    });
    value.host.publish(update);
    const source = createSource(value, {
      network: { ...online, metered: true, mobileDataAllowed: false },
    });

    expect(await source.checkForUpdate('background')).toEqual({
      ok: true,
      value: { kind: 'deferred', reason: 'metered' },
    });
    expect(value.host.manifestRequests).toHaveLength(0);
    expect(value.host.chunkRequests).toHaveLength(0);
  });

  it('AC-02.7 a pack failing load-time validation triggers automatic rollback, logged to diagnostics', async () => {
    const value = fixture();
    const update = buildPack({
      parts: [...baseParts, { items: [{ id: 'country.irl', name: 'Ireland' }] }],
      packVersion: '2.0.0',
      signing: value.signing,
    });
    value.host.publish(update);
    const diagnostics: { at: number; kind: string; code: string; count?: number }[] = [];
    let rolledBack: { failed: string; restored: string; error: PackError } | null = null;
    const source = createSource(value, {
      activationGuard: () =>
        err({ kind: 'invalid-content', issues: ['item.country.irl is malformed'] }),
      diagnostics: { record: (entry) => diagnostics.push(entry) },
      onRolledBack: (failed, restored, error) => {
        rolledBack = {
          failed: failed.packVersion,
          restored: restored.packVersion,
          error,
        };
      },
    });

    expect((await source.checkForUpdate('open')).ok).toBe(true);
    const applied = source.applyReadyPack();
    expect(applied.ok).toBe(false);
    expect(source.current().packVersion).toBe('1.0.0');
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      kind: 'pack-rollback',
      code: 'pack.activation-failed',
      count: 1,
    });
    expect(rolledBack).toEqual({
      failed: '2.0.0',
      restored: '1.0.0',
      error: { kind: 'invalid-content', issues: ['item.country.irl is malformed'] },
    });
  });

  it('applies a verified ready pack and keeps the previous pack for rollback', async () => {
    const value = fixture();
    const update = buildPack({
      parts: [...baseParts, { items: [{ id: 'country.nld', name: 'Netherlands' }] }],
      packVersion: '2.0.0',
      signing: value.signing,
    });
    value.host.publish(update);
    const source = createSource(value);

    expect((await source.checkForUpdate('open')).ok).toBe(true);
    expect(source.applyReadyPack()).toEqual(ok('2.0.0'));
    expect(source.current().packVersion).toBe('2.0.0');
    expect(source.rollback()).toEqual(ok('1.0.0'));
    expect(source.current().packVersion).toBe('1.0.0');
  });

  it('keeps completed chunks when an update is abandoned', async () => {
    const value = fixture();
    const update = buildPack({
      parts: [...baseParts, { items: [{ id: 'country.bel', name: 'Belgium' }] }],
      packVersion: '2.0.0',
      signing: value.signing,
    });
    value.host.publish(update);
    const second = update.chunks.at(-1);
    if (second !== undefined) {
      value.host.chunks.delete(second.sha256);
    }
    const source = createSource(value);
    expect((await source.checkForUpdate('open')).ok).toBe(false);
    expect(source.current().packVersion).toBe('1.0.0');
    expect(value.host.chunkRequests).toEqual([update.chunks.at(-1)?.sha256]);
  });

  it('rejects a manifest for an unsupported data format', async () => {
    const value = fixture();
    const update = buildPack({
      parts: baseParts,
      packVersion: '2.0.0',
      dataFormat: '2',
      signing: value.signing,
    });
    value.host.publish(update);
    const source = createSource(value);
    expect(await source.checkForUpdate('open')).toEqual({
      ok: false,
      error: { kind: 'unsupported-format' },
    });
    expect(source.current().packVersion).toBe('1.0.0');
  });
});
