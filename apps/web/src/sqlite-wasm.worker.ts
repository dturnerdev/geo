import { createSqliteWasmSahPoolDriver, type SqlDriver } from '@geo/storage';
import {
  errorMessage,
  type SqliteWorkerRequest,
  type SqliteWorkerResponse,
} from './sqlite-worker-protocol.ts';

interface WorkerScope {
  postMessage(message: SqliteWorkerResponse): void;
  onmessage: ((event: MessageEvent<SqliteWorkerRequest>) => void) | null;
}

const scope = globalThis as unknown as WorkerScope;
const driverReady: Promise<SqlDriver> = createSqliteWasmSahPoolDriver();

interface OpenTransaction {
  readonly resolve: () => void;
  readonly reject: (reason: Error) => void;
  readonly done: Promise<void>;
}

let transaction: OpenTransaction | null = null;

function reply(message: SqliteWorkerResponse): void {
  scope.postMessage(message);
}

async function handle(request: SqliteWorkerRequest): Promise<void> {
  try {
    const driver = await driverReady;
    switch (request.method) {
      case 'execute':
        await driver.execute(request.sql, request.values);
        reply({ id: request.id, ok: true });
        return;
      case 'select': {
        const rows = await driver.select(request.sql, request.values);
        reply({ id: request.id, ok: true, rows });
        return;
      }
      case 'begin': {
        if (transaction !== null) {
          throw new Error('a transaction is already open');
        }
        let resolve: () => void = () => undefined;
        let reject: (reason: Error) => void = () => undefined;
        const held = new Promise<void>((next, fail) => {
          resolve = next;
          reject = fail;
        });
        const done = driver.transaction(() => held);
        // The rejection is delivered to whoever asks to commit or roll back;
        // this catch only prevents an unhandled rejection in the Worker.
        void done.catch(() => undefined);
        transaction = { resolve, reject, done };
        reply({ id: request.id, ok: true });
        return;
      }
      case 'commit': {
        const current = transaction;
        if (current === null) {
          throw new Error('no transaction is open');
        }
        current.resolve();
        await current.done;
        transaction = null;
        reply({ id: request.id, ok: true });
        return;
      }
      case 'rollback': {
        const current = transaction;
        if (current === null) {
          throw new Error('no transaction is open');
        }
        current.reject(new Error('transaction rolled back'));
        await current.done.catch(() => undefined);
        transaction = null;
        reply({ id: request.id, ok: true });
        return;
      }
    }
  } catch (cause) {
    reply({ id: request.id, ok: false, error: errorMessage(cause) });
  }
}

scope.onmessage = (event) => {
  void handle(event.data);
};
