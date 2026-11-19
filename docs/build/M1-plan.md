# M1 Build Plan — Map

Base: `origin/main` at run start `2b60b519ce5fe5299afa58811ef40a83a56b0a85`.

Tasks are ordered so a task joins a wave only after its dependencies are done.
No two tasks in one wave share a package. Builders may edit only the packages
and tests listed for their task; the orchestrator owns root configuration,
dependency pins, the plan and the report.

| Wave | Task / feature | Packages and paths owned | Depends on | AC IDs | Status |
|---:|---|---|---|---|---|
| 0 | M1 runtime dependency setup | `packages/engine/package.json`, `packages/globe/package.json`, lockfile | M0 | FE06/FE09 runtime pins | Done — `98648e5` |
| 0 | ADR: label collision and priority | `docs/adr/0001-label-collision-and-priority.md` | human ADR review | setup ADR | Blocked from start — ADR is Proposed and only a human may approve it |
| 0 | ADR: per-feature state texture | `docs/adr/0002-per-feature-state-texture.md` | human ADR review | setup ADR | Blocked from start — ADR is Proposed and only a human may approve it |
| 0 | Reference screenshot set for CI gate 6 | `apps/web/e2e/screenshots/` | reference devices / hosted gate 6 | AC-06.2, AC-07.4 | Blocked from start — reference-device and hosted screenshot approval are unavailable locally |
| 0 | Perspective files: `uk`, `us`, `default` | `content/perspectives/` | FE07 contracts; human-reviewed sources | AC-07.8 | Blocked from start — the merged contracts report leaves status vocabulary, locale fallback, disputed treatment and removal rendering open |
| 1 | Geometry pipeline outputs and pack schemas (M1 setup) | `packages/content`, `tools/content-pipeline`, `content/sources` and tests | M0, M1 contracts | AC-09.5, AC-09.6; geometry contract coverage | Done — `9cef745` |
| 1 | FE06 Globe and flat map | `packages/globe`, `packages/engine/src/geo`, `packages/ui`, `packages/app-shell` and tests | FE02, FE05, geometry contracts | AC-06.1–AC-06.10 | Done — `6d6ca8f` |
| 2 | FE07 Perspectives and borders | `packages/domain`, `packages/content`, `packages/engine`, `packages/globe`, `tools/content-pipeline` and tests | FE02, FE05, FE06; reviewed perspective data | AC-07.1–AC-07.9 | Done — `bce9900` (gate-9 registration `e860fc9`) |
| 3 | FE09 Map detail and zoom | `packages/globe`, `packages/content`, `apps/web`, `tools/content-pipeline` and tests | FE02, FE06, geometry outputs | AC-09.1–AC-09.9 | Not started |
| 4 | FE08 Living Atlas | `packages/engine/src/atlas`, `packages/globe`, `packages/ui`, `packages/app-shell` and tests | FE06, FE07, M3 `LearnerState` contract | AC-08.1–AC-08.9 | Blocked from start — `LearnerState` is M3-owned and remains undefined; implementing the exact FE08 signature would require guessing |

## Spec questions carried into the report

The merged M1 contracts report records four unresolved FE07 choices: the
learner-visible perspective status vocabulary and future perspective set,
missing-locale fallback, disputed-area content/treatment, and geometry/removal
rendering when an item leaves a perspective. FE08 also depends on the undefined
M3-owned `LearnerState`. No implementation or authored learner-visible data will
invent these points.
