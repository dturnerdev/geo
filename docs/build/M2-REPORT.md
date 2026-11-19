# M2 Report — Play

## Base commit

`origin/main` at run start: `bba5564f5238d67f4112299546597a4e79b7e90f`.

## Status

**Partially complete — safe M2 boundaries delivered; contract-dependent behaviour
is explicitly not done and must not be inferred.** FE10, FE11, FE12 and FE15
boundaries are committed. The full game, grading, audio asset/native, and M3
memory/simulation behaviours remain contract- or environment-dependent.

## Workers

- FE10 Builder `5d426b9e-d8dd-49a3-bdf8-51c6f19de3f6` — finished.
- FE11 Builder `e519b6c8-acaf-4fba-a7d2-256d6bc0ebcc` — cancelled after provider
  analysis loop; retry `136cd4dc-a0ad-4785-aff7-00751ac1e74a` — finished.
- FE12 Builder `243a06f4-deb1-482b-9795-ce7ca63031c2` — cancelled after provider
  analysis loop; retry `444618ec-9edd-410d-86a7-bc85b587d8b9` — finished after
  two repair rounds.
- FE15 Builder `ac3f927c-2727-4963-9797-7be75e5b21a9` — errored on the provider
  five-hour usage limit after writing the minimal boundary; orchestrator fixed
  only the compile/lint boundary issue.
- Reviewer `14e31ce6-5396-476e-b94f-ba45d23c2404` — independent read-only review
  PASS; one FE15 domain-type boundary issue was fixed in `494412e`.

## Done

- FE10 game/answer schemas, deterministic structural generation, catalogue and
  representative TOML entries.
- FE11 exact grading boundary with deterministic Show-me behaviour.
- FE12 safe Web Audio/Vibration boundary, haptic rate limiting, settings
  projection/events and caption model.
- FE15 exact session boundary with deterministic round identity and explicit
  M3-owned opaque types.
- No new runtime dependencies, network calls, Android permissions or root
  configuration changes.

## Blocked / carry forward

- Human-only haptic tuning/ADR: reference devices and approved Android
  touch-feedback verification unavailable.
- Human-only non-commercial placeholder audio: no approved licence-tagged assets.
- Full FE11 graders require Question target/name/geometry payloads absent from
  FE10; FE11 currently grades Show-me and conservatively marks other responses
  ungraded.
- Full FE15 slot selection, parking, fatigue and stand-in source integration
  require M3 LearnerState/Slot/memory contracts.
- FE18 simulation smoke setup is blocked because the simulation learner/memory
  contract is M3-owned.

## AC status and evidence

Each M2 AC appears exactly once.

### FE10

| AC | Status | Evidence |
|---|---|---|
| AC-10.1 | pass | `packages/content/src/game-catalogue.test.ts` — catalogue schema/primitive/grader/generator validation |
| AC-10.2 | pass | `packages/engine/src/game/generate.test.ts` — deterministic reference output |
| AC-10.3 | pass | `packages/engine/src/game/generate.test.ts` — hidden target-label property |
| AC-10.4 | not done | `packages/engine/src/game/generate.test.ts` todo — ContentView has no geometry/sector contract |
| AC-10.5 | skipped (manual/hosted) | `packages/ui/src/ac-10-external.test.ts` — Playwright/axe/screen-reader environment unavailable |
| AC-10.6 | pass | `packages/domain/src/answers.test.ts` — all 13 answer schemas |
| AC-10.7 | pass | `packages/content/src/game-catalogue.test.ts` and `packages/engine/src/game/generate.test.ts` — flag gating |
| AC-10.8 | pass | `packages/content/src/game-catalogue.test.ts` — added catalogue game eligible without engine edit |
| AC-10.9 | skipped (manual) | `packages/ui/src/ac-10-external.test.ts` — screenshot review unavailable |

### FE11

| AC | Status | Evidence |
|---|---|---|
| AC-11.1 | not done | `packages/engine/grading/index.test.ts` todo — no per-primitive golden target payloads |
| AC-11.2 | pass | `packages/engine/grading/index.test.ts` — Show-me property |
| AC-11.3 | not done | same test todo — AidId values are unspecified |
| AC-11.4 | not done | same test todo — accepted-name/typing fixtures absent |
| AC-11.5 | not done | same test todo — pipeline guard list absent |
| AC-11.6 | not done | same test todo — bearing target/beam absent from Question |
| AC-11.7 | pass | same test — no Easy without a speed baseline |
| AC-11.8 | not done | same test todo — FE06 tap-zone geometry not exposed |
| AC-11.9 | skipped (physical device) | same test — Galaxy A07 4G required |
| AC-11.10 | not done | same test todo — event/geometry recorder boundary absent |
| AC-11.11 | not done | same test todo — Slovenia/Slovakia fixtures absent |
| AC-11.12 | not done | same test todo — Niger/Nigeria guard fixtures absent |
| AC-11.13 | not done | same test todo — Côte d’Ivoire locale fixture absent |
| AC-11.14 | not done | same test todo — bearing geometry absent |
| AC-11.15 | not done | same test todo — Malta/France/Russia/city/Nile geometry absent |

