import { describe, expect, it } from 'vitest';
import { createLazyCutMeshLoader } from './cut-mesh-loader.ts';

describe('FE06 lazy cut mesh', () => {
  it('AC-06.10 the cut mesh is not requested before the first question appears', async () => {
    let loads = 0;
    const loader = createLazyCutMeshLoader(() => {
      loads += 1;
      return Promise.resolve();
    });

    expect(loader.request()).toBeNull();
    expect(loader.requested).toBe(false);
    expect(loads).toBe(0);

    loader.noteFirstQuestion();
    const pending = loader.request();
    expect(pending).not.toBeNull();
    await pending;
    expect(loader.requested).toBe(true);
    expect(loads).toBe(1);

    await loader.request();
    expect(loads).toBe(1);
  });

  it('is idempotent when the first question is signalled more than once', () => {
    const loader = createLazyCutMeshLoader(() => Promise.resolve());
    loader.noteFirstQuestion();
    loader.noteFirstQuestion();
    expect(loader.firstQuestionSeen).toBe(true);
    expect(loader.requested).toBe(false);
  });
});
