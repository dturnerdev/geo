# M0 Build Plan

Source: `docs/spec/05-features/m0-foundations.md` and referenced architecture/quality specifications.

## Waves

| Wave | Task | Packages / paths | Depends on | ACs | Status |
|---|---|---|---|---|---|
| 0 | Repository scaffold, tooling and day-one CI gates | root config, `apps/`, `packages/`, `tools/`, CI | none | Setup: green build; gates 1, 2, 7, 8, 9, 11 | Ready |
| 0 | ADR: Android export/import file mechanism | `docs/adr/` | none | Setup ADR | Blocked — human/implementation decision required by spec |
| 0 | ADR: Ed25519 verification | `docs/adr/` | none | Setup ADR | Blocked — Safari 16.4 compatibility decision required |
| 0 | ADR: haptics implementation | `docs/adr/` | none | Setup ADR | Blocked — Android setting behaviour must be verified |
| 0 | ADR: font subsetting and OFL | `docs/adr/` | none | Setup ADR | Blocked — legal review required |
| 0 | ADR: Android background checks | `docs/adr/` | none | Setup ADR | Blocked — Android/WorkManager decision required |
| 1 | FE01 Event store and persistence | `packages/domain`, `packages/storage`, `packages/app-shell`, `apps/web`, `apps/android` | none | AC-01.1–AC-01.13 | Ready |
| 1 | FE05 Localisation, units and time | `packages/domain`, `packages/engine/time`, `packages/ui`, `packages/app-shell` | FE01 | AC-05.1–AC-05.8 | Ready |
| 1 | FE04 Local metrics and diagnostics | `packages/engine/metrics`, `packages/storage`, `packages/ui`, `packages/app-shell` | FE01 | AC-04.1–AC-04.11 | Ready |
| 2 | FE02 Content packs and updates | `packages/content`, `packages/app-shell`, `apps/web`, `apps/android` | FE01 | AC-02.1–AC-02.8 | Ready |
| 3 | FE03 Feature flags and experiments | `packages/domain`, `packages/engine`, `packages/content`, `packages/ui`, `packages/app-shell` | FE01, FE02 | AC-03.1–AC-03.6 | Ready |

## Notes

- No two tasks in a wave share a package; FE05 and FE04 are sequential because both touch packages used by FE01 and their package ownership overlaps.
- Device, hosted CI, manual accessibility and legal/account requirements are recorded as skipped or blocked in the final report rather than guessed.
- Workers must not edit root configuration or commit. The orchestrator runs checks and commits each completed task.
