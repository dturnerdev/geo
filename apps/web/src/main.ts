import { createWebEventStore } from './storage.ts';
import { TabCoordinator } from './tab-lock.ts';

async function bootstrap(): Promise<void> {
  const root = document.querySelector<HTMLDivElement>('#app');
  const tab = new TabCoordinator();
  const lock = await tab.claim();

  if (lock === 'locked-elsewhere') {
    if (root !== null) {
      root.dataset.screen = 'S19';
    }
    return;
  }

  const storage = await createWebEventStore();
  if (root !== null) {
    root.dataset.ready = 'true';
    root.dataset.storage = storage.kind;
    if (storage.kind === 'opfs-unavailable') {
      root.dataset.screen = storage.screen;
    }
  }
}

void bootstrap();
