// The current and next pack-signing public keys are embedded in the app so a
// key can be rotated without an app update (FE02 behaviour 3, 07 §10).
// Production keys are provisioned by the release process; the values below are
// the public halves used to sign the bundled offline pack in this repository.
export interface PackSigningKey {
  readonly id: string;
  /** Raw Ed25519 public key, base64 (32 bytes). */
  readonly publicKey: string;
}

export interface PackSigningKeys {
  readonly current: PackSigningKey;
  readonly next: PackSigningKey;
}

export const BUNDLED_PACK_SIGNING_KEYS: PackSigningKeys = {
  current: {
    id: 'pack-key-bundled-2026-01',
    publicKey: 'b4yZnUzcLGmNFyxU0gjLD0YNSK/uBuBc8BONTyBqAas=',
  },
  next: {
    id: 'pack-key-bundled-2026-02',
    publicKey: 'bq0UGT7MQqzN5HurggBB85y6liPgAAS/CJMbe+Du364=',
  },
};
