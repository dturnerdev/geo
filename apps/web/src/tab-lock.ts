export type TabLockState = 'active' | 'locked-elsewhere';

interface LockManagerLike {
  request(
    name: string,
    options: { ifAvailable: true },
    callback: (lock: unknown) => Promise<TabLockState | 'released'>,
  ): Promise<TabLockState | 'released'>;
}

interface BrowserGlobals {
  navigator?: { locks?: LockManagerLike };
  BroadcastChannel?: typeof BroadcastChannel;
}

// One active tab on web (D100, D108). A second tab shows S19 and can ask the
// holder to finish its write, release the lock and show S19 itself.
export class TabCoordinator {
  private readonly name: string;
  private readonly channel: BroadcastChannel | null;
  private releaseHeld: (() => void) | null = null;

  constructor(name = 'geo-event-store') {
    this.name = name;
    const constructor = (globalThis as BrowserGlobals).BroadcastChannel;
    this.channel = constructor === undefined ? null : new constructor(`geo-tab-${name}`);
    this.channel?.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (event.data === 'use-here') {
        this.release();
      }
    });
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

    void locks.request(this.name, { ifAvailable: true }, async (lock) => {
      if (lock === null) {
        announce('locked-elsewhere');
        return 'locked-elsewhere';
      }

      const held = new Promise<void>((resolve) => {
        this.releaseHeld = resolve;
      });
      announce('active');
      await held;
      return 'released';
    });

    return acquired;
  }

  useHere(): void {
    this.channel?.postMessage('use-here');
  }

  release(): void {
    if (this.releaseHeld !== null) {
      const release = this.releaseHeld;
      this.releaseHeld = null;
      release();
    }
  }
}
