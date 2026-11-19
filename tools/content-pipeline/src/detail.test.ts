import { describe, expect, it } from 'vitest';
import {
  DETAIL_SOURCE_SCALES,
  detailLevelForSourceScale,
  sourceScaleForDetailLevel,
  type DetailSourceScale,
} from './detail.ts';

describe('FE09 detail source scales', () => {
  it('maps the Natural Earth scales named by the feature to L0, L1 and L2', () => {
    expect(DETAIL_SOURCE_SCALES).toEqual({
      L0: '1:110m',
      L1: '1:50m',
      L2: '1:10m',
    });

    const scales: readonly DetailSourceScale[] = ['1:110m', '1:50m', '1:10m'];
    expect(scales.map(detailLevelForSourceScale)).toEqual(['L0', 'L1', 'L2']);
    expect(sourceScaleForDetailLevel('L2')).toBe('1:10m');
  });
});
