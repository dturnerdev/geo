import type { SqlRow, SqlValue } from '@geo/storage';

export type SqliteWorkerRequest =
  | {
      readonly id: number;
      readonly method: 'execute';
      readonly sql: string;
      readonly values: readonly SqlValue[];
    }
  | {
      readonly id: number;
      readonly method: 'select';
      readonly sql: string;
      readonly values: readonly SqlValue[];
    }
  | { readonly id: number; readonly method: 'begin' }
  | { readonly id: number; readonly method: 'commit' }
  | { readonly id: number; readonly method: 'rollback' };

export type SqliteWorkerResponse =
  | { readonly id: number; readonly ok: true; readonly rows?: readonly SqlRow[] }
  | { readonly id: number; readonly ok: false; readonly error: string };

export function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
