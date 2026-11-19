# M3 Report — Learning engine

## Base commit

`origin/main` at run start: `c43d8c59a05f2b970b3069e752ac8203984115a0`.

## Status

**Stopped before feature implementation under the greater-than-one-third
blocked rule.** No M3 feature was implemented. The plan and an explicit
`it.todo` AC ledger were committed; the required dependency pins and several
M3-owned contracts must be supplied before implementation can start.

## Done

- Confirmed `git merge-base HEAD origin/main` matched the fetched
  `origin/main` SHA.
- Created `docs/build/M3-plan.md` with setup tasks, ownership, dependency order,
  waves and AC IDs.
- Recorded all contract-blocked automated M3 ACs as `it.todo` tests without
  inventing feature semantics.
- Created the required 20-minute heartbeat, expiring after 12 hours.

## Blocked

- Root dependency task: the spec requires `ts-fsrs` v6 and
  `@open-spaced-repetition/binding-wasm32-wasip1`, but does not provide exact
  pinned versions and licences for either. They are not in the allowlist,
  licence register or lockfile. They were not added.
- FE13: exact FSRS dependency authorisation and adopted-parameter/replay
  contracts are missing.
- FE14: `LearnerState`, selection gates, pack prerequisite graph and related
  content contracts are missing.
- FE16: reviewed sourced Meet/mini-Meet/contrast content and FE14/FE15 card
  sequencing contracts are missing.
- FE17: exact binding authorisation, optimiser Worker lifecycle and Android
  device ADR evidence are missing.
- FE18: simulation learner, truth model, valid event-store, pack/profile and
  public-engine integration contracts are missing.
- Human-only setup work is blocked by unavailable tester logs, content review,
  Redmi A5 and Galaxy A07 4G verification, and hosted CI/release environments.

## AC status and evidence

Each M3 AC appears exactly once below. `not done` entries are deliberate todo
tests, not skips.

