// Design tokens (06 §5, D125). This module is the single source for colour
// values; components read the CSS variables and the globe reads the matching
// custom properties as shader uniforms.
export const palette = {
  black: '#000000',
  orange: '#E69F00',
  skyBlue: '#56B4E9',
  bluishGreen: '#009E73',
  yellow: '#F0E442',
  blue: '#0072B2',
  vermillion: '#D55E00',
  reddishPurple: '#CC79A7',
} as const;

export const semanticColours = {
  correct: palette.blue,
  close: palette.orange,
  incorrect: palette.vermillion,
  answerMarker: palette.reddishPurple,
  beam: palette.skyBlue,
  space: '#000000',
  ocean: '#14212b',
  land: '#3b4a53',
} as const;

export const GLOBE_CSS_VARIABLES = {
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
} as const;

export type GlobeTokenName = keyof typeof GLOBE_CSS_VARIABLES;

export function globeTokenCssVariables(): Record<string, string> {
  return {
    [GLOBE_CSS_VARIABLES.space]: semanticColours.space,
    [GLOBE_CSS_VARIABLES.ocean]: semanticColours.ocean,
    [GLOBE_CSS_VARIABLES.land]: semanticColours.land,
    [GLOBE_CSS_VARIABLES.answerMarker]: semanticColours.answerMarker,
    [GLOBE_CSS_VARIABLES.chosenMarker]: semanticColours.answerMarker,
    [GLOBE_CSS_VARIABLES.correct]: semanticColours.correct,
    [GLOBE_CSS_VARIABLES.close]: semanticColours.close,
    [GLOBE_CSS_VARIABLES.incorrect]: semanticColours.incorrect,
    [GLOBE_CSS_VARIABLES.neutral]: semanticColours.land,
    [GLOBE_CSS_VARIABLES.beam]: semanticColours.beam,
    [GLOBE_CSS_VARIABLES.label]: '#FFFFFF',
  };
}
