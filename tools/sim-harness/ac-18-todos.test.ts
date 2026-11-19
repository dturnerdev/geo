import { describe, it } from 'vitest';

describe('FE18 blocked acceptance criteria', () => {
  it.todo(
    'AC-18.1 same seed produces identical reports and event logs — not done: simulation and event-store contracts are missing.',
  );
  it.todo(
    'AC-18.2 harness uses only public engine entry points — not done: the FE18 harness contract is missing.',
  );
  it.todo(
    'AC-18.3 smoke run finishes within ten minutes — not done: the harness is not implemented and CI timing is unavailable locally.',
  );
  it.todo(
    'AC-18.4 invariant violations fail CI with a reproduce command — not done: invariant and CI integration contracts are missing.',
  );
  it.todo(
    'AC-18.5 truth model is not the engine memory model — not done: TruthModelId and simulation configuration contracts are missing.',
  );
  it.todo(
    'AC-18.6 simulated events pass FE01 import validation — not done: simulated event-store contract is missing.',
  );
  it.todo(
    'AC-18.7 sweeps do not write tuning.ts — not done: SweepFile and harness filesystem boundary contracts are missing.',
  );
  it.todo(
    'AC-18.8 travel and clock-change learners replay identically — not done: FE13 replay and simulation profile contracts are missing.',
  );
  it.todo(
    'AC-18.9 every report includes predicted and true FE04 metrics — not done: SimReport and FE04 real-model metric contracts are missing.',
  );
  it.todo(
    'AC-18.10 profile shares sum to 100% and match rounded counts — not done: ProfileShare and population contracts are missing.',
  );
});
