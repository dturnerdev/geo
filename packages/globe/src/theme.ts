/// <reference lib="dom" />

// The globe never hard-codes colours (D125): values come from the UI token CSS
// variables. A neutral fallback keeps a headless mount working before the
// stylesheet has loaded.
export interface GlobePalette {
  readonly space: string;
  readonly ocean: string;
  readonly land: string;
  readonly answerMarker: string;
  readonly chosenMarker: string;
  readonly correct: string;
  readonly close: string;
  readonly incorrect: string;
  readonly neutral: string;
  readonly beam: string;
  readonly label: string;
}

export const GLOBE_TOKEN_VARIABLES = {
  space: '--geo-globe-space',
  ocean: '--geo-globe-ocean',
  land: '--geo-globe-land',
  answerMarker: '--geo-globe-answer-marker',
  chosenMarker: '--geo-globe-chosen-marker',
  correct: '--geo-globe-correct',
  close: '--geo-globe-close',
  incorrect: '--geo-globe-incorrect',
  neutral: '--geo-globe-neutral',
  beam: '--geo-globe-beam',
  label: '--geo-globe-label',
} as const satisfies Record<keyof GlobePalette, string>;

const FALLBACK_PALETTE: GlobePalette = {
  space: '#000000',
  ocean: '#14212b',
  land: '#3b4a53',
  answerMarker: '#CC79A7',
  chosenMarker: '#CC79A7',
  correct: '#0072B2',
  close: '#E69F00',
  incorrect: '#D55E00',
  neutral: '#3b4a53',
  beam: '#56B4E9',
  label: '#FFFFFF',
};

function readVariable(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  const value = styles.getPropertyValue(name).trim();
  return value.length > 0 ? value : fallback;
}

/** Resolve design tokens for shader uniforms from the mounted canvas. */
export function readGlobePalette(canvas: HTMLCanvasElement): GlobePalette {
  const view = canvas.ownerDocument?.defaultView;
  if (view === null || view === undefined) {
    return FALLBACK_PALETTE;
  }
  const styles = view.getComputedStyle(canvas);
  return {
    space: readVariable(styles, GLOBE_TOKEN_VARIABLES.space, FALLBACK_PALETTE.space),
    ocean: readVariable(styles, GLOBE_TOKEN_VARIABLES.ocean, FALLBACK_PALETTE.ocean),
    land: readVariable(styles, GLOBE_TOKEN_VARIABLES.land, FALLBACK_PALETTE.land),
    answerMarker: readVariable(
      styles,
      GLOBE_TOKEN_VARIABLES.answerMarker,
      FALLBACK_PALETTE.answerMarker,
    ),
    chosenMarker: readVariable(
      styles,
      GLOBE_TOKEN_VARIABLES.chosenMarker,
      FALLBACK_PALETTE.chosenMarker,
    ),
    correct: readVariable(styles, GLOBE_TOKEN_VARIABLES.correct, FALLBACK_PALETTE.correct),
    close: readVariable(styles, GLOBE_TOKEN_VARIABLES.close, FALLBACK_PALETTE.close),
    incorrect: readVariable(styles, GLOBE_TOKEN_VARIABLES.incorrect, FALLBACK_PALETTE.incorrect),
    neutral: readVariable(styles, GLOBE_TOKEN_VARIABLES.neutral, FALLBACK_PALETTE.neutral),
    beam: readVariable(styles, GLOBE_TOKEN_VARIABLES.beam, FALLBACK_PALETTE.beam),
    label: readVariable(styles, GLOBE_TOKEN_VARIABLES.label, FALLBACK_PALETTE.label),
  };
}
