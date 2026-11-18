import { describe, expect, it } from 'vitest';
import { DIAGNOSTICS_MAX_AGE_MS, DIAGNOSTICS_MAX_BYTES } from '../../engine/src/tuning.ts';
import { DiagnosticRing, diagnosticEntrySchema, type DiagnosticEntry } from './diagnostics.ts';

function entry(at: number, code = 'storage.append_failed'): DiagnosticEntry {
  return { at, kind: 'storage-failure', code, value: 1 };
}

describe('FE04 diagnostics log', () => {
  it('AC-04.8 the diagnostics log never exceeds its cap', () => {
    let now = 1_700_000_000_000;
    const log = new DiagnosticRing({
      maxBytes: DIAGNOSTICS_MAX_BYTES,
      maxAgeMs: DIAGNOSTICS_MAX_AGE_MS,
      now: () => now,
    });

    for (let index = 0; index < 12_000; index += 1) {
      now += 1_000;
      log.record(entry(now, `storage.write_failed`));
    }

    expect(log.sizeBytes()).toBeLessThanOrEqual(DIAGNOSTICS_MAX_BYTES);
    expect(log.recent(Number.MAX_SAFE_INTEGER).length).toBeLessThan(12_000);
  });

  it('AC-04.8 the diagnostics schema rejects any answer content', () => {
    expect(diagnosticEntrySchema.safeParse(entry(1)).success).toBe(true);

    const answerPayload = {
      ...entry(1),
      itemId: 'country-fr',
      response: { kind: 'text', value: 'France' },
      message: 'typed answer was France',
    };
    expect(diagnosticEntrySchema.safeParse(answerPayload).success).toBe(false);
    expect(() => diagnosticEntrySchema.parse(answerPayload)).toThrow();
  });

  it('drops entries older than 30 days and returns the newest first', () => {
    let now = 1_000;
    const log = new DiagnosticRing({ maxBytes: 10_000, maxAgeMs: 1_000, now: () => now });
    log.record(entry(500, 'first'));
    log.record(entry(900, 'second'));
    expect(log.recent(10).map((item) => item.code)).toEqual(['second', 'first']);

    now = 2_100;
    expect(log.recent(10)).toEqual([]);
    expect(log.sizeBytes()).toBe(0);

    log.record(entry(2_100, 'third'));
    log.clear();
    expect(log.recent(10)).toEqual([]);
  });
});
