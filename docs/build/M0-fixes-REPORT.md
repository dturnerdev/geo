# M0 fixes report

## Done

- Created the isolated `build/m0-fixes` branch and committed the T1–T3 plan.
- Added exact pinned Playwright and approved SQLite dependencies, allowlist and licence entries. Chromium-only installation is documented in CI.
- T1: made `AnswerRecorded.responseTimeMs` required and validated as a whole number ≥ 0 on append and import. FE04 reads the stored value directly; the 60 s cap is applied only during metric calculation. Added AC-01.14 and AC-03.7 coverage and updated fixtures. Kept schema version 1 because no app shipped and no real data exists.
- T2: replaced SQLite adapter stubs with real SQLite-backed stores. Web uses `@sqlite.org/sqlite-wasm` in a dedicated OPFS SAH-pool Worker; Android has a WAL Capacitor SQLite driver and app-shell factory. The `EventStore` interface is unchanged.
- T3: added real Chromium E2E coverage for AC-01.10 and AC-02.8, S19 lock takeover, a minimal M0 write harness, Vite WASM development handling and the CI E2E gate.
- Read-only review passed with no blocking findings.

## Blocked

- Android native execution and device/emulator E2E require the full Capacitor Android project and physical/emulated devices; the driver typechecks but was not device-run.
- Galaxy A07 4G performance checks remain unavailable.
- AC-02.3 lacks a signed update fixture that can be used without forbidden test-key or root-config changes.
- Existing M0 ADR, Android WorkManager, production bundle-inspection, reference-replay and hosted/device checks remain blocked by their required environments or decisions.

## Tests unskipped (AC IDs)

- AC-01.1 — shared storage suite now runs against real SQLite WASM-backed adapters.
- AC-01.5–AC-01.8, AC-01.11–AC-01.13 — existing automated coverage passes with the real storage path and updated fixtures.
- AC-01.14 — required response-time validation on schema, append and import; metric cap coverage included.
- AC-03.7 — exact FNV-1a hash32 vectors.
- AC-01.10 — Chromium second-tab lock takeover and sequential persistence.
- AC-02.8 — Chromium same-origin request and header audit.

## Still skipped (with reasons)

- AC-01.2 — the M0 web bootstrap has no answer-acceptance flow; Android process-kill coverage also needs its device harness.
- AC-01.3 and AC-01.4 — Galaxy A07 4G is unavailable.
- AC-02.1 — the M0 web bootstrap has no first-question screen yet.
- AC-02.3 — no permitted signed update fixture is available.
- AC-02.5 — Android network-condition and WorkManager instrumentation is unavailable.
- AC-03.1 Android part and AC-03.3 — Android replay and production bundle inspection are unavailable.
- AC-04.1, AC-04.9 and AC-04.10 — Android/reference performance and production-bundle environments are unavailable.
- AC-05.3 — Android replay is unavailable.
- AC-05.5 — the M0 screen set and pseudo-locale build are not present; axe-core is not authorised by the current AGENTS rules, and the manual Galaxy A07 4G pass remains outstanding.
- Existing Android, physical-device, hosted-CI-only and manual skips remain in place with their original reasons.

## Spec questions

- The pre-existing `docs/build/M0-REPORT.md` line 43 says response time was optional. The 2026-11-18 M0 answers authority supersedes that statement: `responseTimeMs` is required, AC-01.14 applies, and schema version 1 remains correct pre-release. The stale sentence should be updated in a future report refresh; the immutable spec was not changed here.
- Existing M0 questions remain for D116 distance-rounding increments, the interim FE04 calibration estimator, underspecified FE03 value-source/experiment registration details, FE02 rollback-key provisioning, and the D178/Android network-condition interaction.

## New dependencies (for the FE29 allowlist)

- `@playwright/test` `1.65.1` — dev dependency for desktop Chromium E2E.
- `@sqlite.org/sqlite-wasm` `3.54.1-build1` — web SQLite WASM persistence.
- `@capacitor-community/sqlite` `8.1.1` — Android native SQLite persistence.
- All three are exact-pinned, allowlisted and recorded in `docs/legal/licence-register.md`. No axe-core, analytics, advertising, crash-reporting or hosted service was added.

## Carry forward to M2

- Build the real question/answer UI and response-time measurement, including excluding time while the app is backgrounded. The stored field, validation and metric calculation are ready; no response-time measurement was added here.
- Complete first-question/offline browser flow and answer process-kill E2E once the M2 play flow exists.

## Final checks

| Command | Result |
|---|---|
| `pnpm lint` | Pass |
| `pnpm format:check` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm --filter @geo/android typecheck` | Pass |
| `pnpm test` | Pass — 138 passed, 16 skipped |
| `pnpm e2e` | Pass — 2 passed, 4 skipped with reasons |
| `pnpm build` | Pass |
| `pnpm gate:9` | Pass |
| `pnpm gates` | Pass — gates 1, 2, 7, 8, 9 and 11 |
| Read-only review | Pass — no blocking findings |
