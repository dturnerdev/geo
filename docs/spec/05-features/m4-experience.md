# M4 — Experience (FE19–FE24)

**Status:** v1.0. Template as in `m0-foundations.md`. Acceptance criteria (AC)
become automated tests unless marked "(manual)".

## M4 setup tasks (not features)

| Task | Output |
|------|--------|
| Daily challenge pool and schedule, at least 90 days ahead in every pack; first year's list (04 open task) | `content/daily/`, pipeline check |
| Placement probe sets per continent and facet group, perspective-safe | Pack chunks |
| Sim harness (FE18): placement runs for the Expert and Daily standard profiles | Report |
| Topics: family and theme names and one-line descriptions, both locales | Pack chunks |
| In-context tips, one per primitive, both locales | Message files |
| Privacy notice in three layers (D144), en-GB and en-US, legal review | `content/legal/`, review record |
| Credits generated from `content/licences.toml`; open-source licence notices generated at build | Build step, CI check |
| Content issue inbox and triage process, 48-hour urgent fix target (D146) | `docs/release/content-issues.md` |
| Moderated usability test with 5–8 target users (06 open task) | Report |

---

## FE19 Explore and Topics

**Milestone:** M4 · **Packages:** engine (`session/`), globe, ui, app-shell ·
**Decisions:** D81, D121, D133, D159, D160, D163, D172, D173 ·
**Depends on:** FE06, FE08, FE09, FE14, FE15, FE24

### Purpose
Let users roam the globe and pick topics freely, and park a round cleanly
when they wander off, without ever counting it against them.

### Behaviour
1. **Explore** is a free-roam globe. It opens from the Explore control
   (bottom left, `E` key), from the menu, or by parking a round (item 7).
2. **Explore isn't learning (D172):** no `AnswerRecorded`, no `ItemMet`, no
   atlas change, no metrics, no daily budget. Viewing a card never counts as a Meet.
3. **Place card (S11):** tapping a place shows:
   - Name in the active perspective (FE07), plus the local name.
   - Disputed areas: who controls and who claims them, in neutral words.
   - Atlas state in words, the facts the user has established, and the Meet fact.
   - Actions: "Learn this next" (learner emphasis, item), "Focus on this
     region" (learner emphasis, continent), "Report a content issue" (FE24).
     FE14 limits apply.
4. **Labels:** established names (D121) plus the tapped place. "Show all
   names in Explore" (Map settings, FE23) is off by default and never applies during questions.
5. **Camera:** full zoom range (FE09). Idle drift after 10 s without input
   (placeholder), never with reduce motion on.
6. **Topics (S12):** from the menu or Explore.
   - Lists pack families and themes in the active perspective, each with
     progress in words ("3 of 5 met").
   - Choosing one counts as choosing an interest: `EmphasisAdded` with source
     `fork` and the family as target. The fork cap applies (FE20 item 5).
   - The next round is a Theme run (FE15) that follows FE14 gates. If a
     round is parked, it ends (`RoundEnded`) and the Theme run is built at that pause.
   - If the new-item gate is closed, the run uses met members only. A family
     with no met members shows as unavailable with "Opens after a few refreshes".
7. **Parking (D133, D173):**

   | Situation | Parks? | Reason |
   |-----------|--------|--------|
   | Explore control or menu opened mid-round | Yes | `explore` / `menu` |
   | Map-answer question (P1, P2, P8, P9, map-based P5), camera moves | Never. Moving is part of answering | – |
   | Other question, globe turned > 30° or zoomed > 1 detail level (placeholders, E07) | Yes | `camera` |
   | App in the background > 5 s (placeholder) | Yes | `background` |
   | Smaller movements | No | – |

   Append `RoundParked { reason }`, then `RoundResumed` on return.
8. **Resume:** the "Back to round" tab (S10), Back/Esc, or turning the
   camera back within the thresholds of the question's view. The camera flies
   back to the question. FE15 rebuilds unanswered slots after 10 minutes.
9. **Response time** excludes parked time, so parking never costs "fast" (FE11).
10. **Pauses (D163):** Explore or Topics opened from a pause counts as a pause.
    A parked round doesn't. Pending changes wait until the round ends.
11. **Accessibility:** a searchable place list opens the same cards. Keyboard
    controls follow FE06 and D159.

### Interfaces

