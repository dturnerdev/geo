# M0 answers report (2026-11-18)

## Applied
- **S1 Response time on `AnswerRecorded`:** Added `responseTimeMs` to the `AnswerRecorded` field list in FE01 item 2 and added the **Response time** behaviour bullet (whole milliseconds from question fully shown/accepts input to submission; background time excluded; required on every `AnswerRecorded`; stored as measured, never capped; metrics caps such as FE04's 60 s apply only at computation). Added **AC-01.14** in FE01. In FE04 active practice time, added ``(`AnswerRecorded.responseTimeMs`)`` after "per-answer response times" (no other FE04 changes). FE11, FE15 and FE18 were not edited (see **Review these**).
- **S2 `ImportCompleted` (FE01):** FE01 item 10.4 now states `ImportCompleted` is appended only when at least one event is added; a duplicate import adds no events at all. **AC-01.6** was not edited and agrees ("second import adds 0 events; state unchanged").
- **S3 `hash32` (FE03):** Added a **Hashing** bullet in FE03: `hash32` is FNV-1a 32-bit over the UTF-8 bytes of the input string, returned as an unsigned 32-bit integer, with test vectors `""` → `0x811c9dc5`, `"a"` → `0xe40c292c`, `"foobar"` → `0xbf9cf968`. Input string rule copied as in code/spec formula: `installId + ':' + experimentId + ':' + version`. Added **AC-03.7**. Code/test vectors match the specified vectors (code also includes additional vectors); FE03 was updated accordingly.
- **S4 Distance rounding (D116):** Updated D116 in `docs/spec/decisions.md` to use the code's rule from `docs/build/M0-REPORT.md`: "Displayed distances use one decimal place below 10 display units and whole units above" (not "at 10 and above").
- **S5 Experiment rows E02 and E05 (FE27):** `docs/spec/08-experiments-and-metrics.md` does not define E02 or E05. In `docs/spec/05-features/m5-optional.md` the E02/E05 rows already state "Not used. Withdrawn before definition. ID never reused (08 §5)" (not `` `08` not written ``), so rows were left unchanged.
- **S6 `AGENTS.md`:** Added under **Code**: allowed runtime dependencies `@sqlite.org/sqlite-wasm`, `@capacitor-community/sqlite`, exact pinned versions (as named in spec). Added under **Tests**: Playwright (`@playwright/test`) allowed as a dev dependency for web E2E ACs; Android emulator and physical-device tests stay skipped with a reason.

## Blocked
- **S1:** No `AnswerRecorded` interface/type definition block found in the spec docs (only prose field listing in FE01 item 2 and usage/signatures elsewhere). The field was added to the FE01 item 2 prose definition, behaviour bullet and **AC-01.14**, but it could not be added to a TS interface/type definition as requested.

## Needs my decision
- None. (S6: the spec names specific SQLite packages, so they were recorded in `AGENTS.md`; no SQLite decision required.)

## Review these
Response-time mentions in FE11, FE15 and FE18 (not edited):
- `docs/spec/05-features/m2-play.md:256` (FE11): `   - Measured against the user's own median response time for that game and`
- `docs/spec/05-features/m2-play.md:482` (FE15): `     response time more than about 30% above the user's usual, more hints or`
- `docs/spec/05-features/m3-learning-engine.md:596` (FE18): `  respond(question: Question, now: number): SimResponse;   // raw response + response time`

## Checks
- `rg -n "responseTimeMs" docs` shows the field in the `AnswerRecorded` definition/behaviour/AC and FE04 usage (`docs/spec/05-features/m0-foundations.md:59,65,159,330`); also present in pre-existing `docs/build/M0-REPORT.md:43` (not edited).
- `rg -n '08. not written' docs --glob '!docs/build/**' --glob '!docs/changes/**'`: no hits (FE27 E02/E05 rows are in withdrawn form and 08 does not define them; recorded under **Applied/S5**).
- Duplicate AC IDs (`rg -o -H --glob '!docs/changes/**' --glob '!docs/build/**' '^- \*\*AC-[0-9]+\.[0-9]+\*\*' | sort | uniq -d`): none.
- Edited table row (D116 in `docs/spec/decisions.md`) retains 4 columns, consistent with the table.
- `git diff --name-only` (spec/agent files): `AGENTS.md`, `docs/spec/05-features/m0-foundations.md`, `docs/spec/decisions.md` (plus this report when added). No other spec files changed.
