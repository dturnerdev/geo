# M0 Report — Foundations

## Done

- Repository scaffold, pnpm workspace, strict TypeScript, lint, formatting, Vitest and day-one CI gates.
- FE01 event store and persistence, including domain events, import/export, snapshots, wipe and adapters.
- FE02 signed content packs, validation, staging, update policy and rollback.
- FE03 feature flags, experiments, assignment, exposure and developer-panel model.
- FE04 local metrics, diagnostics and tester summaries.
- FE05 localisation, units, formatting and local-day handling.
- Final read-only review passed with no blocking findings.

## Blocked

- Android export/import file mechanism ADR: requires implementation/human decision.
- Ed25519 verification ADR: Safari 16.4 compatibility decision remains open.
- Haptics ADR: Android touch-feedback behaviour requires verification.
- Font subsetting ADR: OFL/legal review required.
- Android background-check ADR: WorkManager decision required.
- Real SQLite WASM/native persistence remains adapter-stubbed pending approved runtime dependencies and platform integration.
- Physical-device, Android emulator, Playwright/hosted CI and release-bundle checks remain unavailable locally.

## Skipped tests (with reasons)

- FE01 AC-01.2: Android/web process-kill E2E harness unavailable.
- FE01 AC-01.3 and AC-01.4: Galaxy A07 4G unavailable.
- FE01 AC-01.10: Playwright browser harness unavailable.
- FE02 AC-02.1 and AC-02.3: web/Android E2E runner unavailable.
- FE02 AC-02.5: Android device and WorkManager instrumentation unavailable.
- FE02 AC-02.8: hosted browser network audit unavailable.
- FE03 AC-03.1: Android device/runner unavailable.
- FE03 AC-03.3: production bundle inspection unavailable.
- FE04 AC-04.1: Android reference replay unavailable.
- FE04 AC-04.9: physical device and Worker host unavailable.
- FE04 AC-04.10: hosted production-bundle inspection unavailable.
- FE05 AC-05.3: Android replay unavailable.
- FE05 AC-05.5: Playwright runner and manual device accessibility pass unavailable.

## Spec questions

- FE01 Behaviour 10.4 says `ImportCompleted` is appended unconditionally, while AC-01.6 requires a duplicate import to add zero events and leave state unchanged; implementation appends it only when events are added.
- D116 does not define distance rounding increments; the implementation uses one decimal below 10 display units and whole units above.
- FE04 event schema has no specified response-time field; efficiency reads an optional `responseTimeMs` when present.
- FE04 calibration uses a deterministic interim recall estimator until FE13 memory model exists.
- FE03 does not define the `hash32` algorithm; FNV-1a 32-bit was selected and vectors documented.
- FE03 `ValueSource`, experiment-to-flag linkage and E04/E06/E07 registration details are underspecified; no unprovided variants were invented.
- FE02 `rollbackTo` semantics and production signing-key provisioning require clarification/release process.
- D178 permissions conflict with Android network-condition checks; native background scheduling is deferred with the WorkManager ADR.

## New dependencies (for the FE29 allowlist)

- `zod` 4.6.7, MIT — boundary validation for domain events, content packs and summaries. Added to `tools/ci/dependency-allowlist.json` and the licence register.
- No other runtime dependencies were added.

## Review these

- Replace relative cross-package imports with declared workspace dependencies as package wiring is completed, especially `@geo/engine` in app-shell and domain/engine dependencies.
- Approve the five blocked ADRs before platform integrations and release work.
- Regenerate and sign the bundled content pack with production key handling.
- Resolve the listed spec questions before relying on the affected behaviours in later milestones.

## Final checks

| Command | Result |
|---|---|
| `pnpm lint` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm test` | Pass — 131 passed, 15 skipped with reasons |
| `pnpm format:check` | Pass |
| `pnpm build` | Pass |
| `pnpm gates` | Pass — gates 1, 2, 7, 8, 9 and 11 |
| Read-only M0 review | Pass |
