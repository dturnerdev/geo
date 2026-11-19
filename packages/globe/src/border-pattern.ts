import type { BorderStyle } from '../../domain/src/perspective.ts';

// FE07 behaviour 7: border styles differ by pattern, never by colour alone
// (D125). Claimed areas also receive a light hatch. The renderer consumes this
// data; it does not choose the mapping.
export type BorderLinePattern = 'solid' | 'dashed' | 'dotted';

export interface BorderStylePattern {
  readonly style: BorderStyle;
  readonly pattern: BorderLinePattern;
  /** Dash lengths in screen pixels; empty means a continuous line. */
  readonly dash: readonly number[];
  readonly hatch: boolean;
}

export const BORDER_STYLE_PATTERNS = {
  agreed: { style: 'agreed', pattern: 'solid', dash: [], hatch: false },
  disputed: { style: 'disputed', pattern: 'dashed', dash: [6, 3], hatch: false },
  claim: { style: 'claim', pattern: 'dotted', dash: [1, 2], hatch: true },
} as const satisfies Record<BorderStyle, BorderStylePattern>;

export function borderStylePattern(style: BorderStyle): BorderStylePattern {
  return BORDER_STYLE_PATTERNS[style];
}
