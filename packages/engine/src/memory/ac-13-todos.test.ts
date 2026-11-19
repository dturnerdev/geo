import { describe, it } from 'vitest';

describe('FE13 blocked acceptance criteria', () => {
  it.todo(
    'AC-13.1 MemoryModel matches FSRS-6 and FSRS-7 reference vectors — not done: exact authorised FSRS dependency pin and MemoryModel contract are missing.',
  );
  it.todo(
    'AC-13.2 model version comes from adopted parameters — not done: ParametersAdopted and MemoryParams contracts are missing.',
  );
  it.todo(
    'AC-13.3 replay is identical on web and Android — not done: replay contract and authorised model dependency are missing.',
  );
  it.todo(
    'AC-13.4 predicted recall never rises between reviews — not done: MemoryModel implementation contract is missing.',
  );
  it.todo(
    'AC-13.5 replay does not change ratings or outcomes — not done: replay/event projection contract is missing.',
  );
  it.todo(
    'AC-13.6 10,000-answer replay is under one second off the main thread — not done: memory implementation is blocked and the Galaxy A07 4G is unavailable.',
  );
  it.todo(
    'AC-13.8 simulation calibration RMSE is under 0.05 — not done: FE18 and the real memory model are blocked.',
  );
  it.todo(
    'AC-13.9 real predictor and review source need no atlas/session changes — not done: FE08 and FE15 replacement contracts are missing.',
  );
  it.todo(
    'AC-13.10 replay never mixes model versions — not done: adopted-model replay contract is missing.',
  );
  it.todo(
    'AC-13.11 public builds resolve to FSRS-6 until the ADR is accepted — not done: the FSRS-7 ADR and authorised dependency pins are missing.',
  );
});
