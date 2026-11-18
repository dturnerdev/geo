import type { SqlDriver, SqlRow, SqlValue } from '@geo/storage';
import {
  errorMessage,
  type SqliteWorkerRequest,
  type SqliteWorkerResponse,
} from './sqlite-worker-protocol.ts';

interface PendingCall {
  readonly resolve: (rows: readonly SqlRow[] | undefined) => void;
  readonly reject: (reason: Error) => void;
}

type CallInput =
  | { readonly method: 'execute'; readonly sql: string; readonly values: readonly SqlValue[] }
  | { readonly method: 'select'; readonly sql: string; readonly values: readonly SqlValue[] }
  | { readonly method: 'begin' }
  | { readonly method: 'commit' }
  | { readonly method: 'rollback' };

// Main-thread side of the dedicated storage Worker. Only the Worker imports
// SQLite; this keeps the main thread off the database and OPFS handling.
class WorkerSqlDriver implements SqlDriver {
  private readonly worker: Worker;
  private readonly pending = new Map<number, PendingCall>();
  private nextId = 1;
  private tail: Promise<void> = Promise.resolve();
  private activeTransaction = false;

  constructor(worker: Worker) {
    this.worker = worker;
    this.worker.onmessage = (event: MessageEvent<SqliteWorkerResponse>) => {
      const response = event.data;
      const pending = this.pending.get(response.id);
      if (pending === undefined) {
        return;
      }
      this.pending.delete(response.id);
      if (response.ok) {
        pending.resolve(response.rows);
      } else {
        pending.reject(new Error(response.error));
      }
    };
    this.worker.onerror = (event) => {
      this.failAll(new Error(event.message));
    };
  }

  private failAll(error: Error): void {
    for (const call of this.pending.values()) {
      call.reject(error);
    }
    this.pending.clear();
  }

  private call(request: CallInput): Promise<readonly SqlRow[] | undefined> {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const message: SqliteWorkerRequest = { ...request, id };
      this.worker.postMessage(message);
    });
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.tail.then(operation, operation);
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  execute(sql: string, values: readonly SqlValue[] = []): Promise<void> {
    const operation = async (): Promise<void> => {
      await this.call({ method: 'execute', sql, values });
    };
    return this.activeTransaction ? operation() : this.enqueue(operation);
  }

  select(sql: string, values: readonly SqlValue[] = []): Promise<readonly SqlRow[]> {
    const operation = async (): Promise<readonly SqlRow[]> => {
      const rows = await this.call({ method: 'select', sql, values });
      return rows ?? [];
    };
    return this.activeTransaction ? operation() : this.enqueue(operation);
  }

  transaction<T>(operation: () => Promise<T>): Promise<T> {
    return this.enqueue(async () => {
      await this.call({ method: 'begin' });
      this.activeTransaction = true;
      try {
        const result = await operation();
        await this.call({ method: 'commit' });
        return result;
      } catch (cause) {
        try {
          await this.call({ method: 'rollback' });
        } catch {
          // The original failure is the useful one.
        }
        throw cause;
      } finally {
        this.activeTransaction = false;
      }
    });
  }

  close(): Promise<void> {
    this.failAll(new Error('the storage Worker was closed'));
    this.worker.terminate();
    return Promise.resolve();
  }
}

export function createWorkerSqlDriver(worker: Worker): SqlDriver {
  return new WorkerSqlDriver(worker);
}

export function spawnSqliteWasmWorker(): Worker {
  return new Worker(new URL('./sqlite-wasm.worker.ts', import.meta.url), {
    type: 'module',
    name: 'geo-storage',
  });
}

export { errorMessage };
