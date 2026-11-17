# Post-MVP

**Status:** v1.0. Deferred scope and the structures the MVP builds now so it
can be added without a migration (D41). Risks and parked items:
`11-risks-and-parked.md`.

## Rules
1. Moving an item into scope needs a D entry and a feature spec.
2. Structures listed here are built and tested in the MVP even when unused.
3. "Not planned" items need a D entry that supersedes the named decision.

## Deferred

| Item | Built now | Ref |
|------|-----------|-----|
| Accounts and sync | Install IDs on events, merging import (D164), last-writer-wins settings | FE01 |
| iOS | Platform interfaces in app-shell (storage, reminders, haptics) | FE25, FE31 |
| More markets | Perspective files. Europe next. China, Russia and India after a perspective and legal review | D86, PK04, PK10 |
| Push and web notifications | `ReminderScheduler`. Web reports `available: false` | FE25 |
| Street detail | Zoom levels. Streamed Protomaps basemap, never in the content database | PK07 |
| 3D cross-section | Earth layer items | PK12 |
| Solar system Easter egg | – | 01 §8 |
| Speech input (P10) | Primitive ID reserved, `audio` channel | FE10 |
| Facets F18, F19 outside home country, F20–F23, F25–F34 | Facet IDs reserved, prerequisite graph | FE14 |
| Deep stats | Licence check before F23 | 04 §1 |
| Topicality, topicality-based forks | Fork option builder | FE20 |
| Teacher tools, class atlas, printable tests, teacher-set forks | Goal weights (D64), emphasis entries | FE14 |
| Deadline mode, teacher goals | Goal presets (D170) and goal weights used by the builder | FE14 |
| FSRS-7 | `MemoryModel` interface, state rebuilt from the log | D59, PK08 |
| Music | Channel exists, off by default | D161 |
| Monthly rhythm | `weeklyRhythm` takes `minDays`, `streak` flag | FE25 |
| Daily Blitz, Blitz scores | `blitz` flag. Scores need a D entry amending D76 | FE26 |
| Summaries for all users | Allowlisted summary file | D151, PK06 |
| Play Age Signals | Everyone treated as under 18 | D93, PK09 |
| In-app update prompts | `packNeedsNewerApp` | FE31 |
| Daily archive, friend challenges | `DailyChallengeCompleted` events kept | FE21 |
| Year in review, progress images | Progress projection | FE28 |
| Settings profiles | `SettingChanged` log | FE23 |

## Not planned

| Item | Decision |
|------|----------|
| Daily streaks, streak freezes | D93, D176 |
| Ads, analytics, crash reporting, advertising IDs | D92 |
| Leaderboards, scores outside the daily challenge and E03 | D76 |
| Visible timers outside Blitz | D77 |
| "Done for today", guilt or come-back messages | D69, D78 |
| Automatic upload of logs | D180 |
| Location (GPS or IP) | D103 |
