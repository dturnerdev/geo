import { createWebContentSource } from './content.ts';
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

  const content = createWebContentSource();
  const storage = await createWebEventStore();
  if (root !== null) {
    root.dataset.ready = 'true';
    root.dataset.storage = storage.kind;
    root.dataset.contentPack = content.current().packVersion;
    if (storage.kind === 'opfs-unavailable') {
      root.dataset.screen = storage.screen;
    }
  }

  // First launch already has the bundled pack; a check may stage an update in
  // the background but never blocks the first question (FE02 behaviour 1–4).
  void content.checkForUpdate('open');
}

void bootstrap();
