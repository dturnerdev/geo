# M2 Build Plan — Play

## Base and rules

Base: `origin/main` at run start `bba5564f5238d67f4112299546597a4e79b7e90f`.

This plan is dependency ordered. A task joins a wave only after its dependencies
are complete. No two tasks in one wave share a package. Builders edit only the
packages and tests listed for their task; the orchestrator owns root
configuration, dependency pins, this plan and the report. No new runtime
dependency is planned: the FE12 Android haptics ADR is unresolved and the
existing platform boundary will be used until that human decision is made.

## Tasks

| Wave | Task / feature | Packages and paths owned | Depends on | AC IDs | Status |
|---:|---|---|---|---|---|
| 0 | Haptic patterns tuned on reference devices and ADR note | `packages/engine/src/tuning.ts`, `docs/adr/`, reference-device notes | Human device verification and ADR approval | FE12 setup | **Blocked from start — Galaxy A07 4G, Redmi A5 and approved Android touch-feedback verification are unavailable locally; agents must not invent tuned values or approve the ADR.** |
| 0 | Licence-tagged placeholder test sound set | `content/audio/test/`, audio licence metadata | Human licence review and internal-build asset approval | FE12 setup | **Blocked from start — no approved non-commercial audio files/licence records are supplied; agents must not invent provenance or ship unlicensed audio.** |
| 1 | FE10 game framework, primitives, question generation and MVP catalogue | `packages/domain`, `packages/engine` (game/primitives), `packages/content` (game schemas/catalogue), `packages/globe` (primitive render contracts), `packages/ui` (primitive component contracts), tests in those packages | FE06, FE07; M1 contracts on `ContentView`, `LngLat`, `FeatureFlagId` | AC-10.1–AC-10.9 | Not started |
| 2 | FE11 deterministic grading and geometry | `packages/domain`, `packages/engine` (`grading/`, `geo/`), tests in those packages | FE10; FE06 geometry | AC-11.1–AC-11.15 | Not started |
| 2 | FE12 audio mixer, captions and haptics boundary | `packages/audio`, `packages/ui`, `packages/app-shell`, `apps/android`, tests in those packages | FE02, FE05; FE10 package separation; unresolved Android haptics ADR limits device-specific verification | AC-12.1–AC-12.10 | Not started |
| 3 | FE15 round builder and M2 stand-in sources | `packages/engine/src/session`, `packages/engine/src/stand-ins`, `packages/app-shell`, `packages/ui`, tests in those packages | FE10, FE11; M2 stand-ins; no M3 scheduler implementation | AC-15.1–AC-15.11 | Not started |
| 4 | M2 simulation harness smoke report | `tools/sim-harness`, tests and report output | FE15; no invented M3 memory model | AC-15.11 and M2 setup | Not started |

## Spec questions carried into the report

1. A full-repository `rg -U` search found `docs/changes/2026-11-18-m1-contracts-brief.md`
   and `docs/changes/2026-11-18-m1-contracts.md`, but no separate merged Q1/Q2
   contract briefs for M2. No M2 contract is inferred from that absence.
2. `LearnerState` is used by FE15 but remains undefined in the spec and code.
   The M1 contracts brief explicitly records it as M3-owned. FE15 may only use
   an opaque stand-in boundary and must not invent learner-state fields; any
   AC requiring the missing shape or M3 semantics is recorded as not done.
3. The FE10 interfaces use names including `GameId`, `FacetId`, `AssetKind`,
   `GraderId`, `GeneratorId`, `Question`, `GenerateError`, `StoredGeometry`,
   `GradeReason`, `SpeedBaseline`, `AidId`, `DueEntry`, `Slot`, and
   `SessionSignals` whose definitions are not present in the searched M2
   contracts. Builders must search with `rg -U` before treating one as absent;
   no learner-visible or scheduler semantics may be invented.

## Status legend

- **Not started:** eligible but not launched.
- **Blocked from start:** human-only prerequisite unavailable; never launch.
- **Blocked:** launched task failed after the permitted repair rounds or an
  unresolved contract prevents exact implementation.
- **Done:** implementation, AC evidence and required checks are green.
