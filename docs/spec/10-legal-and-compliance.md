# 10 — Legal and compliance

**Status:** v1.0. Working position, not legal advice. A paid UK and US review
is required before the first public release (D148, PK10). Decisions: D2, D87,
D89, D92, D93, D103, D141–D148, D177, D178, D180, D183.

## 1. Position
The app collects no personal data. Progress, settings and diagnostics stay on
the device (D92, D103). Personal data reaches the project only when a user
chooses to send it: feedback, content issues, diagnostics and tester logs
(FE24, FE30). Everyone is treated as under 18 (D93).

## 2. Controller and data held off the device
The controller is the project owner. Off-device data (D183):

| Data | How it arrives | Lawful basis | Retention |
|------|----------------|--------------|-----------|
| Feedback and diagnostics emails | User sends from their email app | Legitimate interests | Deleted once handled, ≤ 90 days |
| Content-issue emails | User sends from their email app | Legitimate interests | Issue text kept without the sender. Email ≤ 90 days |
| Tester logs | Share sheet, tester consent | Consent (D145) | ≤ 24 months. Deleted within 90 days of a request (D180) |
| Tester list | Recruitment | Consent | Programme end + 6 months |
| Pack host logs | Server | Legitimate interests | None, or truncated IPs ≤ 7 days |

The privacy policy page is static, with no cookies and no analytics (FE29).

## 3. UK law

| Law | What it means here |
|-----|--------------------|
| UK GDPR and DPA 2018, as amended by the Data (Use and Access) Act 2025 | The service is likely to be used by children, so design must take the "children's higher protection matters" into account. A complaints procedure is required (D144) |
| PECR | Only strictly necessary on-device storage. No cookies, no marketing |
| Children's Code | §4 |
| Online Safety Act 2023 | No user-to-user or search service in MVP. The class atlas needs a check first (D147) |
| ICO fee | Decide with the ICO self-assessment before the closed test (PK01) |

## 4. Children's Code

| Standard | How we meet it |
|----------|----------------|
| 1 Best interests | Calm design, no guilt or "done" messages (D69, D78) |
| 2 DPIA | Before the closed test (D143) |
| 3 Age-appropriate application | Everyone treated as under 18. No age question (D93) |
| 4 Transparency | Three-layer notice with a children's summary (D144). Privacy line on the start screen (FE22) |
| 5 Detrimental use | Time spent is never a goal (D149). No daily streak (D93). Reminders opt-in (D177) |
| 6 Policies | The app does what the notice says. CI audits enforce it (FE29) |
| 7 Default settings | Nothing to switch on for privacy. Reminders off. Tester features not in public builds |
| 8 Data minimisation | The app collects nothing. Drafts carry only listed fields (FE24, FE30) |
| 9 Data sharing | None. No third-party code (D103) |
| 10 Geolocation | None. No location permission (D178) |
| 11 Parental controls | None in MVP |
| 12 Profiling | On-device learning model only, needed for the core service, never leaves the device. Recorded in the DPIA |
| 13 Nudge techniques | Equal-prominence choices (AC-27.4). Auto-continue only after the DPIA (D73, PK05) |
| 14 Connected toys and devices | Not applicable |
| 15 Online tools | Your data: export, delete (FE23). Notice and contact in Credits and notices (FE24) |

## 5. United States (web only, D141)
- **COPPA:** the amended rule has applied in full since 22 April 2026. The app
  collects no personal information. Install IDs and event logs never leave
  the device. Emails are sent by the user.
  - Candidate approach for the review: answer a message from a child once,
    then delete it.
- **State privacy and age-appropriate design laws:** covered by the paid review (PK10).
- **US Android:** waits for Play Age Signals (PK09).

## 6. Google Play
- **Target ages** 9–12, 13–15, 16–17 and 18+ (D142), so the Families policy
  applies. No ads, no ad SDKs, no location.
- **Data safety:** per FE29. Opt in to the "Committed to follow the Play
  Families Policy" badge in the Data safety section.
- **Target API:** new apps and updates must target API 36. `targetSdk` 36 (D135).
  The requirement rises each year, so review it every year.
- **Closed test:** new personal accounts need 12 testers opted in for 14 days in a row (09 §7).
- **IARC** questionnaire answered and kept with the release record.
- **Permissions:** D178 only.
- **Availability:** UK only (D141).

## 7. Privacy notice (D144)
- **Layers:** children's 5-line summary, short summary, full text. en-GB and en-US.
- **Full text covers:**
  - Who we are and how to contact us.
  - What stays on the device.
  - What users can choose to send, and why.
  - Lawful bases and retention (§2).
  - Rights, the complaints procedure and the right to complain to the ICO.
  - Changes (FE24 item 3).
- Bundled in the app, on the static policy page and in the store listing.

## 8. Testers (D145, D180)
- Adults only, confirmed at recruitment. The app never asks for an age.
- The tester agreement covers:
  - Consent per data type.
  - The share-sheet-only donation.
  - The donation code.
  - Retention and deletion.
  - That they can stop at any time.
- Handling is set out in `docs/release/data-handling.md`.

## 9. Borders and names (D84–D86, D146)
- Borders follow the active perspective. The notice says inclusion doesn't imply endorsement.
- Disputed areas use neutral wording and show who controls and who claims them (FE19).
- Daily challenge and placement items are the same in every perspective (FE21, FE22).
- Markets without a reviewed perspective aren't offered (PK04).
- Reports go through FE24. Urgent fixes ship within 48 hours.

## 10. Licences (D87, D89)
- Allowlist only. Register in `content/licences.toml`. Credits are generated (FE24).
- No OpenStreetMap data in learning content.
- Non-commercial audio in internal builds only.
- Font under the OFL. Subsetting per its ADR.

## 11. Documents (`docs/legal/`)

| Document | Due |
|----------|-----|
| DPIA, including D73 and profiling | Before the closed test |
| Privacy notice, three layers, both locales | Before the closed test |
| Complaints procedure | Before the closed test |
| Tester agreement and consent text | Before the closed test |
| Legitimate interests assessment for emails | Before the closed test |
| ICO fee decision | Before the closed test |
| Record of processing | Before the closed test |
| Paid UK and US review | Before the first public release |
