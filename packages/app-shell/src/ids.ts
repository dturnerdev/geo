import type { EventId, InstallId, OriginId } from '@geo/domain';

export type RandomBytes = (length: number) => Uint8Array;

interface CryptoSource {
  getRandomValues(array: Uint8Array): Uint8Array;
}

declare const crypto: CryptoSource | undefined;

export const systemRandomBytes: RandomBytes = (length) => {
  const bytes = new Uint8Array(length);
  if (typeof crypto === 'undefined') {
    throw new Error('a cryptographically secure random source is required');
  }
  crypto.getRandomValues(bytes);
  return bytes;
};

function hex(bytes: Uint8Array): string {
  let value = '';
  for (const byte of bytes) {
    value += byte.toString(16).padStart(2, '0');
  }
  return value;
}

// RFC 9562 UUIDv7: 48-bit Unix ms timestamp followed by random bits. UUIDs sort
// by creation time, so (at, id) ordering stays stable (FE01 behaviour 4).
export function createEventId(at: number, random: RandomBytes = systemRandomBytes): EventId {
  const timestamp = Math.max(0, Math.floor(at));
  const randomBytes = random(10);
  const bytes = new Uint8Array(16);

  let remaining = timestamp;
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = remaining % 256;
    remaining = Math.floor(remaining / 256);
  }

  bytes[6] = 0x70 | ((randomBytes[0] ?? 0) & 0x0f);
  bytes[7] = randomBytes[1] ?? 0;
  bytes[8] = 0x80 | ((randomBytes[2] ?? 0) & 0x3f);
  for (let index = 9; index < 16; index += 1) {
    bytes[index] = randomBytes[index - 6] ?? 0;
  }

  const text = hex(bytes);
  return `${text.slice(0, 8)}-${text.slice(8, 12)}-${text.slice(12, 16)}-${text.slice(
    16,
    20,
  )}-${text.slice(20)}` as EventId;
}

export function createInstallId(at: number, random: RandomBytes = systemRandomBytes): InstallId {
  return createEventId(at, random) as unknown as InstallId;
}

export function createOriginId(at: number, random: RandomBytes = systemRandomBytes): OriginId {
  return createEventId(at, random) as unknown as OriginId;
}
