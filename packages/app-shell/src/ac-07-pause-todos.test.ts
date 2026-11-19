import { describe, it } from 'vitest';

// FE07 acceptance criteria that need the app-shell pause flow. The perspective
// setting and history contracts exist, but the pause orchestration that applies
// a pending override is not part of the FE07 package paths.
describe('FE07 acceptance criteria waiting on the app-shell pause flow', () => {
  // Not done: needs the app-shell pause flow to show that a perspective override
  // made mid-round is withheld until the next pause.
  it.todo('AC-07.5 a perspective override made mid-round applies at the next pause, not before');
});
