export interface Clock {
  now(): number;
  zone(): string;
}

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }

  zone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  }
}

// `at` is monotonic per device even when the wall clock moves backwards. The
// wall-clock reading is only for diagnostics (FE01 edge cases).
export class MonotonicClock {
  private lastAt: number;

  constructor(lastAt = -1) {
    this.lastAt = lastAt;
  }

  observe(at: number): void {
    if (at > this.lastAt) {
      this.lastAt = at;
    }
  }

  next(now: number): number {
    this.lastAt = Math.max(Math.floor(now), this.lastAt);
    return this.lastAt;
  }

  get last(): number {
    return this.lastAt;
  }
}
