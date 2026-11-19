export interface FrameSchedulerOptions {
  readonly requestFrame?: (callback: (timestamp: number) => void) => number;
  readonly cancelFrame?: (handle: number) => void;
  readonly now?: () => number;
}

export interface FrameScheduler {
  /** Ask for one frame. Repeated calls while a frame is pending are coalesced. */
  request(animate: boolean): void;
  /** Run the draw callback. Returns true when another frame was scheduled. */
  tick(timestamp: number): boolean;
  readonly frameCount: number;
  readonly pending: boolean;
  readonly animating: boolean;
  dispose(): void;
}

/**
 * Render-on-demand (FE06 Behaviour 3). When idle no frame is requested and no
 * frame is drawn, so the battery is not spent on an unchanged globe (AC-06.4).
 */
export function createFrameScheduler(
  draw: (timestamp: number) => boolean,
  options: FrameSchedulerOptions = {},
): FrameScheduler {
  const requestFrame =
    options.requestFrame ??
    ((callback: (timestamp: number) => void): number => globalThis.requestAnimationFrame(callback));
  const cancelFrame =
    options.cancelFrame ?? ((handle: number): void => globalThis.cancelAnimationFrame(handle));

  let handle: number | null = null;
  let animateWanted = false;
  let frameCount = 0;
  let disposed = false;

  const schedule = (): void => {
    if (disposed || handle !== null) {
      return;
    }
    handle = requestFrame((timestamp) => {
      handle = null;
      frameCount += 1;
      const continueAnimating = draw(timestamp);
      if (continueAnimating) {
        animateWanted = true;
        schedule();
      } else {
        animateWanted = false;
      }
    });
  };

  return {
    request(animate: boolean): void {
      animateWanted = animateWanted || animate;
      schedule();
    },
    tick(timestamp: number): boolean {
      frameCount += 1;
      const continueAnimating = draw(timestamp);
      animateWanted = continueAnimating;
      return continueAnimating;
    },
    get frameCount(): number {
      return frameCount;
    },
    get pending(): boolean {
      return handle !== null;
    },
    get animating(): boolean {
      return animateWanted;
    },
    dispose(): void {
      disposed = true;
      if (handle !== null) {
        cancelFrame(handle);
        handle = null;
      }
    },
  };
}
