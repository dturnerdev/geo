// Deterministic randomness for experiments and round seeds (FE03, 07 §6).
// Nothing here reads the clock, Math.random or the platform, so web and
// Android produce identical values.

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const UINT32_RANGE = 0x1_0000_0000;

function utf8Bytes(input: string): readonly number[] {
  const bytes: number[] = [];
  for (const character of input) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) {
      continue;
    }
    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return bytes;
}

// FNV-1a, 32-bit. Published vectors (also asserted by AC-03.1):
// "" = 0x811c9dc5, "a" = 0xe40c292c, "foobar" = 0xbf9cf968.
export function hash32(input: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (const byte of utf8Bytes(input)) {
    hash ^= byte;
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
}

// Mulberry32. Round seeds use the same implementation on every platform. The
// returned value is in [0, 1).
export function createSeededRandom(seed: string): () => number {
  let state = hash32(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

export function randomIntBelow(random: () => number, upperExclusive: number): number {
  if (!Number.isInteger(upperExclusive) || upperExclusive <= 0) {
    throw new RangeError('upperExclusive must be a positive integer');
  }
  return Math.floor(random() * upperExclusive);
}
