# M1 Report — Map

## Base commit

`origin/main` at run start: `2b60b519ce5fe5299afa58811ef40a83a56b0a85`.

## Status

**Partially complete and ready for review:** FE06, FE07 and FE09, the geometry
pipeline setup, dependency setup and review fixes are complete. FE08 is blocked
from start because its exact contract takes the M3-owned, undefined
`LearnerState`. This is one of four M1 features, so the missing-contract stop
threshold was not reached.

## Done

- Created and followed the dependency-ordered M1 plan in
  `docs/build/M1-plan.md`.
- Added the three spec-allowlisted exact map pins and their allowlist/licence
  entries: `d3-geo`, `three` and `troika-three-text`.
- Added validated geometry chunks, stable feature slots, tap-zone invariants,
  detail-level pipeline support and pack schemas.
- Implemented FE06 globe/flat projection, coordinate validation, picking,
  camera/morph behaviour, render-on-demand scheduling, labels, overlays,
  context recovery, keyboard handling and atlas texture boundary support.
- Implemented FE07 generic perspective selection, content views, provenance and
  inheritance validation, border-pattern data and perspective history handling.
  No unresolved learner-visible perspective data was invented.
- Implemented FE09 built-in detail loading, hysteresis, cache planning,
  service-worker chunk verification and data-saver/offline gating.
- Completed independent read-only review. No implementation, boundary,
  dependency or network blockers were found.
- Added explicit not-done `it.todo` entries for review-identified ACs whose M3
  or pause-flow contracts do not exist; no additional AC was skipped.

## Blocked

- FE08 Living Atlas engine projection and summary functions: `LearnerState` is
  M3-owned and remains undefined in the repository.
- Human approval of proposed ADR-0001 and ADR-0002.
- Reference screenshot set and hosted gate-6 runs.
- Reviewed `uk`, `us` and `default` perspective TOML data.
- Physical Android/reference-device runs and hosted map E2E remain unavailable
  locally.

## AC status and evidence

Each M1 AC appears once below. `todo` entries are deliberately **not done**;
they are not skipped tests.

| AC | Status | Test path/name or evidence |
|---|---|---|
| AC-06.1 | test passing | `packages/engine/src/geo/geo.test.ts` and `packages/globe/src/ac-06-01.test.ts` — 10,000-point round trips |
| AC-06.2 | skipped (hosted-only/reference setup) | `packages/globe/src/ac-external.test.ts` — screenshot set and hosted gate unavailable |
| AC-06.3 | skipped (physical-device/manual) | `packages/globe/src/ac-external.test.ts` — Galaxy A07 4G and Redmi A5 unavailable |
| AC-06.4 | test passing | `packages/globe/src/frame-scheduler.test.ts` — idle frame count |
| AC-06.5 | test passing | `packages/globe/src/morph.test.ts` — 700 ms morph and reduced-motion crossfade |
| AC-06.6 | skipped (hosted-only browser harness) | `packages/globe/src/ac-external.test.ts` — forced WebGL context-loss harness unavailable |
| AC-06.7 | test passing | `packages/globe/src/import-boundary.test.ts` and gate-2 boundary check |
| AC-06.8 | skipped (hosted-only Playwright) | `packages/globe/src/ac-external.test.ts` — web E2E globe focus harness unavailable |
| AC-06.9 | test passing | `packages/globe/src/label-layout.test.ts` — empty visible-label set |
| AC-06.10 | test passing | `packages/globe/src/cut-mesh-loader.test.ts` — lazy request gate |
| AC-07.1 | test passing | `packages/domain/src/perspective.test.ts` — selection table |
| AC-07.2 | not done (M3 question-generation contract absent) | `packages/content/src/ac-07-todos.test.ts` — perspective item-kind property test todo |
| AC-07.3 | not done (M3 question-generation and disputed-content contract absent) | `packages/content/src/ac-07-todos.test.ts` — membership-question property test todo |
| AC-07.4 | skipped (hosted-only screenshot/colour simulation) | `packages/globe/src/ac-07-external.test.ts` |
| AC-07.5 | not done (app-shell pause-flow contract absent) | `packages/app-shell/src/ac-07-pause-todos.test.ts` |
| AC-07.6 | not done (M3 scheduling and `LearnerState` contract absent) | `packages/content/src/ac-07-todos.test.ts` |
| AC-07.7 | test passing | `tools/content-pipeline/src/perspective.test.ts` — provenance validation |
| AC-07.8 | skipped (manual reviewed data/golden fixture) | `tools/content-pipeline/src/perspective.test.ts` — reviewed perspective files unavailable |
| AC-07.9 | skipped (hosted-only E2E) | `packages/globe/src/ac-07-external.test.ts` — full perspective-change E2E unavailable |
| AC-08.1 | not done (M3 `LearnerState` contract absent) | `packages/engine/src/atlas/ac-08-todos.test.ts` |
| AC-08.2 | not done (M3 learner projection absent) | `packages/engine/src/atlas/ac-08-todos.test.ts` |
| AC-08.3 | not done (M3 learner state and pause flow absent) | `packages/engine/src/atlas/ac-08-todos.test.ts` |
| AC-08.4 | not done (M3 atlas-state generation absent) | `packages/engine/src/atlas/ac-08-todos.test.ts` |
| AC-08.5 | not done (M3 learner state and haptic pause flow absent) | `packages/engine/src/atlas/ac-08-todos.test.ts` |
| AC-08.6 | not done (M3 atlas projection and summary absent) | `packages/engine/src/atlas/ac-08-todos.test.ts` |
| AC-08.7 | not done (M3 summary UI surface absent) | `packages/engine/src/atlas/ac-08-todos.test.ts` |
| AC-08.8 | not done (M3 atlas renderer integration absent) | `packages/engine/src/atlas/ac-08-todos.test.ts` |
| AC-08.9 | not done (M3 `RecallPredictor` boundary absent) | `packages/engine/src/atlas/ac-08-todos.test.ts` |
| AC-09.1 | test passing | Gate 8 size check; current web build is under 3 MB, with the asset caveat recorded below |
| AC-09.2 | skipped (Android/hosted package check) | `packages/globe/src/ac-09-external.test.ts` |
| AC-09.3 | skipped (hosted-only browser/offline deployment) | `apps/web/e2e/fe09.spec.ts` |
| AC-09.4 | test passing | `packages/globe/src/detail-level.test.ts` — boundary hysteresis |
| AC-09.5 | test passing | `packages/content/src/geometry.test.ts` — 10,000-case L0/L1/L2 tap parity property |
| AC-09.6 | test passing | `packages/content/src/host.test.ts`, `packages/content/src/detail-cache.test.ts` and service-worker host checks |
| AC-09.7 | test passing | `packages/content/src/detail-cache.test.ts` — data-saver gating |
| AC-09.8 | skipped (physical-device/manual) | `packages/globe/src/ac-09-external.test.ts` — Redmi A5 run unavailable |
| AC-09.9 | test passing | `packages/globe/src/detail-level.test.ts` — 0.25-level hysteresis |

