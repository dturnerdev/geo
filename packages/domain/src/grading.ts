// FE11 grading scalars. The spec fixes these names and values but not the
// surrounding payloads; larger grading structures live in engine/grading.

export type Rating = 'again' | 'hard' | 'good' | 'easy';
export type Outcome = 'correct' | 'close' | 'incorrect' | 'shown';
export type InputMethod = 'touch' | 'keyboard' | 'screenReader' | 'list';

// FE11 names AidId in GradeInput but does not enumerate its values. Keeping it
// opaque avoids inventing the aid vocabulary before the UI owns it.
export type AidId = string & { readonly __brand: 'AidId' };
