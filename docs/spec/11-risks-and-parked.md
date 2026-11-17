# 11 — Risks and parked items

**Status:** v1.0. Reviewed at the end of each milestone and before each
public release. IDs are never reused.

## 1. Risk register

Likelihood and impact: L low, M medium, H high.

| ID | Risk | L | I | Mitigation |
|----|------|---|---|-----------|
| RK01 | FSRS-7 never reaches a maintained library or fails its checks | M | L | Stay on FSRS-6 behind `MemoryModel` (D59, PK08) |
| RK02 | Optimiser can't run on low-end Android | M | L | Population defaults (FE17 ADR) |
| RK03 | Browser storage cleared or evicted, especially Safari and private mode | M | H | Persistent storage request, export, S21 warning (FE01) |
| RK04 | Progress lost through a storage or schema bug | L | H | Append-only log, upgraders, fixtures, reference replay (gate 3) |
| RK05 | Globe too slow on the floor device | M | M | Detail levels, size budgets, Redmi A5 runs (09) |
| RK06 | Can't keep 12 testers opted in for 14 days | M | H | Recruit 20. Start early (FE30) |
| RK07 | Play rejects the app (Families policy, Data safety mismatch) | M | M | FE29 audits, release checklist |
| RK08 | Complaint about a border or name | M | H | Perspectives, notice, 48-hour fix, limited markets (D86, D146) |
| RK09 | Licence breach in data, audio or font | L | H | Register, allowlist, gate 9 |
| RK10 | Law or store rules change (COPPA, UK data law, target API) | H | M | Yearly review, paid review (PK10) |
| RK11 | Single maintainer, low budget (D8) | H | M | Readable code, full spec, ADRs, automation |
| RK12 | Learning engine miscalibrated | M | H | Simulation gates, calibration metric, tester logs (FE04, FE18) |
| RK13 | Accessibility audit fails late | M | M | axe-core from M1, manual passes each release (09 §6) |
| RK14 | Key dependency abandoned (`ts-fsrs`, sqlite-wasm, Capacitor, Three.js) | M | M | Interfaces and adapters, exact pins |
| RK15 | Pack signing key or Play upload key lost or leaked | L | H | Next key embedded, offline backup, Play App Signing |
| RK16 | Name conflict at launch | M | M | No public release under the working title (PK11) |
| RK17 | Donated log contains personal data despite redaction | L | H | Property tests, preview, per-type consent, retention (FE30) |

## 2. Parked items

| ID | Item | Revisit when | Ref |
|----|------|--------------|-----|
| PK01 | ICO data protection fee | Before the closed test | D144 |
| PK02 | Release cadence and staged rollout | After 3 public releases | D138 |
| PK03 | Flag lookalike approach | Post-MVP review with tester confusion data | D127, D132 |
| PK04 | More markets: Europe next. China, Russia and India after a perspective and legal review | After the UK and US launch | D86 |
| PK05 | Auto-continue as the public default | After the DPIA and E01 results | D73, D143 |
| PK06 | Opt-in summaries for all users | After the closed test | D104, D110, D151 |
| PK07 | Street detail (Protomaps, streamed, self-hosted) | Post-MVP | D25, D26, D122 |
| PK08 | FSRS-7 | Each candidate library release | D59 |
| PK09 | Play Age Signals and US Android | When usable for this app | D141 |
| PK10 | Paid UK and US privacy-law review | Required before the first public release | D148 |
| PK11 | Name and logo. "Travle Globe" can't be used | Before the closed test | 01, 06 |
| PK12 | 3D cross-section | Post-MVP | D154 |