```ts
export type ParkReason = 'explore' | 'menu' | 'camera' | 'background';

export type IntentSignal =
  | { kind: 'camera'; delta: CameraDelta }
  | { kind: 'explore' } | { kind: 'menu' }
  | { kind: 'visibility'; hidden: boolean; forMs: number };

export function parkReason(question: Question, signal: IntentSignal, t: ParkThresholds): ParkReason | null;
export function shouldResume(question: Question, camera: CameraState, t: ParkThresholds): boolean;

export function placeCard(
  item: ItemId, view: ContentView, learner: LearnerState, atlas: AtlasSnapshot,
): PlaceCard;

export function topicsList(view: ContentView, learner: LearnerState, gates: SelectionGates): readonly TopicEntry[];
```

### Edge cases
- Small accidental drag on a non-map question: below the thresholds, nothing happens.
- Parked round and the app is killed: the next launch starts a new round (FE15).
- Tap on open ocean that isn't an item: nothing happens.
- A place outside the active perspective: no card. It behaves as part of whatever contains it.
- Topic chosen when 2 interests are active: the oldest ends (`EmphasisEnded`, reason `replaced`).

### Acceptance criteria
- **AC-19.1** Camera movement never parks a map-answer question (property test over the game catalogue).
- **AC-19.2** On other questions, movement above the thresholds parks and below doesn't (unit test).
- **AC-19.3** Explore never appends `AnswerRecorded` or `ItemMet` and never changes the atlas (E2E event-log check).
- **AC-19.4** `responseMs` excludes parked time, including menu time (unit test).
- **AC-19.5** Resume returns to the same question with the camera restored, by tab, Back or camera return (E2E).
- **AC-19.6** Labels follow D121 unless "Show all names in Explore" is on, and never during questions (E2E).
- **AC-19.7** The place list, cards and Topics pass axe-core and work through the keyboard alone.
- **AC-19.8** "Learn this next" and Topics respect the FE14 caps (unit test).
- **AC-19.9** A Theme run from Topics never introduces an item while the new-item gate is closed (property test).

### Out of scope
Quizzes inside Explore, street detail (PK07), the 3D cross-section (PK12).

---

## FE20 Interest forks

**Milestone:** M4 · **Packages:** engine (`selection/`, `session/`), ui, globe, audio ·
**Decisions:** D55, D69, D81, D158, D163 ·
**Depends on:** FE08, FE12, FE14, FE15, FE19

### Purpose
Now and then, let the user choose where to go next, so their interests
shape the order without breaking it.

### Behaviour
1. **Fork card (S09):** at a pause, three destinations glow on the globe
   (sound A08), each with one line. The user picks one or "Not now", with equal prominence.
2. **When it's offered**, only if all of these hold:
   - At a pause between rounds, after round 3 (never during placement, FE22).
   - The new-item gate is open (FE14) and at least 3 options exist.
   - At least 3 sessions since the last offer (placeholder).
   - No other card at that pause (chapter end, daily result, FE22 budget card). One card at a time.
3. **Worked out from the log:** a session is a run of rounds with gaps under
   30 minutes (placeholder). The last offer is found by replaying the same
   rule. No new event type. "Not now" or leaving records nothing.
4. **Options**, seeded from the ended round's seed so replays match:
   - Two from unlocked-but-unstarted content: families, regions or facet
     layers with introducible items and none met.
   - One linked to Explore behaviour: related to learner emphasis added from
     place cards or to families from Theme runs. If there's none, a third
     unstarted option.
5. **Choice:** `EmphasisAdded { source: 'fork', target, weight: 2, until: +30 days }`
   (placeholders). At most 2 active. A third ends the oldest (reason `replaced`).
6. **Share cap (D81):** fork-weighted items fill at most 30% of new-item slots
   per local day. Applied by wrapping `NewItemSource`, so FE14 and FE15 don't change.
7. **Fading:** a fork entry ends silently (reason `faded`) after 3 "Show me"
   answers in a row on its items, or when its time ends (placeholders).
8. **No pressure:** no countdown. It never auto-advances with "No time pressure" on (D158).
9. **Accessibility:** options are also a labelled list. The glow has a
   pattern and label, never colour alone.

### Interfaces

