import { describe, it } from 'vitest';

// FE08 acceptance criteria cannot be implemented until the M3 learning engine
// supplies the LearnerState contract named by the spec. The atlas projection is
// deliberately not guessed ahead of that contract.
describe('FE08 automated acceptance criteria waiting on LearnerState', () => {
  // Not done: needs the M3 LearnerState contract before atlasState can exist and
  // be replayed identically on web and Android.
  it.todo('AC-08.1 atlasState gives the same output for the same input on web and Android');

  // Not done: needs the M3 LearnerState contract and a real ItemMet log projection
  // before the never-below-Discovered property can be tested over random logs.
  it.todo('AC-08.2 no item is ever below Discovered after ItemMet');

  // Not done: needs the M3 LearnerState contract plus the app-shell pause flow so a
  // forced state change mid-round can be shown not to alter the atlas on screen.
  it.todo(
    'AC-08.3 the atlas does not change on screen during a round, apart from feedback highlights',
  );

  // Not done: needs the M3 LearnerState contract before atlas states can be
  // generated and colour-checked under protan, deutan, tritan and achromat simulation.
  it.todo('AC-08.4 each state is distinguishable under colour-vision simulations');

  // Not done: needs the M3 LearnerState contract and the app-shell pause flow to
  // identify newly established or restored items and check H03 timing.
  it.todo(
    'AC-08.5 H03 only fires for newly established or restored items, at most once per 300 ms',
  );

  // Not done: needs the M3 LearnerState contract before atlasState and atlasSummary
  // can be compared against golden fixtures.
  it.todo('AC-08.6 atlas summary counts match atlasState for golden fixtures');

  // Not done: needs the M3 LearnerState contract and the UI summary surface before
  // axe-core and keyboard-only checks can run.
  it.todo('AC-08.7 atlas summary passes axe-core and works through the keyboard alone');

  // Not done: needs the M3 LearnerState contract and an atlas renderer before a
  // test can prove one texture upload and no geometry rebuild for 200 items.
  it.todo('AC-08.8 updating 200 items costs one texture upload and no geometry rebuild');

  // Not done: needs the M3 LearnerState contract so a second RecallPredictor
  // implementation can be substituted and type-checked against the atlas boundary.
  it.todo(
    'AC-08.9 swapping the stand-in predictor for another RecallPredictor needs no change in atlas',
  );
});
