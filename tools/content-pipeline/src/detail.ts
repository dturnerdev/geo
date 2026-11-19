import type { DetailLevel } from '../../../packages/content/src/geometry.ts';

// FE09 behaviour 1: the pipeline builds every level from Natural Earth, not
// from an app-side approximation. Source adapters use these scales when they
// select the input theme.
export const DETAIL_SOURCE_SCALES: Readonly<Record<DetailLevel, '1:110m' | '1:50m' | '1:10m'>> = {
  L0: '1:110m',
  L1: '1:50m',
  L2: '1:10m',
};

export type DetailSourceScale = (typeof DETAIL_SOURCE_SCALES)[DetailLevel];

export function detailLevelForSourceScale(scale: DetailSourceScale): DetailLevel {
  if (scale === '1:110m') {
    return 'L0';
  }
  if (scale === '1:50m') {
    return 'L1';
  }
  return 'L2';
}

export function sourceScaleForDetailLevel(level: DetailLevel): DetailSourceScale {
  return DETAIL_SOURCE_SCALES[level];
}