```ts
export function forkDue(history: LearnerHistory, gates: SelectionGates, now: number): boolean;

export function forkOptions(
  history: LearnerHistory, view: ContentView, seed: number,
): readonly [ForkOption, ForkOption, ForkOption] | null;

export function withForkShare(source: NewItemSource, history: LearnerHistory, share: number): NewItemSource;
```

### Edge cases
- Fewer than 3 options exist: no fork.
- Chosen target becomes fully met: the entry ends (FE14).
- Perspective change: options outside the new perspective are dropped. Active entries stay if any target items remain.
- Import: fork entries merge. The cap applies to the merged set, newest first.

### Acceptance criteria
- **AC-20.1** No fork before round 4, while the gate is closed, or within 3 sessions of the last offer (property test).
- **AC-20.2** The same log gives the same offers and options on web and Android (reference replay).
- **AC-20.3** Fork items never exceed 30% of new-item slots in a local day (property test).
- **AC-20.4** No more than 2 fork entries are ever active (property test).
- **AC-20.5** "Not now" appends no events (E2E event-log check).
- **AC-20.6** A fork never shares a pause with another card (property test).
- **AC-20.7** The fork card passes axe-core, works through the keyboard alone, and never auto-advances with "No time pressure" on.

### Out of scope
Topicality-based options (post-MVP), teacher-set forks.

---

## FE21 Daily challenge

**Milestone:** M4 · **Packages:** engine (`daily/`), content, tools/content-pipeline, ui ·
**Decisions:** D30, D69, D72, D76, D77, D134, D158, D174 ·
**Depends on:** FE07, FE10, FE11, FE15

### Purpose
One short shared puzzle a day, the same for everyone, fully offline and
separate from learning.

### Behaviour
1. **Format (D174):** 5 questions (placeholder) from games that grade by
   closeness or order: place a point (P2), aim (P8), put in order (P6), plus one flag pick (P3).
2. **Same for everyone:**
   - The pipeline writes a schedule into every pack at least 90 days ahead (placeholder), keyed by date.
   - A pack update never changes a date already published.
   - If the schedule runs out, a fallback is built from `hash32(date)` over the pool.
3. **Perspective-safe:** only items with the same status, name and facts in
   all three perspectives. No disputed areas (pipeline check).
4. **Date:** the local day with the 04:00 boundary (D134).
5. **Where (S13, D72):**
   - A slot after the warmup in the first round of the local day. The position is tested in E04.
   - Also in the menu until the day ends. "Skip" is always there.
   - No reminders and no "missed" message.
6. **Separate from learning:**
   - Answers aren't `AnswerRecorded`. One `DailyChallengeCompleted { date, challengeId, results }` is appended.
   - No effect on memory, atlas, metrics or daily budget. Items aren't marked as met.
7. **Grading:** FE11 graders give the outcome and geometry. Ratings aren't used. No timer (D77).
8. **Result:** five tiles (correct, close, incorrect) with distances in the
   user's units. This is the only score in public builds (D76; E03 is internal and closed only). Reopening the same day shows the same result.
9. **Share:** plain text through the share sheet or clipboard, for example
   `Daily 17 Nov 2026: 4/5, 312 km off  ■ ■ ▣ ■ □`, plus the app's URL with no parameters.
   - No identifiers. The app never sends it.
10. **No leaderboard, no server, no streak, no archive.**

### Interfaces

```ts
export function dailyChallenge(date: LocalDate, pack: ContentPack): DailyChallenge;
export function dailyResult(results: readonly GradeResult[]): DailyResult;
export function shareText(result: DailyResult, settings: LocaleSettings): string;
```

### Edge cases
- Travel across zones: the challenge follows the local date. Finishing one never blocks the next.
- Device clock ahead: the user may see tomorrow's challenge early. Acceptable without a server.
- Merged histories with two results for one date: the earliest is shown. Both events stay.
- Old app with a newer pack it can't read: the fallback generator applies.

### Acceptance criteria
- **AC-21.1** The same date and pack give an identical challenge on web and Android (reference replay).
- **AC-21.2** A pack update never changes a published date (pipeline check against the previous pack).
- **AC-21.3** No challenge item differs between perspectives (pipeline check).
- **AC-21.4** Completing a challenge changes no memory, atlas, metric or budget (property test).
- **AC-21.5** Share text has no IDs and no time finer than the date. Sharing makes no network request.
- **AC-21.6** No timer, reminder or "missed" message (screenshot review, string lint).
- **AC-21.7** The daily slot appears only after the warmup in the first round of the local day, unless E04 assigns another position.
- **AC-21.8** Share text matches the fixed template only (unit test).

