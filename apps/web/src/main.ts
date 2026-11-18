import { appendWithRetry, createInstallIdentity, EventFactory } from '@geo/app-shell';
import { eventContextSchema } from '@geo/domain';
import type { EventStore } from '@geo/storage';
import { createWebContentSource } from './content.ts';
import { createWebEventStore } from './storage.ts';
import { TabCoordinator } from './tab-lock.ts';

type Root = HTMLDivElement;

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function renderShell(root: Root, screen: string): void {
  root.replaceChildren();
  root.dataset['screen'] = screen;
}

function renderStorageProblem(root: Root): void {
  if (root.dataset['screen'] === 'S19') {
    return;
  }
  renderShell(root, 'S21');
  root.dataset['storage'] = 'unavailable';
  root.append(
    element('h1', 'Progress cannot be saved here'),
    element('p', 'Continue without saving'),
  );
}

// S19: another tab holds the Web Lock. "Use here" asks the holder to release
// it; we only become active once the lock is actually ours (FE01, D108).
function renderLockedElsewhere(
  root: Root,
  tab: TabCoordinator,
  takeOver: () => Promise<void>,
): void {
  renderShell(root, 'S19');
  root.dataset['lock'] = 'locked-elsewhere';
  const button = element('button', 'Use here');
  button.type = 'button';
  button.dataset['action'] = 'use-here';
  button.addEventListener('click', () => {
    button.disabled = true;
    button.textContent = 'Taking over…';
    tab.useHere();
    void takeOver();
  });
  root.append(element('h1', 'Another tab is active'), button);
}

async function renderActive(root: Root, store: EventStore, packVersion: string): Promise<void> {
  const now = Date.now();
  const identity = createInstallIdentity(now);
  const context = eventContextSchema.parse({
    id: 1,
    appVersion: '0.0.0',
    contentPackVersion: packVersion,
    graderVersions: {},
    platform: 'web',
  });
  const factory = new EventFactory({ identity, contextId: context.id });
  const count = await store.count();

  renderShell(root, 'S03');
  root.dataset['lock'] = 'active';
  root.dataset['storage'] = 'ready';
  root.dataset['contentPack'] = packVersion;
  root.dataset['eventCount'] = String(count);

  const start = element('button', 'Start round');
  start.type = 'button';
  start.dataset['action'] = 'start-round';
  start.addEventListener('click', () => {
    start.disabled = true;
    void (async () => {
      const startedAt = Date.now();
      const event = factory.create('RoundStarted', {
        roundId: `round-${startedAt}`,
        seed: `seed-${startedAt}`,
      });
      const outcome = await appendWithRetry(store, [event]);
      if (outcome.status === 's21') {
        renderStorageProblem(root);
        return;
      }
      const nextCount = await store.count();
      root.dataset['eventCount'] = String(nextCount);
      root.dataset['round'] = 'in-progress';
      start.textContent = 'Round started';
    })();
  });

  root.append(element('h1', 'M0 foundations harness'), start);
}

async function bootstrap(): Promise<void> {
  const root = document.querySelector<Root>('#app');
  if (root === null) {
    return;
  }

  let activeRun: Promise<void> = Promise.resolve();
  let currentStore: EventStore | null = null;
  let closeStorage: (() => Promise<void>) | null = null;

  const tab = new TabCoordinator('geo-event-store', {
    beforeRelease: async () => {
      // Let any accepted write settle and close the OPFS access handles before
      // the next tab can take the lock (D108).
      await activeRun;
      if (currentStore !== null) {
        await currentStore.count();
      }
      const close = closeStorage;
      closeStorage = null;
      currentStore = null;
      if (close !== null) {
        await close();
      }
      renderLockedElsewhere(root, tab, takeOver);
    },
  });

  const takeOver = async (): Promise<void> => {
    const state = await tab.claimWhenAvailable();
    if (state === 'active') {
      await startActive();
    }
  };

  const startActive = async (): Promise<void> => {
    const content = createWebContentSource();
    const storage = await createWebEventStore();
    currentStore = storage.store;
    closeStorage = storage.close;
    if (storage.kind === 'opfs-unavailable') {
      renderStorageProblem(root);
      return;
    }
    activeRun = renderActive(root, storage.store, content.current().packVersion);
    await activeRun;
    void content.checkForUpdate('open');
  };

  const initial = await tab.claim();
  if (initial === 'locked-elsewhere') {
    renderLockedElsewhere(root, tab, takeOver);
    return;
  }

  await startActive();
}

void bootstrap();
