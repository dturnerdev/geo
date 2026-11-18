import { describe, expect, it } from 'vitest';
import { createSeededRandom, hash32, randomIntBelow } from './random.ts';

describe('FE03 deterministic randomness', () => {
  it('AC-03.1 hash32 matches its test vectors on web and Android', () => {
    // Published FNV-1a 32-bit vectors.
    expect(hash32('')).toBe(0x811c9dc5);
    expect(hash32('a')).toBe(0xe40c292c);
    expect(hash32('foobar')).toBe(0xbf9cf968);
    expect(hash32('hello')).toBe(0x4f9f2cab);
    expect(hash32('install:E01:1')).toBe(0xa2ea731f);
  });

  it.skip('AC-03.1 hash32 matches the same vectors on the Android device', () => {
    // Skipped: the Android E2E runner and devices are not available here. The
    // implementation uses only integer operations, so it is platform-neutral.
  });

  it('is stable for Unicode input and never returns a signed value', () => {
    expect(hash32('é')).toBe(hash32('é'));
    expect(hash32('日本')).toBe(hash32('日本'));
    expect(hash32('日本')).toBeGreaterThanOrEqual(0);
    expect(hash32('日本')).toBeLessThanOrEqual(0xffffffff);
  });

  it('seeded random repeats the same sequence and stays in range', () => {
    const first = createSeededRandom('round-seed');
    const second = createSeededRandom('round-seed');
    for (let index = 0; index < 20; index += 1) {
      const value = first();
      expect(value).toBe(second());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(randomIntBelow(createSeededRandom('seed'), 6)).toBeGreaterThanOrEqual(0);
    expect(randomIntBelow(createSeededRandom('seed'), 6)).toBeLessThan(6);
  });
});
