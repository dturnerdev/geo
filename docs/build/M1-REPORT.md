# M1 Report — Map

## Done

- Created the isolated `build/m1` worktree from `main` and staged the completed
  M0 baseline from `origin/build/m0-fixes` without merging branches.
- Read and included `docs/build/M0-REPORT.md` and
  `docs/build/M0-fixes-REPORT.md` in the M1 worktree.
- Created and committed `docs/build/M1-plan.md` with dependency-ordered waves,
  package ownership, AC ranges and blocker status.
- M1-S3: created ADR-0001 for label collision and priority handling with
  troika-three-text. It remains Proposed because FE06's label input contract is
  incomplete; the question is recorded in the ADR.
- M1-S4: created ADR-0002 for per-feature state-texture styling. It remains
  Proposed because the feature-slot, snapshot and pack contracts are incomplete;
  five questions are recorded in the ADR.
- Final read-only review passed. No Builder review fixes were required.

## Blocked

- **M1-S1 — Pipeline geometry outputs:** source GeoJSON, the geometry-chunk
  schema and the stable feature-slot contract are not supplied by the spec or
  M0 implementation.
- **M1-S5 — Perspective files:** reviewed Natural Earth inputs and the complete
  perspective/pack schema are not supplied. Creating TOML without those inputs
  would guess at border and status data.
- **M1-S2 — Reference screenshots:** FE06 has no renderer yet.
- **FE06 — Globe and flat map:** the spec requires exact pinned Three.js,
  d3-geo and troika-three-text versions, but supplies no pins. It also refers to
  undefined types including `CameraTarget`, `CameraState`, `LngLat` and
  `AtlasSnapshot`.
- **FE07 — Perspectives and borders:** depends on FE06 and undefined
  `ContentItem`, `ItemKind`, `BorderLine`, `RegionCode` and perspective pack
  contracts.
- **FE08 — Living Atlas:** depends on FE06/FE07 and undefined `LearnerState`,
  `AtlasSnapshot` and `ItemFacetKey` contracts.
- **FE09 — Map detail and zoom:** depends on FE06 and undefined `DetailMesh`,
  `RegionChunkId` and service-worker chunk contracts.

No task was blocked for an account, legal review, physical device or human
decision. The blockers above are unresolved specification/data/dependency
contracts. No M1 implementation files were invented around them.

## Skipped tests (with reasons)

- No M1 AC test was written or skipped: FE06–FE09 have no implementable
  contracts, and writing tests would require guessing the missing interfaces.
- M1 manual/device ACs AC-06.3 and AC-09.8 were not run because their feature
  implementations do not exist; the Galaxy A07 4G and Redmi A5 are also not
  available locally.
- M1 screenshot, Playwright and network-trace ACs AC-06.2, AC-06.8,
  AC-06.10, AC-09.3 and AC-09.6 were not run because the FE06 renderer and
  detail loader do not exist.
- Existing M0 skips remain as documented in `docs/build/M0-fixes-REPORT.md`.

## Spec questions

- Where are the exact pinned versions and allowlist/licence requirements for
  Three.js, d3-geo and troika-three-text defined? 07 requires exact pins but
  does not provide them.
- What are the definitions and ownership of `CameraTarget`, `CameraState`,
  `LngLat`, `AtlasSnapshot`, `LearnerState`, `ItemFacetKey`, `DetailMesh` and
  `RegionChunkId`?
- How does app-shell provide label text and fame when FE06 only specifies
  `setVisibleLabels(items: ReadonlySet<ItemId>)`? See ADR-0001.
- What is the stable feature-slot and geometry-chunk schema shared by L0–L2,
  globe/flat meshes and region chunks? See ADR-0002.
- What is the complete `ContentPack`/`ContentView` schema for perspective
  status, names, border lines, sources and reviewers?
- What reviewed Natural Earth/GeoJSON source files are available for the M1
  pipeline and perspectives?
- What is the service-worker cache/chunk contract for FE09?
- The requested M0 reports were absent from the initial `main` worktree but are
  present on `origin/build/m0-fixes` and were staged into this branch. This is
  recorded for build-history clarity rather than treated as a current blocker.

## New dependencies (for the FE29 allowlist)

- None added by M1.
- The staged M0 baseline already contains the exact-pinned dependencies listed
  in `docs/build/M0-fixes-REPORT.md`: `@playwright/test` 1.65.1,
  `@sqlite.org/sqlite-wasm` 3.54.1-build1, `@capacitor-community/sqlite`
  8.1.1 and `zod` 4.6.7. They were not changed by M1.
- Three.js, d3-geo and troika-three-text were deliberately not added because
  the M1 spec does not provide exact pins.

## Carry forward

1. Resolve the dependency pins and the missing shared domain/content interfaces.
2. Supply reviewed Natural Earth/GeoJSON inputs and define the geometry chunk
   and feature-slot schema.
3. Implement FE06 and its AC-06 tests, then create the screenshot set.
4. Implement FE07 and its AC-07 tests and perspective fixtures.
5. Implement FE08 and FE09 with their AC tests, E2E checks and device checks.
6. Change ADR-0001 and ADR-0002 from Proposed only after their open contracts
   are resolved.

## Review these

- `docs/adr/0001-label-collision-and-priority.md` — Proposed; label input
  contract requires a spec decision.
- `docs/adr/0002-per-feature-state-texture.md` — Proposed; five data-contract
  questions require a spec decision.
- M0 cleanup: Playwright leaves `test-results/.last-run.json`, which is not in
  `.gitignore` or `.prettierignore`; it was removed after the final run so the
  M1 worktree is clean. This is not an M1 Builder change.
- The M1 reviewer found no implementation or review-fix miss in the completed
  M1 work.

## Final checks

| Command | Result |
|---|---|
| `pnpm lint` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm test` | Pass — 138 passed, 16 skipped |
| `pnpm e2e` | Pass — 2 passed, 4 skipped with reasons |
| `pnpm build` | Pass |
| `pnpm gates` | Pass — gates 1, 2, 7, 8, 9 and 11 |
| Final read-only M1 review | Pass — no Builder fixes required |
