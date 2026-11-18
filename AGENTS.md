# Agent rules

## Source of truth
- The spec in docs/ (README, numbered docs, 05-features/ milestone files,
  placeholders.md). If documents disagree, the feature file wins.
- Never change the spec. If it is wrong, unclear or contradicts itself, build
  nothing for that point and record it under Spec questions in the milestone report.
- Placeholder values come from placeholders.md and go in `engine/tuning.ts`
  or the config it names.

## Code
- Repo layout as in 07. No new top-level folders or packages without a spec reference.
- TypeScript strict. Interfaces exactly as in each feature's Interfaces block:
  same names, fields and signatures.
- Follow every import-boundary rule in the spec (for example, only
  `engine/memory/` imports `ts-fsrs`).
- Dependencies: exact pinned versions. Runtime dependencies only if the spec
  names them or a feature can't be built without one. No analytics, ads or
  crash-reporting SDKs. Every new runtime dependency goes in the report.
- Allowed runtime dependencies: `@sqlite.org/sqlite-wasm`, `@capacitor-community/sqlite`, exact pinned versions.
- No network calls except those the spec allows.
- British English in user-facing strings, comments and docs.

## Tests
- Every automated AC becomes a test whose name starts with its ID, e.g. `AC-01.3 …`.
- "(manual)" ACs and ACs that need physical devices (Redmi A5, Galaxy A07 4G),
  Play Console or hosted CI: write the test or script where possible, mark it
  skipped with the reason, and list it in the report.
- Playwright (`@playwright/test`) is allowed as a dev dependency for web E2E ACs. Android emulator and physical-device tests stay skipped with a reason.
- A task is done only when lint, typecheck and all tests pass locally.
- Never delete, skip or weaken a test to make it pass. Never change an AC test
  to fit the code.

## Git
- Work only in the worktree you are given. Never commit to main, force-push or merge.
- Builders don't commit. The orchestrator commits each task separately.
