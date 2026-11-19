# Licence register

Every dependency and asset is recorded here with its licence before it enters a
build. Gate 9 checks that every external dependency in the workspace has an
entry. Update this table in the same PR that adds or removes a dependency
(D107, AC-29.3).

| Package or asset | Version | Licence | Use |
|---|---|---|---|
| `@capacitor-community/sqlite` | 8.1.1 | MIT | Android SQLite persistence |
| `@eslint/js` | 9.39.5 | MIT | Lint configuration |
| `@formatjs/icu-messageformat-parser` | 3.5.23 | BSD-3-Clause | ICU message validation (gate 2) |
| `@playwright/test` | 1.65.1 | Apache-2.0 | Desktop Chromium E2E tests |
| `@sqlite.org/sqlite-wasm` | 3.54.1-build1 | Apache-2.0 | Web SQLite persistence |
| `@types/node` | 22.20.5 | MIT | Node type definitions |
| `d3-geo` | 3.1.2 | ISC | Equal Earth projection and inverse projection |
| `eslint` | 9.39.5 | MIT | Lint (gate 2) |
| `eslint-config-prettier` | 10.1.8 | MIT | Lint and format integration |
| `fast-check` | 4.10.3 | MIT | Property tests (gate 7) |
| `globals` | 17.14.0 | MIT | Lint globals |
| `prettier` | 3.10.1 | MIT | Formatting (gate 2) |
| `three` | 0.187.0 | MIT | Globe and flat-map renderer |
| `typescript` | 5.9.3 | Apache-2.0 | Type check (gate 1) |
| `typescript-eslint` | 8.73.0 | MIT | Type-aware lint (gate 2) |
| `troika-three-text` | 0.53.1 | MIT | Globe labels |
| `vite` | 7.3.8 | MIT | Web build (gate 8) |
| `vitest` | 3.2.7 | MIT | Unit and property tests (gate 7) |
| `zod` | 4.6.7 | MIT | Boundary validation for domain events and persistence |

## Audio

Release audio is listed with its licence and a `commercial: true` sidecar in
`content/audio/`. Gate 9 rejects non-commercial test audio in a release build
(D87, D89).

## Assets

Font, map and content licences are added by the features that introduce them.
