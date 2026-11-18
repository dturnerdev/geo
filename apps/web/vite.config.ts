import { defineConfig } from 'vite';

export default defineConfig({
  // sqlite-wasm locates sqlite3.wasm next to its JavaScript. Pre-bundling moves
  // the JavaScript without the binary, so exclude it from dependency
  // optimisation in dev; production copies the asset through the build.
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
