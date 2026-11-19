import { describe, it } from 'vitest';

describe('FE16 blocked acceptance criteria', () => {
  it.todo(
    'AC-16.1 every eligible item gets exactly one Meet card — not done: FE14/content card contracts and authored pack data are missing.',
  );
  it.todo(
    'AC-16.2 Meet cards do not auto-advance with no time pressure — not done: mounted UI and pause-flow contracts are missing.',
  );
  it.todo(
    'AC-16.3 at most one contrast card appears per round — not done: FE15 round/card slot contract is missing.',
  );
  it.todo(
    'AC-16.4 contrast cards pass colour-blind simulations and use non-colour cues — not done: authored contrast-cue data and UI contract are missing.',
  );
  it.todo(
    'AC-16.5 pipeline rejects incomplete Meet, mini-Meet and lookalike content — not done: content pack schema and reviewed authored data are missing.',
  );
  it.todo(
    'AC-16.6 replay reproduces cards at the same points — not done: LearnerHistory and event projection contracts are missing.',
  );
  it.todo(
    'AC-16.7 cards pass axe-core and keyboard-only use — not done: card UI is not implemented and hosted accessibility checks are unavailable.',
  );
  it.todo(
    'AC-16.8 later facets get one mini-Meet before the first question — not done: FE14/FE15 history and question contracts are missing.',
  );
  it.todo(
    'AC-16.9 second lookalike gets a contrast card after its Meet — not done: lookalike/content and round sequencing contracts are missing.',
  );
});
