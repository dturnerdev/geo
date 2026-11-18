import type { Result } from '@geo/domain';
import type { ContentSource, PackError, PackVersion } from '@geo/content';
import type { EventStore, StoreError } from '@geo/storage';
import { appendWithRetry } from './append.ts';
import type { EventFactory } from './event-factory.ts';

export type ContentApplyOutcome =
  | {
      readonly status: 'applied';
      readonly packVersion: PackVersion;
      readonly dataFormat: string;
    }
  | { readonly status: 'no-pack' }
  | { readonly status: 'deferred'; readonly reason: 'round-in-progress' }
  | { readonly status: 'error'; readonly error: PackError }
  | {
      readonly status: 'storage-error';
      readonly packVersion: PackVersion;
      readonly error: StoreError;
    };

export interface ApplyContentPackAtPauseOptions {
  readonly source: ContentSource;
  readonly factory: EventFactory;
  readonly store: EventStore;
  readonly roundInProgress: boolean;
}

// 07 §5 pause order step 2: a ready pack applies at a pause, never mid-round
// (FE02 behaviour 5, D163). app-shell owns event creation (07 §4).
export async function applyReadyContentPackAtPause(
  options: ApplyContentPackAtPauseOptions,
): Promise<ContentApplyOutcome> {
  if (options.roundInProgress) {
    return { status: 'deferred', reason: 'round-in-progress' };
  }

  const applied: Result<PackVersion | null, PackError> = options.source.applyReadyPack();
  if (!applied.ok) {
    return { status: 'error', error: applied.error };
  }
  if (applied.value === null) {
    return { status: 'no-pack' };
  }

  const dataFormat = options.source.current().dataFormat;
  const event = options.factory.create('ContentPackApplied', {
    packVersion: applied.value,
    dataFormat,
  });
  const outcome = await appendWithRetry(options.store, [event]);
  if (outcome.status === 's21') {
    return {
      status: 'storage-error',
      packVersion: applied.value,
      error: outcome.error,
    };
  }

  return {
    status: 'applied',
    packVersion: applied.value,
    dataFormat,
  };
}
