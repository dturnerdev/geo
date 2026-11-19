# M3 Build Plan — Learning engine

## Baseline

- Worktree: `/home/itachi/.paseo/worktrees/08s35p9b/build-m3`
- Branch: `build/m3`
- Base: `origin/main` at `c43d8c59a05f2b970b3069e752ac8203984115a0`
- `git merge-base HEAD origin/main`: `c43d8c59a05f2b970b3069e752ac8203984115a0`
- Scope: FE13, FE14, FE16, FE17 and FE18 only.

## Stop condition and status

**Stopped before implementation.** More than one third of the five M3 features
are blocked by missing contracts and/or unauthorised dependency pins. FE13 and
FE17 cannot use their required runtime packages under the current allowlist;
FE14 relies on the undefined M3 `LearnerState` contract; FE16 relies on the
missing FE14/content card contracts; and FE18 relies on undefined learner,
memory, pack and engine integration contracts. No worker is launched and no
feature semantics are guessed.

## Dependency and contract findings

1. The feature spec requires `ts-fsrs` v6, but neither `docs/spec/` nor
   `AGENTS.md` states an exact pinned version or licence. `rg -U` found only
   the package name, `v6`, and the import-boundary rule. `npm view` on 2026-11-19
   reports `ts-fsrs@6.0.0`, MIT, but this lookup does not authorise adding it.
2. The feature spec requires `@open-spaced-repetition/binding-wasm32-wasip1`
   but gives no exact version or licence, and it is absent from the allowlist,
   lockfile and licence register. `npm view` on 2026-11-19 reports `0.6.1`,
   MIT, but this lookup does not authorise adding it.
3. The M1 contracts brief records `LearnerState` as used but not defined and
   explicitly says it is M3-owned; no exact learner-state contract is supplied
   for the FE14, FE17 or FE18 interfaces.
4. FE18 requires production engine integration, event-store-valid simulated
   events, truth-model configuration and pack/profile contracts that are not
   available as implementable code contracts.

## Setup tasks

| Task | Output | Status/reason |
|---|---|---|
| Root dependency/allowlist task for `ts-fsrs` v6 and the WASI binding | Exact root pins, lockfile, allowlist and licence entries | **Blocked from start** — governing spec lacks exact version/licence for both packages; no dependency may be added by inference. |
| ADR: FSRS-7 switch checks | ADR comparing tester logs and FE18 simulation metrics | **Blocked from start (human/data)** — tester logs, FE18 harness and human acceptance are unavailable; no results can be fabricated. |
| ADR: optimiser on Android | ADR for Redmi A5 Capacitor WebView Worker or population-default fallback | **Blocked from start (human/device)** — requires Redmi A5 memory/time verification and Android Worker execution. |
| Population defaults | `content/tuning/memory.toml` | **Blocked from start** — fitting requires the blocked FE17 binding and FE18 simulation; no tuned values may be invented. |
| M3 content pack authoring | Start sequence, prerequisite graph, fame tiers, families, lookalikes, sourced Meet data, mini-Meets and goals | **Blocked from start (human/content)** — authored/reviewed source data and the undefined ContentView/content contracts are not supplied. |
| FE04 metric completion | Real-model metrics in `engine/metrics/` | **Blocked from start** — depends on the blocked FE13 memory/replay contract. |
| Replace FE08/FE15 stand-ins | Real predictor/review source and AC-08.9/AC-15.10 type coverage | **Blocked from start** — depends on missing FE13/FE14 learner and pause-flow contracts. |

## Feature waves and ownership

No wave is launched because the stop condition applies. The dependency order
below is the intended execution order if the missing contracts and dependency
authorisation are supplied. No two tasks in a wave share a package.

| Wave | Task | Package/path ownership | Depends on | AC IDs | Status |
|---:|---|---|---|---|---|
| 1 | FE13 Memory model and scheduler | `packages/engine/src/memory/`, `packages/domain/`, `packages/app-shell/`, FE13 tests | FE01, FE11, FE15; exact FSRS dependency and learner/event contracts | AC-13.1–AC-13.11 | **Blocked** — unauthorised exact dependency contract; FE13 interfaces depend on missing adopted-parameter/event shapes. |
| 2 | FE14 Item selection, unlocking and emphasis | `packages/engine/src/selection/`, `packages/domain/`, `packages/content/`, `tools/content-pipeline/`, `packages/ui/`, FE14 tests | FE07, FE13, FE15; `LearnerState`, `ContentView`, pack graph and slot contracts | AC-14.1–AC-14.16 | **Blocked** — `LearnerState` and related selection/content contracts are undefined. |
| 3 | FE17 Parameter optimiser | `packages/engine/src/memory/`, `packages/app-shell/`, `apps/web/`, `apps/android/`, `packages/ui/`, FE17 tests | FE01, FE13; exact binding dependency and Worker/platform contracts | AC-17.1–AC-17.8 | **Blocked** — unauthorised binding pin/licence and human Android ADR/device evidence. |
| 4 | FE16 Meet and contrast cards | `packages/engine/`, `packages/ui/`, `packages/globe/`, `packages/audio/`, `packages/content/`, FE16 tests | FE06, FE12, FE14; authored sourced card and contrast contracts | AC-16.1–AC-16.9 | **Blocked** — FE14/content contracts and reviewed authored pack data are unavailable. |
| 5 | FE18 Simulation harness | `tools/sim-harness/`, CI, FE18 tests | FE01, FE04, FE11, FE13, FE14, FE15; all real public engine contracts | AC-18.1–AC-18.10 | **Blocked** — learner/truth/pack/event and production-engine contracts are missing. |

## Worker waves

- Workers launched: none (all implementation tasks are contract/dependency
  blocked; the greater-than-one-third stop rule applies).
- Builder concurrency reserved: at most two, only after unblock.
- Reviewer: not launched because no eligible implementation exists.

## AC ledger policy

All automated M3 ACs remain **not done**, not skipped. Contract-blocked ACs
must be represented by `it.todo` tests when the governing contracts are
authorised and supplied. Device, hosted CI, manual and release checks may be
represented as skipped tests only in a later eligible build with their exact
reason.