### Out of scope
Leaderboards, an archive of past days, challenges between friends, Blitz variant (FE26).

---

## FE22 Hidden placement and first run

**Milestone:** M4 · **Packages:** app-shell, ui, engine (`selection/`, `session/`) ·
**Decisions:** D21, D39, D93, D97, D103, D158, D166, D175 ·
**Depends on:** FE01, FE05, FE11, FE14, FE15, FE16

### Purpose
Get a new user from launch to their first correct answer in under a
minute, with nothing to fill in, and notice what they already know without a test.

### Behaviour

**First run**
1. **First run** means the event log has no answers. It's worked out from the log, not stored as a flag.
2. **Nothing before the first round:** no account, sign-up, survey, tour, age
   question (D93) or permission prompt. Language, units and perspective are detected (FE05).
3. **Start screen (S01, D175):**
   - The globe, one line of text and a "Start" button.
   - Two small links: "Accessibility and settings" (FE23) and "Import progress" (FE01).
   - One privacy line: "Your progress stays on this device", linking to the privacy notice (FE24).
4. **First round:** a Meet card for a start-sequence item (D39), then its R1
   question. A one-line tip teaches the tap. Placement probes start from slot 3.
5. **In-context tips:** one line the first time each primitive appears.
   Shown once per primitive, stored as `SettingChanged`.
6. **After round 3** (placeholder): one optional pause card offers daily
   budget and goal (FE14), with "Not now". It's never shown again.
7. **Web:** persistent storage is requested after the first completed round (FE01).

**Hidden placement (D97, D166)**

8. **Runs only on a fresh install** with no answers, never after an import.
9. **Probes:** in rounds 1–3 (placeholder), up to 3 probe slots per round
   (placeholder), from slot 3 onwards. A probe asks about an unmet item at R2
   or R3, with no Meet card, as a normal question.
10. **Probe items:** per-continent fame-tier probe sets in the pack, for F03,
    F06 and F08 (placeholder). Perspective-safe.
11. **Adaptive:**
    - Per continent and facet group, start at tier 1.
    - Good or Easy moves up a tier. Incorrect or "Show me" moves down.
    - Stop after 2 misses in a row overall (placeholder). At most 9 probes in total.
12. **Events:** a probe is an ordinary `AnswerRecorded`, with `ItemMet` in
    the same transaction. After a wrong probe, the feedback shows the answer and the Meet card follows.
13. **Estimate:** a pure function of the probes. No new event type, nothing stored.
14. **Credit (FE14):**
    - Tiers at or below the estimate open straight away.
    - Items in those tiers start at R2 without a Meet card. A short name and
      fact line is shown in their first feedback.
    - Nothing becomes established without the normal evidence (FE08).
15. **Never shown:** no score, level or "test" wording.
16. **Correction:** if accuracy on placed items falls below 70% over 20
    answers (placeholders), the estimate drops one tier and Meet cards return.

### Interfaces

```ts
export function isFirstRun(state: LearnerState): boolean;
export function tipFor(primitive: PrimitiveId, settings: SettingsState): TipId | null;

export function isProbe(answer: AnswerRecorded, history: LearnerHistory): boolean;
export function placementEstimate(history: LearnerHistory): PlacementEstimate;

export interface PlacementEstimate {
  tiers: ReadonlyMap<PlacementGroup, FameTier>;   // per continent × facet group
}
```

### Edge cases
- The user quits before answering: the start screen shows again.
- Import from the start screen: first run and placement are skipped.
- Offline first launch: works (AC-02.1).
- Screen reader: the start screen is fully labelled, "No time pressure" is on (D158), and the first round offers the list alternative (FE10).
- Every probe skipped or "Show me": the estimate is tier 0, and the user follows the normal path.
- Expert: probes climb quickly and stop at the 9-probe cap.
- Import after placement: the estimate is recomputed from the merged log the same way.
- Perspective change: the estimate stays. Tiers are recounted (FE07).

