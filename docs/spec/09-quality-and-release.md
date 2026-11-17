# 09 — Quality and release

**Status:** v1.0. Decisions: D11, D14, D124, D131, D135–D140, D143, D146.
Release behaviour: FE31. Store and privacy checks: FE29.

## 1. Devices (D136)

| Device | Role |
|--------|------|
| Galaxy A07 4G | Reference. All performance budgets are measured here |
| Redmi A5 | Floor. Everything works; budgets × 1.5 (placeholder) |
| Pixel 9 Pro | High end, latest Android |
| Any Android 10 phone | Minimum OS (API 29). Reminders without a runtime permission prompt |
| Low-cost Android tablet | Layout, landscape |
| Web | Chrome on Windows and Android, Firefox ESR, Safari on macOS and iOS (minimum 16.4) |

- Minimum browser versions are fixed at launch by ADR (D14). Safari 16.4 is fixed (D136).
- Support is decided by feature detection, never the user agent: WebGL2,
  OPFS sync access handles, Web Locks, Workers and WASM. A browser missing any
  of them gets S20.

## 2. Support policy (D11, D14, D137)
- The event log stays readable for ever. Every historic payload version keeps a fixture (FE01).
- Packs are served for 5 years per app data-format version.
- A device is supported while its WebView gets updates, plus 12 months.
- Raising a minimum version needs a written reason and a D entry.

## 3. CI gates

| Gate | Checks | Day one |
|------|--------|---------|
| 1 | Type check | Yes |
| 2 | Lint, format, import boundaries (07 §4), string lint, locale keys (AC-05.4) | Yes |
| 3 | Reference replay: golden logs give identical projections on Chromium, WebKit, Firefox and Android | No |
| 4 | Simulation harness: invariants, calibration, durable target (FE18) | No |
| 5 | E2E on web and Android emulator, with the network audit (AC-29.1) | No |
| 6 | Reference screenshots, axe-core, colour-blind simulations, 200% text | No |
| 7 | Unit and property tests. AC coverage: every AC has a test or a checklist row. Spec references: every D, FE, AC, PK, RK, E, S and H ID cited in `docs/spec/` exists where it's defined, and no AC is numbered "x" | Yes |
| 8 | Size budgets (D106, D131) and bundle inspection (AC-03.3, AC-17.6) | Yes |
| 9 | Supply chain: dependency allowlist, exact pins, licence register, no non-commercial audio in release (D87, D89, D107) | Yes |
| 10 | Content pipeline checks (04 §6) and pack signing | No |
| 11 | Merged Android manifest: D178 permissions, backup flags (AC-01.11), SDK levels (AC-29.6) | Yes |

Gates that aren't live yet pass as stubs until their feature lands (M0).
Nothing merges with a red gate.

## 4. Test types

| Type | Tool | Runs |
|------|------|------|
| Unit | Vitest (ADR) | Every PR |
| Property | fast-check (ADR) | Every PR, fixed seed. Nightly with random seeds |
| Reference replay | Golden logs in `tools/ci/` | Every PR |
| Simulation | `tools/sim-harness/` | Smoke test every PR. Full run nightly |
| E2E web | Playwright | Every PR |
| E2E Android | Emulator, driver by ADR | Every PR to main |
| Performance | Reference and floor devices | Before each release |
| Manual | Release checklist | Before each closed and public release |

## 5. Performance budgets (on the Galaxy A07 4G)

| Measure | Budget | Source |
|---------|--------|--------|
| Cold start to interactive start screen | < 3 s | AC-22.1 |
| Restore from 10,000 events | < 2 s | AC-01.3 |
| `append` of one answer | p95 < 20 ms | AC-01.4 |
| Full memory replay, 10,000 answers | < 1 s, off the main thread | AC-13.6 |
| Metrics, 10,000 events | < 1 s, off the main thread | AC-04.9 |
| Progress view, 10,000 answers | < 300 ms | AC-28.5 |
| `grade` | p95 < 5 ms | FE11 |
| Frame rate while the optimiser runs | ≥ 30 fps | AC-17.5 |
| Web first load | ≤ 3 MB | AC-09.1 |
| Android package | ≤ 40 MB | AC-09.2 |
| History growth | 6–25 MB per year | D106 |

## 6. Accessibility testing (D124, D140)
- **Automated (gate 6):** axe-core on every screen in both themes and high
  contrast, colour-blind simulations, 200% text, pseudo-locale.
- **Manual, before each closed and public release:**
  - TalkBack on the Galaxy A07 4G, Android Switch Access.
  - VoiceOver with Safari on iOS and macOS. NVDA with Firefox.
  - Keyboard only on web. Reduce motion on.
- **External WCAG 2.2 AA audit** before the first public release (D140), and
  again after any milestone that adds screens. Blocking findings are fixed before release.

## 7. Build channels and releases

| Channel | Play track | Web | Extras |
|---------|-----------|-----|--------|
| `internal` | Internal testing | Unlisted preview deploy, `noindex` | Developer panel, experiments, non-commercial test audio (D89) |
| `closed` | Closed testing | Unlisted deploy, `noindex` | Experiments, log donation, "Share a summary" |
| `public` | Production | Main site | Variant A only. No tester features |

- **Streams (D138):** content packs at any time; app about every 4 weeks.
  Staged rollout and the update rules are in FE31.
- **Versions:** semantic app version. Android `versionCode` only ever goes up.
- **First production release:**
  - A new personal Play account needs 12 testers opted in for 14 days in a row.
    Recruit 20 (FE30).
  - DPIA signed off (D143), external audit done (D140), legal review done (D148).
- **Fixes:** app fixes ship as a new version. Content fixes ship as a pack, urgent ones within 48 hours (D146).

## 8. Bug severity

| Severity | Examples | Response |
|----------|----------|----------|
| S1 | Lost progress, data leaving the device unexpectedly, wrong or offensive border or name, crash at launch | Halt rollout. Fix at once. Content fixes within 48 h |
| S2 | Feature broken, accessibility blocker, wrong grading | Next release, or a hotfix if widespread |
| S3 | Cosmetic or minor | Backlog |

## 9. Release checklist
`docs/release/checklist.md`, completed and stored for every closed and
public release (FE31). It holds every "(manual)" AC, the manual accessibility
pass, the device runs, the store declaration check (AC-29.5) and the
sign-offs above.
