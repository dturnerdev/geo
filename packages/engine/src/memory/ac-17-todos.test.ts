import { describe, it } from 'vitest';

describe('FE17 blocked acceptance criteria', () => {
  it.todo(
    'AC-17.1 optimiser does not run before the first threshold — not done: LearnerState trigger fields and binding contract are missing.',
  );
  it.todo(
    'AC-17.2 parameters are adopted only above the loss threshold — not done: optimiser result and adoption contracts are missing.',
  );
  it.todo(
    'AC-17.3 adoption applies at the next pause — not done: app-shell pause-flow contract is missing.',
  );
  it.todo(
    'AC-17.4 stored parameters replay identically on web and Android — not done: FE13 replay contract and authorised binding pin are missing.',
  );
  it.todo(
    'AC-17.5 optimiser does not drop below 30 fps on the Galaxy A07 4G — not done: optimiser implementation is blocked and the reference device is unavailable.',
  );
  it.todo(
    'AC-17.6 threaded binding is absent and no COOP/COEP headers are needed — not done: authorised binding pin and optimiser bundle are missing.',
  );
  it.todo(
    'AC-17.7 unavailable optimiser uses pack defaults without errors — not done: pack-default and Optimiser contracts are missing.',
  );
  it.todo(
    'AC-17.8 backgrounding stops a run within one second without adoption — not done: Worker lifecycle and app-shell contracts are missing.',
  );
});
