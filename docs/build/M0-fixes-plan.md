# M0 fixes plan

| Task | Packages and areas | Acceptance criteria affected | Status |
|---|---|---|---|
| T1 · response time and hash32 tests | `packages/domain`, `packages/engine`, `packages/app-shell` and their fixtures/tests | AC-01.14, AC-03.1, AC-03.7, FE04 metric coverage | Green — lint/typecheck/unit/build pass; E2E deferred to T3 |
| T2 · real SQLite persistence | `packages/storage`, `apps/web`, `apps/android` and platform wiring | AC-01.1, AC-01.2, AC-01.5–AC-01.8, AC-01.10, AC-01.12–AC-01.13 | Planned |
| T3 · Playwright E2E | `apps/web/e2e`, Playwright config, root scripts and CI | AC-01.2, AC-01.10, AC-02.1, AC-02.3, AC-02.8, AC-05.5 | Planned |
