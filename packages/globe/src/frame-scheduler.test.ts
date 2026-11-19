import { describe, expect, it } from 'vitest';
import { createFrameScheduler } from './frame-scheduler.ts';

function fakeFrames(): {
  readonly callbacks: Array<(timestamp: number) => void>;
  readonly requestFrame: (callback: (timestamp: number) => void) => number;
  readonly cancelFrame: (handle: number) => void;
} {
  const callbacks: Array<(timestamp: number) => void> = [];
  return {
    callbacks,
    requestFrame: (callback) => {
      callbacks.push(callback);
      return callbacks.length;
    },
    cancelFrame: () => {
      // The fake only needs to prove disposal stops new frames.
    },
  };
}

describe('FE06 render on demand', () => {
  it('AC-06.4 when idle, no frames are drawn', () => {
    const frames = fakeFrames();
    let draws = 0;
    const scheduler = createFrameScheduler(
      () => {
        draws += 1;
        return false;
      },
      { requestFrame: frames.requestFrame, cancelFrame: frames.cancelFrame },
    );

    expect(scheduler.frameCount).toBe(0);
    expect(frames.callbacks).toHaveLength(0);

    scheduler.request(false);
    expect(frames.callbacks).toHaveLength(1);
    expect(draws).toBe(0);

    const first = frames.callbacks.shift();
    first?.(16);
    expect(draws).toBe(1);
    expect(scheduler.frameCount).toBe(1);

    // The draw reported no animation and no data change arrived: no new frame
    // may be requested while the globe is idle.
    expect(frames.callbacks).toHaveLength(0);
    expect(scheduler.pending).toBe(false);
    expect(scheduler.frameCount).toBe(1);
  });

  it('keeps drawing only while an animation continues', () => {
    const frames = fakeFrames();
    let draws = 0;
    const scheduler = createFrameScheduler(
      () => {
        draws += 1;
        return draws < 3;
      },
      { requestFrame: frames.requestFrame, cancelFrame: frames.cancelFrame },
    );

    scheduler.request(true);
    for (let index = 0; index < 3; index += 1) {
      const callback = frames.callbacks.shift();
      callback?.(index * 16);
    }

    expect(draws).toBe(3);
    expect(frames.callbacks).toHaveLength(0);
  });

  it('coalesces repeated requests into one pending frame', () => {
    const frames = fakeFrames();
    const scheduler = createFrameScheduler(() => false, {
      requestFrame: frames.requestFrame,
      cancelFrame: frames.cancelFrame,
    });
    scheduler.request(false);
    scheduler.request(false);
    scheduler.request(false);
    expect(frames.callbacks).toHaveLength(1);
    scheduler.dispose();
  });
});