### Acceptance criteria
- **AC-22.1** Cold start to an interactive start screen < 3 s on the Galaxy A07 4G (J1).
- **AC-22.2** Launch to first question takes one tap (E2E).
- **AC-22.3** No permission prompt, account, age question or form before the first question on web and Android (E2E).
- **AC-22.4** The first question is an R1 question on a start-sequence item, after its Meet card (property test).
- **AC-22.5** The first two slots of round 1 never contain a probe (property test).
- **AC-22.6** No probe after round 3 or after 2 misses in a row (property test).
- **AC-22.7** No item is established by placement alone (property test).
- **AC-22.8** The estimate is identical on web and Android from the same log (reference replay).
- **AC-22.9** No screen or string mentions a test, level or placement result (string lint, screenshots).
- **AC-22.10** Sim harness: simulated experts reach tier 3 within 3 rounds. Simulated beginners see at most 2 probes (placeholders).
- **AC-22.11** Low accuracy on placed items drops the estimate and brings Meet cards back (unit test).
- **AC-22.12** Each tip shows at most once and survives import (last-writer-wins). The budget and goal card shows at most once, never before round 3.
- **AC-22.13** The start screen passes axe-core and works through the keyboard alone.

### Out of scope
Accounts, tutorials, video intros, a manual "I already know this" skip, placement for physical facets.

---

## FE23 Settings and Your data

**Milestone:** M4 · **Packages:** ui, app-shell, domain ·
**Decisions:** D35, D57, D124, D129, D151, D157, D158, D159, D161, D162, D163 ·
**Depends on:** FE01, FE02, FE03, FE04, FE05, FE07, FE12, FE14, FE25

### Purpose
One clear place for every setting and for the user's data. Accessibility
options can be reached before the first question.

### Behaviour
1. **Where:** Settings (S16) from the menu. Opening the menu during a round parks it (FE19).
2. **Sections:**

   | Section | Contents |
   |---------|----------|
   | Learning | Daily budget, goal, active emphasis list with "End" (FE14), "Show weekly rhythm" (FE25) |
   | Sound and haptics | Master, voice, music, effects sliders with mutes; haptics (FE12, D57, D161, D162) |
   | Display | Theme follows system (D157), high contrast, pattern strength, reduce motion, text size |
   | Map | Globe or flat, "Show all names in Explore" (FE19) |
   | Play | "No time pressure" (D158), spelling support, list alternative, single-key shortcuts (D159) |
   | Colour vision | Optional colour-vision type (D129) |
   | Language and units | Language, units, perspective (FE05, FE07) |
   | Network | Data saver and content download options (FE02) |
   | Reminders | FE25. Android only |
   | Your data | S17, item 6 |
   | About | App and pack versions, Credits and notices (FE24), feedback |
   | Developer | Opens S22 (FE03). Internal builds only (D35) |

3. **When changes apply:**
   - Sound, Display, Map and Play: from the next question. An answer that's already graded is never changed.
   - Learning, Language and units, Network: at the next pause (D163).
4. **System preferences:** text size, reduce motion, contrast and theme
   default to "Follow system". An in-app choice overrides it.
5. **Storage:** every change is a `SettingChanged` (last-writer-wins on
   import), except the colour-vision type, which stays on the device only and is never exported (D129).
6. **Your data (S17):**
   - What's stored: number of answers, storage used, packs.
   - "Save a copy of your progress" and Import (FE01).
   - "Share a summary" (FE04, D151). Internal and closed builds only.
   - "Share my practice log" (FE30, D180). Internal and closed builds only.
   - "Delete everything" (FE01).
7. **Reset settings:** puts every setting back to default. Progress is untouched, and the option says so.
8. **First run:** the start screen link (FE22) opens Display, Sound and
   haptics, Play and Language and units, then returns to the start screen.

### Interfaces

```ts
export type SettingsSection =
  | 'learning' | 'sound' | 'display' | 'map' | 'play' | 'colourVision'
  | 'language' | 'network' | 'reminders' | 'data' | 'about' | 'developer';

export function visibleSections(platform: Platform, flags: FlagState): readonly SettingsSection[];

export function effectiveSetting<K extends SettingKey>(
  key: K, stored: SettingsState, system: SystemPreferences,
): SettingValue<K>;

export function applyTiming(key: SettingKey): 'nextQuestion' | 'nextPause';

export interface StorageReport { answers: number; bytes: number; packs: readonly PackSummary[] }
export function storageReport(): Promise<StorageReport>;
```

