export type TabLockState = 'active' | 'locked-elsewhere';

interface LockManagerLike {
  request(
    name: string,
    options: { ifAvailable: true },
    callback: (lock: unknown) => Promise<TabLockState | 'released'>,
  ): Promise<TabLockState | 'released'>;
  request(
    name: string,
    callback: (lock: unknown) => Promise<TabLockState | 'released'>,
  ): Promise<TabLockState | 'released'>;
}

interface BrowserGlobals {
  navigator?: { locks?: LockManagerLike };
  BroadcastChannel?: typeof BroadcastChannel;
}

export interface TabCoordinatorOptions {
  // Runs in the holder before the lock is released. The holder finishes any
  // pending write here so the next tab never overlaps it (D108).
  readonly beforeRelease?: () => Promise<void> | void;
}

// One active tab on web (D100, D108). A second tab shows S19 and can ask the
// holder to finish its write, release the lock and show S19 itself.
export class TabCoordinator {
  private readonly name: string;
  private readonly channel: BroadcastChannel | null;
  private readonly beforeRelease: () => Promise<void> | void;
  private releaseHeld: (() => void) | null = null;

  constructor(name = 'geo-event-store', options: TabCoordinatorOptions = {}) {
    this.name = name;
    this.beforeRelease = options.beforeRelease ?? (() => undefined);
    const constructor = (globalThis as BrowserGlobals).BroadcastChannel;
    this.channel = constructor === undefined ? null : new constructor(`geo-tab-${name}`);
    this.channel?.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (event.data === 'use-here') {
        void this.requestRelease();
      }
    });
  }

  private async hold(lock: unknown, announce: (state: TabLockState) => void): Promise<'released'> {
    if (lock === null) {
      announce('locked-elsewhere');
      return 'released';
    }

    const held = new Promise<void>((resolve) => {
      this.releaseHeld = resolve;
    });
    announce('active');
    await held;
    return 'released';
  }

  claim(): Promise<TabLockState> {
    const locks = (globalThis as BrowserGlobals).navigator?.locks;
    if (locks === undefined) {
      return Promise.resolve('active');
    }

    let announce: (state: TabLockState) => void = () => undefined;
    const acquired = new Promise<TabLockState>((resolve) => {
      announce = resolve;
    });

    void locks.request(this.name, { ifAvailable: true }, (lock) => this.hold(lock, announce));

    return acquired;
  }

  // After "Use here" the other tab waits for the holder to release, then takes
  // over. Showing S19 in the meantime is the caller's job.
  claimWhenAvailable(): Promise<TabLockState> {
    const locks = (globalThis as BrowserGlobals).navigator?.locks;
    if (locks === undefined) {
      return Promise.resolve('active');
    }

    let announce: (state: TabLockState) => void = () => undefined;
    const acquired = new Promise<TabLockState>((resolve) => {
      announce = resolve;
    });

    void locks.request(this.name, (lock) => this.hold(lock, announce));

    return acquired;
  }

  useHere(): void {
    this.channel?.postMessage('use-here');
  }

  private async requestRelease(): Promise<void> {
    try {
      await this.beforeRelease();
    } finally {
      this.release();
    }
  }

  release(): void {
    if (this.releaseHeld !== null) {
      const release = this.releaseHeld;
      this.releaseHeld = null;
      release();
    }
  }
}
