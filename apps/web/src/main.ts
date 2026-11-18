// Web entry scaffold (07 §3). Screens and app-shell wiring land with FE01.
export {};

const root = document.querySelector<HTMLDivElement>('#app');
if (root !== null) {
  root.dataset.ready = 'true';
}
