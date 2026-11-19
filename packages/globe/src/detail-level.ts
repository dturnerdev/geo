// FE09 behaviour 2: one zoom level is a doubling of camera distance. The
// threshold values themselves are not in the spec, so callers supply them and
// only the placeholder hysteresis (0.25 zoom levels) has a default here.
export type DetailLevel = 'L0' | 'L1' | 'L2';

export const DETAIL_HYSTERESIS_ZOOM_LEVELS = 0.25;

export interface DetailLevelThresholds {
  /** Zoom level at which L1 appears (closer than this distance). */
  readonly L1: number;
  /** Zoom level at which L2 appears (closer than this distance). */
  readonly L2: number;
}

export interface DetailLevelSelectorOptions {
  readonly thresholds: DetailLevelThresholds;
  /** Camera distance that maps to zoom level 0. */
  readonly referenceDistanceM: number;
  readonly initialLevel?: DetailLevel;
  readonly hysteresis?: number;
}

export interface DetailLevelSelector {
  /** Zoom level for a camera distance: log2(reference / distance). */
  zoomLevelFor(distanceM: number): number;
  /** Current level after applying the camera distance. */
  select(distanceM: number): DetailLevel;
  readonly level: DetailLevel;
}

function validateThresholds(thresholds: DetailLevelThresholds, hysteresis: number): void {
  if (
    !Number.isFinite(thresholds.L1) ||
    !Number.isFinite(thresholds.L2) ||
    !Number.isFinite(hysteresis)
  ) {
    throw new TypeError('detail thresholds and hysteresis must be finite');
  }
  if (thresholds.L2 < thresholds.L1) {
    throw new TypeError('the L2 threshold must not be below the L1 threshold');
  }
  if (hysteresis < 0) {
    throw new TypeError('detail hysteresis must not be negative');
  }
}

export function zoomLevelForDistance(distanceM: number, referenceDistanceM: number): number {
  if (!(distanceM > 0) || !(referenceDistanceM > 0)) {
    throw new TypeError('camera distances must be positive');
  }
  return Math.log2(referenceDistanceM / distanceM);
}

/**
 * A level rises at its threshold T and falls only below T - hysteresis
 * (placeholders.md: 0.25 zoom levels, about 19% further out). Keeping the
 * current level between those two points is what stops boundary flicker.
 */
export function nextDetailLevel(
  current: DetailLevel,
  zoomLevel: number,
  thresholds: DetailLevelThresholds,
  hysteresis = DETAIL_HYSTERESIS_ZOOM_LEVELS,
): DetailLevel {
  validateThresholds(thresholds, hysteresis);

  if (zoomLevel >= thresholds.L2) {
    return 'L2';
  }

  // L2 may only have come from above, so it survives down to T2 - hysteresis.
  if (current === 'L2' && zoomLevel >= thresholds.L2 - hysteresis) {
    return 'L2';
  }

  if (zoomLevel >= thresholds.L1) {
    return 'L1';
  }

  if (current === 'L1' && zoomLevel >= thresholds.L1 - hysteresis) {
    return 'L1';
  }

  return 'L0';
}

export function createDetailLevelSelector(
  options: DetailLevelSelectorOptions,
): DetailLevelSelector {
  const hysteresis = options.hysteresis ?? DETAIL_HYSTERESIS_ZOOM_LEVELS;
  validateThresholds(options.thresholds, hysteresis);
  if (!(options.referenceDistanceM > 0)) {
    throw new TypeError('referenceDistanceM must be positive');
  }

  let level = options.initialLevel ?? 'L0';

  return {
    zoomLevelFor(distanceM: number): number {
      return zoomLevelForDistance(distanceM, options.referenceDistanceM);
    },
    select(distanceM: number): DetailLevel {
      level = nextDetailLevel(
        level,
        zoomLevelForDistance(distanceM, options.referenceDistanceM),
        options.thresholds,
        hysteresis,
      );
      return level;
    },
    get level(): DetailLevel {
      return level;
    },
  };
}
