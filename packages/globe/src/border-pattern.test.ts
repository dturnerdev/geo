import { describe, expect, it } from 'vitest';
import { BORDER_STYLE_PATTERNS, borderStylePattern } from './border-pattern.ts';

describe('FE07 border patterns', () => {
  it('maps agreed, disputed and claim borders to distinct line patterns', () => {
    const agreed = borderStylePattern('agreed');
    const disputed = borderStylePattern('disputed');
    const claim = borderStylePattern('claim');

    expect(agreed.pattern).toBe('solid');
    expect(agreed.dash).toEqual([]);
    expect(disputed.pattern).toBe('dashed');
    expect(disputed.dash.length).toBeGreaterThan(0);
    expect(claim.pattern).toBe('dotted');
    expect(claim.dash.length).toBeGreaterThan(0);

    const patterns = new Set([agreed.pattern, disputed.pattern, claim.pattern]);
    expect(patterns.size).toBe(3);
    expect(
      new Set([agreed.dash.join(','), disputed.dash.join(','), claim.dash.join(',')]).size,
    ).toBe(3);
  });

  it('hatches claimed areas and no other border style', () => {
    expect(BORDER_STYLE_PATTERNS.claim.hatch).toBe(true);
    expect(BORDER_STYLE_PATTERNS.agreed.hatch).toBe(false);
    expect(BORDER_STYLE_PATTERNS.disputed.hatch).toBe(false);
  });

  it('returns the same data as the exported table', () => {
    expect(borderStylePattern('agreed')).toBe(BORDER_STYLE_PATTERNS.agreed);
    expect(borderStylePattern('disputed')).toBe(BORDER_STYLE_PATTERNS.disputed);
    expect(borderStylePattern('claim')).toBe(BORDER_STYLE_PATTERNS.claim);
  });
});