### Edge cases
- OS preference changes while the app is open: followed from the next question unless overridden.
- Imported settings that don't apply here (reminders on web): ignored, kept in the log.
- Largest text size: no truncated controls. Layouts reflow.
- Spelling support turned on mid-round: applies from the next question only.

### Acceptance criteria
- **AC-23.1** Every setting in the app is reachable from this screen (catalogue test against `SettingKey`).
- **AC-23.2** Every `SettingKey` has an apply timing. Learning, language and network changes never apply mid-round (unit test, E2E).
- **AC-23.3** No setting change alters an answer that's already graded (property test).
- **AC-23.4** "Follow system" tracks OS text size, reduce motion, contrast and theme (E2E on web and Android).
- **AC-23.5** At 200% text size, every screen passes without clipped or overlapping controls (screenshots).
- **AC-23.6** Reset settings leaves the answer log and atlas unchanged (E2E event-log check).
- **AC-23.7** The colour-vision type never appears in the event log or an export (unit test).
- **AC-23.8** The Developer section and "Share a summary" never appear in public builds (CI flag check).
- **AC-23.9** The settings screens pass axe-core and work through the keyboard alone.

### Out of scope
Settings profiles, sync between devices, parental controls.

---

## FE24 Credits, notices and content reports

**Milestone:** M4 · **Packages:** ui, content, tools/content-pipeline, app-shell ·
**Decisions:** D87, D89, D103, D144, D146, D163 ·
**Depends on:** FE02, FE07, FE19, FE23

### Purpose
Credit every source correctly, state the border and privacy position
plainly, and give users a way to report content errors without a server.

### Behaviour
1. **Licence register (D87):** `content/licences.toml` lists every source,
   licence, credit text and check date.
   - Allowlist only (04 §1). No OpenStreetMap data in learning content.
   - CI fails if a source has no credit, a licence isn't allowlisted, or a
     release build contains non-commercial audio (D89).
2. **Credits and notices (S18):** from the menu and About. Works offline. Contents:
   - Data credits, generated from the register for the installed packs.
   - Open-source licences, generated at build.
   - Border notice (D146): "Borders shown follow [perspective]. Their
     inclusion doesn't imply endorsement." It names the active perspective.
   - Privacy notice (item 3).
3. **Privacy notice (D144):**
   - Three layers: a 5-line plain summary for children, a short summary, the full text. en-GB and en-US.
   - Bundled in the app and works offline. Linked from the start screen (FE22), S18 and the store listing.
   - When the notice changes, one line appears at the next pause (D163). No re-consent is needed.
4. **Report a content issue (D146):**
   - From the place card (S11), answer feedback (S04) and S18.
   - The user picks a type: wrong fact, wrong name or spelling, border or
     status, pronunciation, other.
   - Opens an email draft to the project address with item ID, facet,
     perspective ID, pack version and app version filled in. The user may
     add text in their own email app.
   - No install ID, location or answer history. If no email app exists, the
     text can be copied.
   - Nothing is sent by the app.
5. **Urgent fixes:** the target is a content pack within 48 hours (D146,
   process in `docs/release/content-issues.md`).

### Interfaces

```ts
export interface LicenceEntry { source: string; licence: SpdxId; credit: string; checked: LocalDate }

export function creditsFor(packs: readonly PackManifest[], register: readonly LicenceEntry[]): readonly Credit[];

export function contentIssueDraft(
  kind: ContentIssueKind, item: ItemId, facet: FacetId | null, ctx: ReportContext,
): { to: string; subject: string; body: string };
```

### Edge cases
- Perspective change: the border notice updates at the next pause.
- A pack adds a new source: credits update when the pack applies.
- Report from an item retired since the question: the draft still carries its ID.

### Acceptance criteria
- **AC-24.1** CI fails on a source without a credit, a licence outside the allowlist, or non-commercial audio in a release build.
- **AC-24.2** Credits list every source in the installed packs and nothing else (unit test).
- **AC-24.3** The border notice names the active perspective (E2E per perspective).
- **AC-24.4** The privacy notice and credits open offline in both locales (E2E).
- **AC-24.5** A content issue draft contains only the listed fields (unit test). Making it sends no network request (network audit).
- **AC-24.6** A changed privacy notice shows one line at the next pause, once (E2E).
- **AC-24.7** S18 passes axe-core and works through the keyboard alone.

### Out of scope
In-app issue tracking, server-side reporting, user-submitted corrections.