| AC | Status | Test path/name or evidence |
|---|---|---|
| AC-13.1 | not done | `packages/engine/src/memory/ac-13-todos.test.ts` — todo; exact authorised FSRS pin and MemoryModel contract missing |
| AC-13.2 | not done | `packages/engine/src/memory/ac-13-todos.test.ts` — todo; adopted-parameter contract missing |
| AC-13.3 | not done | `packages/engine/src/memory/ac-13-todos.test.ts` — todo; replay contract and authorised dependency missing |
| AC-13.4 | not done | `packages/engine/src/memory/ac-13-todos.test.ts` — todo; MemoryModel contract missing |
| AC-13.5 | not done | `packages/engine/src/memory/ac-13-todos.test.ts` — todo; replay/event projection contract missing |
| AC-13.6 | not done | `packages/engine/src/memory/ac-13-todos.test.ts` — todo; implementation and Galaxy A07 4G unavailable |
| AC-13.7 | pass | `tools/ci/src/check-boundaries.test.ts` — import-boundary rule covers both FSRS packages |
| AC-13.8 | not done | `packages/engine/src/memory/ac-13-todos.test.ts` — todo; FE18 and real memory model blocked |
| AC-13.9 | not done | `packages/engine/src/memory/ac-13-todos.test.ts` — todo; FE08/FE15 replacement contracts missing |
| AC-13.10 | not done | `packages/engine/src/memory/ac-13-todos.test.ts` — todo; adopted-model replay contract missing |
| AC-13.11 | not done | `packages/engine/src/memory/ac-13-todos.test.ts` — todo; FSRS-7 ADR and authorised pins missing |
| AC-14.1 | not done | `packages/engine/src/selection/ac-14-todos.test.ts` — todo; learner, view and graph contracts missing |
| AC-14.2 | not done | `packages/engine/src/selection/ac-14-todos.test.ts` — todo; authored graph and pipeline contract missing |
| AC-14.3 | not done | `packages/engine/src/selection/ac-14-todos.test.ts` — todo; learner and gate contracts missing |
| AC-14.4 | not done | `packages/engine/src/selection/ac-14-todos.test.ts` — todo; memory/selection integration missing |
| AC-14.5 | not done | `packages/engine/src/selection/ac-14-todos.test.ts` — todo; lookalike view contract missing |
| AC-14.6 | not done | `packages/engine/src/selection/ac-14-todos.test.ts` — todo; learner budget fields missing |
| AC-14.7 | not done | `packages/engine/src/selection/ac-14-todos.test.ts` — todo; FE18 and selection contracts missing |
| AC-14.8 | not done | `packages/engine/src/selection/ac-14-todos.test.ts` — todo; priority/emphasis contracts missing |
| AC-14.9 | not done | `packages/engine/src/selection/ac-14-todos.test.ts` — todo; emphasis contract missing |
| AC-14.10 | not done | `packages/engine/src/selection/ac-14-todos.test.ts` — todo; learner/event projection contracts missing |
| AC-14.11 | not done | `packages/engine/src/selection/ac-14-todos.test.ts` — todo; view and goal contracts missing |
| AC-14.12 | not done | `packages/engine/src/selection/ac-14-todos.test.ts` — todo; UI budget contract missing |
| AC-14.13 | not done | `packages/engine/src/selection/ac-14-todos.test.ts` — todo; pause-flow contract missing |
| AC-14.14 | not done | `packages/engine/src/selection/ac-14-todos.test.ts` — todo; selection/content contracts missing |
| AC-14.15 | not done | `packages/engine/src/selection/ac-14-todos.test.ts` — todo; learner pause-state contract missing |
| AC-14.16 | not done | `packages/engine/src/selection/ac-14-todos.test.ts` — todo; authored start-sequence contract missing |
| AC-16.1 | not done | `packages/engine/src/meet/ac-16-todos.test.ts` — todo; card and authored pack contracts missing |
| AC-16.2 | not done | `packages/engine/src/meet/ac-16-todos.test.ts` — todo; mounted UI and pause-flow contracts missing |
| AC-16.3 | not done | `packages/engine/src/meet/ac-16-todos.test.ts` — todo; FE15 card-slot contract missing |
| AC-16.4 | not done | `packages/engine/src/meet/ac-16-todos.test.ts` — todo; contrast data and UI contract missing |
| AC-16.5 | not done | `packages/engine/src/meet/ac-16-todos.test.ts` — todo; content schema and reviewed data missing |
| AC-16.6 | not done | `packages/engine/src/meet/ac-16-todos.test.ts` — todo; history and event projection contracts missing |
| AC-16.7 | not done | `packages/engine/src/meet/ac-16-todos.test.ts` — todo; card UI and hosted accessibility check missing |
| AC-16.8 | not done | `packages/engine/src/meet/ac-16-todos.test.ts` — todo; history and question contracts missing |
| AC-16.9 | not done | `packages/engine/src/meet/ac-16-todos.test.ts` — todo; lookalike and sequencing contracts missing |
| AC-17.1 | not done | `packages/engine/src/memory/ac-17-todos.test.ts` — todo; trigger and binding contracts missing |
| AC-17.2 | not done | `packages/engine/src/memory/ac-17-todos.test.ts` — todo; optimiser result/adoption contracts missing |
| AC-17.3 | not done | `packages/engine/src/memory/ac-17-todos.test.ts` — todo; pause-flow contract missing |
| AC-17.4 | not done | `packages/engine/src/memory/ac-17-todos.test.ts` — todo; replay and binding pin missing |
| AC-17.5 | not done | `packages/engine/src/memory/ac-17-todos.test.ts` — todo; implementation and Galaxy A07 4G unavailable |
| AC-17.6 | not done | `packages/engine/src/memory/ac-17-todos.test.ts` — todo; binding pin and optimiser bundle missing |
| AC-17.7 | not done | `packages/engine/src/memory/ac-17-todos.test.ts` — todo; pack-default and Optimiser contracts missing |
| AC-17.8 | not done | `packages/engine/src/memory/ac-17-todos.test.ts` — todo; Worker lifecycle and shell contracts missing |
| AC-18.1 | not done | `tools/sim-harness/ac-18-todos.test.ts` — todo; simulation and event-store contracts missing |
| AC-18.2 | not done | `tools/sim-harness/ac-18-todos.test.ts` — todo; FE18 harness contract missing |
| AC-18.3 | not done | `tools/sim-harness/ac-18-todos.test.ts` — todo; harness and CI timing unavailable |
| AC-18.4 | not done | `tools/sim-harness/ac-18-todos.test.ts` — todo; invariant and CI contracts missing |
| AC-18.5 | not done | `tools/sim-harness/ac-18-todos.test.ts` — todo; truth-model configuration missing |
| AC-18.6 | not done | `tools/sim-harness/ac-18-todos.test.ts` — todo; simulated event-store contract missing |
| AC-18.7 | not done | `tools/sim-harness/ac-18-todos.test.ts` — todo; sweep filesystem boundary missing |
| AC-18.8 | not done | `tools/sim-harness/ac-18-todos.test.ts` — todo; replay and profile contracts missing |
| AC-18.9 | not done | `tools/sim-harness/ac-18-todos.test.ts` — todo; report and real-metric contracts missing |
| AC-18.10 | not done | `tools/sim-harness/ac-18-todos.test.ts` — todo; population-share contracts missing |