## Skipped tests and reasons

The skipped entries above are limited to hosted/reference screenshot work,
hosted browser E2E, Android packaging, and physical-device/manual performance
or accessibility runs. All other unresolved automated checks are represented as
not-done todo tests, not skips.

## Spec questions

These points were searched with `rg -U` before being treated as undefined and
were not guessed:

1. The four questions from the merged contracts report remain open: perspective
   status vocabulary/future perspectives, missing-locale fallback, disputed-area
   content and treatment, and rendering when an item leaves a perspective.
2. FE08 still names `LearnerState` in its signature but does not define it; the
   contracts report explicitly says it is M3-owned and unsafe to invent.
3. FE09 gives no numeric detail thresholds: `placeholders.md` says “Detail
   rises at threshold T” and the feature says “a detail level appears at its
   zoom threshold T”. The implementation accepts thresholds from its caller.
4. FE09 gives no numeric maximum-zoom calibration beyond “the smallest core
   item fills about a third of the screen”. No value was invented.
5. The content spec describes chunks by detail level and region, while the
   existing immutable chunk descriptor contains only a SHA-256. FE09 recovers
   level/region metadata from validated chunk content rather than changing the
   descriptor contract.
6. The current web bundle is below the size limit, but real L0 geometry and the
   named self-hosted font asset are not yet present in the bundled web content;
   the size gate therefore needs a real-asset follow-up before release
   confidence.

## New dependencies

- `d3-geo` `3.1.2` — ISC — FE06 Equal Earth projection.
- `three` `0.187.0` — MIT — FE06 renderer.
- `troika-three-text` `0.53.1` — MIT — FE06 labels.

All are named by the spec, exact-pinned, allowlisted and in the licence
register. No other runtime dependencies were added during M1.

## Carry forward

- Define the M3 `LearnerState` and scheduling contracts, then implement FE08 and
  replace its todo AC entries with real tests.
- Add M3 question generation and app-shell pause flow, then complete the
  not-done FE07 ACs.
- Resolve the four perspective questions, obtain reviewed perspective data and
  create the golden fixtures.
- Supply real Natural Earth geometry/font assets, register the service worker
  in the production web shell, and rerun the full asset-size/offline E2E checks.
- Provide numeric zoom thresholds and maximum-zoom calibration.
- Run Android APK/AAB, Galaxy A07 4G, Redmi A5 and hosted screenshot/context-loss
  checks.

## Review these

- Human approval of ADR-0001 and ADR-0002.
- The four unresolved perspective decisions before learner-visible packs ship.
- The FE09 real-asset size caveat and service-worker production registration.
- The placement of FE08 renderer-side types in `globe` versus the future engine
  atlas contract.
- The todo AC ledger when M2/M3 contracts land.

## Exact commit list

The following is the exact `git log --oneline --reverse origin/main..HEAD`
before this report commit:

```text
140372b build(M1): plan
98648e5 build(M1): add map runtime dependencies
9cef745 feat(FE09): add geometry pipeline contracts
6d6ca8f feat(FE06): add globe and flat map
8b271a0 build(M1): update plan
e9d744b build(M1): update plan
bce9900 feat(FE07): add perspectives and borders
e860fc9 build(M1): register map dependencies
63667ab build(M1): update plan
fc20cda build(M1): update plan
e6e5f4c feat(FE09): add map detail and zoom
c99b254 build(M1): update plan
877e029 fix(M1): review fixes
afc66d4 build(M1): update plan
```

The report is committed immediately after this list as `docs(M1): report`.

## Final checks

| Command | Result |
|---|---|
| `pnpm lint` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm test` | Pass — 217 passed, 25 skipped, 13 todo |
| `pnpm e2e` | Pass — 2 passed, 5 skipped |
| `pnpm build` | Pass |
| `pnpm format:check` | Pass after generated Playwright artefacts were removed |
| `pnpm gates` | Pass — gates 1, 2, 7, 8, 9 and 11 |
| `git diff --check` | Pass |
| Independent read-only review | Pass — no implementation or gate blockers; review todos added in `877e029` |
