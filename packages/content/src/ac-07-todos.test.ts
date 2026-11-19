import { describe, it } from 'vitest';

// FE07 acceptance criteria that cannot be implemented until the M3
// question/scheduling contracts exist. These are todos, not skips: the work is
// not externally blocked, it is simply not built yet.
describe('FE07 automated acceptance criteria waiting on later contracts', () => {
  // Not done: needs the M3 question-generation contract so a property test can
  // inspect generated wrong options against the active ContentView item kind.
  it.todo(
    'AC-07.2 no generated question uses a wrong option outside the active perspective item kind',
  );

  // Not done: needs the M3 question-generation contract plus agreed disputed-area
  // content/treatment, so membership questions and the pipeline check can be
  // exercised without inventing learner-visible status values.
  it.todo('AC-07.3 no disputed area appears in a membership question');

  // Not done: needs the M3 scheduling contract and LearnerState so switching
  // perspective and back can be compared against real scheduling state.
  it.todo('AC-07.6 switching perspective and back leaves scheduling state identical');
});
