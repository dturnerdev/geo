# M1 build plan — Map

**Milestone:** M1 — Map (FE06–FE09)  
**Branch:** `build/m1`  
**Source status:** The worktree was created from `main` as requested. The completed M0 baseline was then staged from `origin/build/m0-fixes` without merging branches; `docs/build/M0-REPORT.md` and `docs/build/M0-fixes-REPORT.md` are now present. M1 still does not guess around undefined M1 data contracts, source inputs or exact dependency pins.

## Waves

Tasks are ordered by the `Depends on` lines in the feature specification. A task
enters a wave only after all of its dependencies are done, and tasks in one wave
do not share a package.

| Wave | Task | Depends on | Packages/files owned | ACs | Status |
|---|---|---|---|---|---|
| 1 | M1-S3 — ADR: label collision and priority approach | none | `docs/adr/` | setup output | Done — ADR-0001; one interface spec question recorded |
| 2 | M1-S4 — ADR: per-feature state texture styling | M1-S3 | `docs/adr/` | setup output | Done — ADR-0002; five data-contract questions recorded |
| 3 | M1-S1 — Pipeline geometry outputs | FE02/M0 content schema, M1-S5 | `tools/content-pipeline/`, `packages/content/` | setup output; FE06 AC-06.1, AC-06.2, AC-06.10; FE09 AC-09.1–AC-09.2 | Blocked — source GeoJSON, geometry chunk schema and feature-slot contract are not supplied |
| 3 | M1-S5 — Perspective files (`uk`, `us`, `default`) | FE02/M0 content schema | `content/perspectives/` | setup output; FE07 AC-07.7–AC-07.8 | Blocked — reviewed Natural Earth inputs and complete perspective/pack schema are not supplied |
| 3 | M1-S2 — Reference screenshot set | FE06 implementation, M0 web scaffold | `apps/web/e2e/screenshots/` | FE06 AC-06.2; FE07 AC-07.4; FE08 AC-08.4 | Blocked — FE06 renderer is not available |
| 4 | FE06 — Globe and flat map | FE02, FE05 | `packages/globe/`, `packages/engine/geo/`, `packages/ui/`, `packages/app-shell/` | AC-06.1–AC-06.10 | Blocked — exact pinned versions for required Three.js, d3-geo and troika-three-text are absent; several referenced interface types are undefined |
| 5 | FE07 — Perspectives and borders | FE02, FE05, FE06 | `packages/domain/`, `packages/content/`, `packages/engine/`, `packages/globe/`, `tools/content-pipeline/` | AC-07.1–AC-07.9 | Blocked — FE06 plus perspective ContentView/pack contracts and reviewed source data are absent |
| 6 | FE08 — Living Atlas | FE06, FE07 (FE13 stand-in is specified for M1) | `packages/engine/atlas/`, `packages/globe/`, `packages/ui/`, `packages/app-shell/` | AC-08.1–AC-08.9 | Blocked — FE06/FE07 and the undefined LearnerState, AtlasSnapshot and ItemFacetKey contracts |
| 7 | FE09 — Map detail and zoom | FE02, FE06 | `packages/globe/`, `packages/content/`, `apps/web/`, `tools/content-pipeline/` | AC-09.1–AC-09.9 | Blocked — FE06 and the undefined DetailMesh/RegionChunkId and service-worker chunk contracts |

## Setup blockers from the start

No M1 task is blocked because it needs an account, legal review, a physical
device, or a human decision. Physical-device acceptance criteria are listed as
manual/skipped in the final report if implementation becomes available. The
current blockers are undefined M1 contracts, absent reviewed/source geometry
inputs, and unpinned required runtime dependencies; the M0 implementation and
reports are available in this worktree now.

## Root configuration

The M0 root configuration was staged by the orchestrator in the separate
`build(M1): stage M0 baseline` commit. The orchestrator remains the only editor
of `package.json`, the lockfile, `tsconfig`, and CI configuration. Any M1
runtime dependency requires an exact spec pin and will be a separate commit
and report entry.

## Worker protocol

Builders own only the packages/files listed for their task, do not edit root
configuration or dependencies, and end their report with one line per AC:
`AC ID → test passing / skipped (reason) / not done (reason)`.

## Usage-limit log

No usage-limit event recorded.
