// D111: background checks run at most every 12 h, at most twice in 24 h, and
// only on unmetered networks with the battery not low. Web checks on open.
// These hooks are pure so Android and web share the same policy tests.

export type UpdateReason = 'launch' | 'background' | 'open';

export type DeferralReason =
  'metered' | 'data-saver' | 'battery-low' | 'mobile-data-off' | 'too-soon' | 'frequency-limit';

export interface NetworkConditions {
  readonly online: boolean;
  /** Mobile data or another network the user may have disabled (D111). */
  readonly metered: boolean;
  readonly dataSaver: boolean;
  readonly batteryLow: boolean;
  /** The "Network" setting: mobile data off by default (FE02 behaviour 4). */
  readonly mobileDataAllowed: boolean;
}

export interface SchedulerDecision {
  readonly allowed: boolean;
  readonly reason?: DeferralReason;
}

export interface SchedulerOptions {
  readonly minimumIntervalMs?: number;
  readonly maximumBackgroundChecksPerDay?: number;
  readonly initialLastCheckAt?: number;
  readonly initialBackgroundChecks?: readonly number[];
}

export const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export class UpdateScheduler {
  private readonly minimumIntervalMs: number;
  private readonly maximumBackgroundChecksPerDay: number;
  private lastCheckAt: number | null;
  private backgroundChecks: number[];

  constructor(options: SchedulerOptions = {}) {
    this.minimumIntervalMs = options.minimumIntervalMs ?? TWELVE_HOURS_MS;
    this.maximumBackgroundChecksPerDay = options.maximumBackgroundChecksPerDay ?? 2;
    this.lastCheckAt = options.initialLastCheckAt ?? null;
    this.backgroundChecks = [...(options.initialBackgroundChecks ?? [])].sort(
      (left, right) => left - right,
    );
  }

  canCheck(reason: UpdateReason, at: number): SchedulerDecision {
    if (reason === 'open') {
      return { allowed: true };
    }

    if (this.lastCheckAt !== null && at - this.lastCheckAt < this.minimumIntervalMs) {
      return { allowed: false, reason: 'too-soon' };
    }

    if (reason === 'background') {
      const windowStart = at - ONE_DAY_MS;
      const checksInWindow = this.backgroundChecks.filter(
        (checkedAt) => checkedAt >= windowStart,
      ).length;
      if (checksInWindow >= this.maximumBackgroundChecksPerDay) {
        return { allowed: false, reason: 'frequency-limit' };
      }
    }

    return { allowed: true };
  }

  recordCheck(reason: UpdateReason, at: number): void {
    this.lastCheckAt = at;
    if (reason === 'background') {
      const windowStart = at - ONE_DAY_MS;
      this.backgroundChecks = [
        ...this.backgroundChecks.filter((checkedAt) => checkedAt >= windowStart),
        at,
      ];
    }
  }
}

export function networkDeferral(
  reason: UpdateReason,
  conditions: NetworkConditions,
): DeferralReason | null {
  if (!conditions.online) {
    return null;
  }
  if (conditions.dataSaver) {
    return 'data-saver';
  }
  // A background job is never allowed on metered data (D111, AC-02.5).
  if (reason === 'background' && conditions.metered) {
    return 'metered';
  }
  if (conditions.metered && !conditions.mobileDataAllowed) {
    return 'mobile-data-off';
  }
  if (reason === 'background' && conditions.batteryLow) {
    return 'battery-low';
  }
  return null;
}