### FE12

| AC | Status | Evidence |
|---|---|---|
| AC-12.1 | pass | `packages/audio/src/fe12.test.ts` — positive-only haptic mapping and compile-time type guard |
| AC-12.2 | pass | `packages/audio/src/fe12.test.ts` — 300 ms rate limit |
| AC-12.3 | pass | `packages/audio/src/fe12.test.ts`, `packages/ui/src/feedback.test.ts` — unsupported vibration hidden/no-op |
| AC-12.4 | skipped (hosted/merged-manifest) | `apps/android/src/ac-12-external.test.ts`; gate 11 source manifest tests pass |
| AC-12.5 | pass | `packages/app-shell/src/audio-settings.test.ts` — independent settings rebuild from projection |
| AC-12.6 | pass | `packages/audio/src/fe12.test.ts`, `packages/app-shell/src/audio-settings.test.ts` — music default off/A10 no-op |
| AC-12.7 | not done | `packages/ui/src/feedback.test.ts` unit caption model passes; mounted E2E voice screen/assets absent |
| AC-12.8 | skipped (hosted release CI) | `apps/android/src/ac-12-external.test.ts` — release bundle/licence gate unavailable |
| AC-12.9 | pass | `packages/audio/src/fe12.test.ts` — locked mixer does not play before unlock |
| AC-12.10 | skipped (manual physical device) | `apps/android/src/ac-12-external.test.ts` — reference devices and haptics ADR unavailable |

### FE15

| AC | Status | Evidence |
|---|---|---|
| AC-15.1 | pass | `packages/engine/src/session/index.test.ts` — identical deterministic round identity |
| AC-15.2 | not done | same test todo — Slot/load/mixing model is undefined/M3-owned |
| AC-15.3 | not done | same test todo — Slot/facet payload is undefined |
| AC-15.4 | not done | same test todo — Boss/outcome slot contract is undefined |
| AC-15.5 | not done | same test todo — FE14 priority/emphasis contract is undefined |
| AC-15.6 | not done | same test todo — no mounted app-shell round/E2E flow |
| AC-15.7 | not done | same test todo — UI string/screenshot surface absent |
| AC-15.8 | not done | same test todo — parking and unanswered-slot model is undefined |
| AC-15.9 | skipped (physical device) | same test — Galaxy A07 4G benchmark required |
| AC-15.10 | not done | same test todo — stand-in source replacement contract is not wired |
| AC-15.11 | not done | same test todo — FE18 simulation harness and learner model are M3-owned |

## Skipped tests with reasons

Allowed skips are limited to manual, physical-device, hosted CI/release, or
merged-manifest checks as identified in the AC tables above. Contract-dependent
automated criteria are labelled **not done** and represented by todo rows to
prevent invented semantics.

## Spec questions

- No separate merged Q1/Q2 M2 contract brief exists; full-repository `rg -U`
  found only the M1 contracts brief/report. No M2 contract was inferred.
- FE10 Behaviour requires a game name but `GameDefinition` omits it; name is
  retained only by `GameCatalogueEntry`.
- FE10 `Question` lacks target answer/name/geometry payloads required by FE11.
- FE11 `StoredGeometry`, `GradeReason`, `AidId` and speed baseline details are
  not fully shaped by the spec.
- FE10 `ContentView` exposes no coordinates/compass sectors or full lookalike
  metadata to the engine.
- FE12 `AudioError` has no fields; it remains opaque. Android haptics ADR and
  H03 native mapping remain unresolved.
- FE12 caption text source, AAC assets, loudness/ducking asset pipeline and
  release licence metadata are not supplied.
- FE15 `LearnerState`, `Slot`, `DueEntry`, `SessionSignals`, `EmphasisEntry`
  and full stand-in source semantics are M3-owned/undefined.

## New dependencies

None. Existing exact pins remain unchanged. No network calls were added.

## Review these

- Define the FE10 Question payload before attempting full FE11 grading.
- Land the M3 LearnerState/Slot/selection contracts before expanding FE15.
- Approve the haptics ADR and provide reference-device verification.
- Provide approved test audio and release licence/audit wiring.
- Add the mounted play UI/E2E flow and FE18 simulation harness in later milestones.

## Exact commit list

```text
b9eb27f build(M2): plan
8154a00 feat(FE10): add game framework and primitives
0ee25cd build(M2): update plan
0e2ee2d feat(FE11): add grading boundary
1ae2208 feat(FE12): add audio and haptics boundary
2254807 build(M2): update plan
6a5b031 feat(FE15): add session builder boundary
d042c55 build(M2): update plan
494412e fix(M2): review fixes
```

## Final checks

| Command | Result |
|---|---|
| `pnpm lint` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm test` | Pass — 248 passed, 54 skipped, 14 todo |
| `pnpm e2e` | Pass — 2 passed, 5 skipped |
| `pnpm build` | Pass |
| `pnpm format:check` | Pass |
| `git diff --check` | Pass |
| Independent read-only review | Pass; review fix committed as `494412e` |
