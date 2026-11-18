import { base64Decode, bytesToHex } from './bytes.ts';

// Only `@geo/content` verifies pack signatures (07 §4). The abstraction keeps
// the verification code free of platform globals so the same implementation
// runs in the browser, in Node tests and inside the Android WebView (FE02).
export interface Ed25519VerificationInput {
  /** Raw Ed25519 public key, base64 (32 bytes). */
  readonly publicKey: string;
  /** Raw Ed25519 signature, base64 (64 bytes). */
  readonly signature: string;
  readonly message: Uint8Array;
}

export interface PackCrypto {
  sha256(data: Uint8Array): Promise<Uint8Array>;
  verifyEd25519(input: Ed25519VerificationInput): Promise<boolean>;
}

interface SubtleCryptoLike {
  digest(algorithm: string, data: Uint8Array): Promise<ArrayBuffer>;
  importKey(
    format: 'raw',
    keyData: Uint8Array,
    algorithm: { readonly name: 'Ed25519' },
    extractable: boolean,
    usages: readonly string[],
  ): Promise<unknown>;
  verify(
    algorithm: { readonly name: 'Ed25519' },
    key: unknown,
    signature: Uint8Array,
    data: Uint8Array,
  ): Promise<boolean>;
}

interface WebCryptoLike {
  readonly subtle: SubtleCryptoLike;
}

function getWebCrypto(): WebCryptoLike {
  const candidate = (globalThis as { readonly crypto?: WebCryptoLike }).crypto;
  if (candidate === undefined || candidate.subtle === undefined) {
    throw new Error('Web Crypto is unavailable; content packs cannot be verified (FE02)');
  }
  return candidate;
}

export function createWebPackCrypto(): PackCrypto {
  return {
    async sha256(data: Uint8Array): Promise<Uint8Array> {
      const digest = await getWebCrypto().subtle.digest('SHA-256', data);
      return new Uint8Array(digest);
    },
    async verifyEd25519(input: Ed25519VerificationInput): Promise<boolean> {
      let publicKey: Uint8Array;
      let signature: Uint8Array;
      try {
        publicKey = base64Decode(input.publicKey);
        signature = base64Decode(input.signature);
      } catch {
        return false;
      }
      // Ed25519 raw keys and signatures have fixed lengths. Reject anything
      // else before asking the platform, so a malformed manifest is simply
      // "bad signature" rather than a thrown exception (AC-02.2).
      if (publicKey.length !== 32 || signature.length !== 64) {
        return false;
      }
      try {
        const subtle = getWebCrypto().subtle;
        const key = await subtle.importKey('raw', publicKey, { name: 'Ed25519' }, false, [
          'verify',
        ]);
        return await subtle.verify({ name: 'Ed25519' }, key, signature, input.message);
      } catch {
        return false;
      }
    },
  };
}

export async function sha256Hex(crypto: PackCrypto, data: Uint8Array): Promise<string> {
  return bytesToHex(await crypto.sha256(data));
}
