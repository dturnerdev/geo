/**
 * The flat cut mesh is lazy-loaded after the first question appears (FE06
 * Behaviour 6). App-shell signals the first question by supplying overlays or
 * the visible-label set for that question; mounting and idle startup never
 * request the cut mesh (AC-06.10).
 */
export interface LazyCutMeshLoader<T> {
  /** Record that a question is on screen. Idempotent. */
  noteFirstQuestion(): void;
  /** Start the load once, and only after the first question. */
  request(): Promise<T> | null;
  readonly requested: boolean;
  readonly firstQuestionSeen: boolean;
}

export function createLazyCutMeshLoader<T>(load: () => Promise<T>): LazyCutMeshLoader<T> {
  let firstQuestionSeen = false;
  let requested = false;
  let promise: Promise<T> | null = null;

  return {
    noteFirstQuestion(): void {
      firstQuestionSeen = true;
    },
    request(): Promise<T> | null {
      if (!firstQuestionSeen) {
        return null;
      }
      if (!requested) {
        requested = true;
        promise = load();
      }
      return promise;
    },
    get requested(): boolean {
      return requested;
    },
    get firstQuestionSeen(): boolean {
      return firstQuestionSeen;
    },
  };
}