## Skipped tests with reasons

No M3 AC was skipped. Contract-blocked automated checks remain `it.todo`; no
physical-device or hosted-only check was falsely marked as passed.

## Spec questions

The whole repository was searched with `rg -U` before treating these as
missing or unauthorised. Relevant results were:

- `docs/spec/05-features/m3-learning-engine.md:33`: “`ts-fsrs` v6, exact
  pinned version.” No exact version or licence follows.
- `docs/spec/07-architecture-and-standards.md:27`: “Memory model:
  `ts-fsrs`. Optimiser: `@open-spaced-repetition/binding-wasm32-wasip1`”. No
  versions or licences follow.
- `docs/changes/2026-11-18-m1-contracts-brief.md:54`: “`LearnerState` |
  Only used (no definition found)”, and the brief says it is M3-owned.
- `docs/spec/05-features/m3-learning-engine.md:429`: the binding is required
  in a dedicated Worker, but no exact release is specified.
- `AGENTS.md:20` lists the allowed runtime dependencies; neither required M3
  memory package appears in the list.
- `docs/spec/07-architecture-and-standards.md:44-46` requires a PR allowlist
  entry and says new runtime dependencies must not be inferred.

The M1 contracts report path named in the orchestration brief does not exist;
the available merged contracts brief was read in full. No replacement report
was inferred.

## New dependencies and lookup record

- No dependency, package manifest, lockfile, allowlist or licence-register
  change was made.
- `npm view ts-fsrs@6 version license dist-tags --json` returned version
  `6.0.0`, licence `MIT`, latest `6.0.0`. Not added because the governing spec
  does not authorise this exact pin/licence entry.
- `npm view @open-spaced-repetition/binding-wasm32-wasip1 version license dist-tags --json`
  returned version `0.6.1`, licence `MIT`, latest `0.6.1`. Not added for the
  same reason.

## Carry forward

1. Amend the governing spec/allowlist with exact, human-approved versions and
   licences for both M3 runtime dependencies.
2. Supply the exact M3 `LearnerState`, `MemoryParams`, `LearnerHistory`,
   `ContentView` extensions, slot/card sequencing and simulation contracts.
3. Complete the human-only FSRS-7 and Android optimiser ADRs with tester-log,
   FE18, Redmi A5 and Galaxy A07 4G evidence.
4. Provide reviewed authored M3 content and population tuning data.

## Review these

- Human review of the dependency pins, licences and import-boundary ownership.
- Human review of the missing learner/selection/simulation contracts before any
  Builder is launched.
- Existing M1/M2 todo ledgers after the M3 contracts land.
- The plan's package ownership and wave grouping when the blockers are cleared.

## Worker and reviewer record

- Builders: none launched; all feature tasks were blocked before dispatch.
- Reviewer: not launched because no eligible implementation exists.
- Heartbeat: `9c00e6f3`, exact prompt required by the orchestration brief,
  active until deleted at shutdown.

## Exact commit list

The exact `git log --oneline --reverse origin/main..HEAD` before this report
commit is:

```text
d66c1de build(M3): plan
4f0b06d test(M3): record blocked ACs
```

## Final checks

| Command | Result |
|---|---|
| `pnpm lint` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm test` | Pass — 248 passed, 32 skipped, 89 todo |
| `pnpm format:check` | Pass |
| `pnpm e2e` | Pass — 2 passed, 5 skipped |
| `pnpm build` | Pass |
| `git diff --check` | Pass |
