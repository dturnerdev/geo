import { describe, it } from 'vitest';

describe('FE14 blocked acceptance criteria', () => {
  it.todo(
    'AC-14.1 prerequisites are met before introduction — not done: LearnerState, ContentView and pack graph contracts are missing.',
  );
  it.todo(
    'AC-14.2 prerequisite graph is acyclic and reachable — not done: authored prerequisite graph and pipeline contract are missing.',
  );
  it.todo(
    'AC-14.3 backlog gate blocks new items — not done: LearnerState and selection gate contracts are missing.',
  );
  it.todo(
    'AC-14.4 level rises no more than one step — not done: memory/selection integration contract is missing.',
  );
  it.todo(
    'AC-14.5 unestablished lookalikes are kept apart — not done: ContentView lookalike contract is missing.',
  );
  it.todo(
    'AC-14.6 curiosity items do not count towards budget — not done: LearnerState budget fields are missing.',
  );
  it.todo(
    'AC-14.7 simulated learner reaches tier one in 60 days — not done: FE18 and selection contracts are missing.',
  );
  it.todo(
    'AC-14.8 emphasis and goals do not cross priority levels — not done: priority and emphasis contracts are missing.',
  );
  it.todo(
    'AC-14.9 overlapping entries use strongest weight — not done: emphasis contract is missing.',
  );
  it.todo(
    'AC-14.10 emphasis ends on expiry or establishment — not done: LearnerState and event projection contracts are missing.',
  );
  it.todo(
    'AC-14.11 goals never remove a facet — not done: ContentView and goal expansion contracts are missing.',
  );
  it.todo(
    'AC-14.12 daily budget is not shown as a target or countdown — not done: UI budget contract is missing.',
  );
  it.todo(
    'AC-14.13 changes apply at the next pause — not done: app-shell pause-flow contract is missing.',
  );
  it.todo(
    'AC-14.14 second lookalike is held until first is established — not done: selection/content contracts are missing.',
  );
  it.todo(
    'AC-14.15 core items never pause and curiosity pauses expire — not done: learner pause-state contract is missing.',
  );
  it.todo(
    'AC-14.16 new-user start sequence is followed — not done: authored start-sequence pack contract is missing.',
  );
});
