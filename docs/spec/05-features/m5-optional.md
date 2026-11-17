# M5 — Optional modules and release (FE25–FE31)

**Status:** v1.0. Template as in `m0-foundations.md`. Acceptance criteria (AC)
become automated tests unless marked "(manual)". FE25–FE27 are optional
modules behind flags. FE28–FE31 make the app ready for release (D182).

## M5 setup tasks (not features)

| Task | Output |
|------|--------|
| DPIA before the closed test, including the D73 condition (D143) | `docs/legal/` |
| Privacy policy page on the project domain (static, no cookies, no analytics) | Hosted page, link in Play Console |
| Play Console: account type, Data safety, target ages (D142), Families badge opt-in, IARC questionnaire, UK-only availability (D141) | Store declarations, recorded in `docs/release/` |
| Closed test: at least 12 testers opted in for 14 days in a row if the account rules require it. Recruit 20 adult testers (placeholder) | Tester list (kept outside the repo), schedule |
| Tester consent text (per data type, D145) and log-donation notice, both locales, legal review | `content/legal/`, review record |
| Project address for feedback, content issues and donations, with retention and deletion process | `docs/release/data-handling.md` |
| CI allowlists: network hosts, Android permissions (merged manifest), runtime dependencies | CI checks (FE29) |
| Reminder message pool, both locales, through the string lint | Message files |
| Pre-registration files for every live experiment (D150) | `experiments/Exx.md` |
| External WCAG audit before the first public release (D140) | Audit report |
| Release checklist | `docs/release/checklist.md` |

---

## FE25 Streak module: weekly rhythm and reminders

**Milestone:** M5 · **Packages:** engine (`metrics/`), ui, app-shell, apps/android ·
**Decisions:** D15, D69, D78, D93, D134, D158, D163, D176, D177, D178 ·
**Depends on:** FE01, FE03, FE04, FE23, FE29

### Purpose
Support a steady habit without guilt, pressure or nagging.

### Behaviour
1. **Practice day:** a local day (04:00 boundary, D134) with at least one
   `AnswerRecorded`. Explore, Blitz and the daily challenge don't count (FE19, FE21, FE26).
2. **Weekly rhythm (D176):**
   - Flag `streak`, on by default.
   - A week (Monday start, local) counts if it has at least 2 practice days (placeholder).
   - Rhythm is the number of counted weeks in a row. The current week never breaks it before it ends.
   - Shown in the menu (S15) and the progress view (S23): the rhythm number
     and 7 dots for this week's practice days. Never on a pause or mid-round.
   - No "X to go", no countdown, no "you lost your rhythm" (D69, D78). A reset is silent.
   - "Show weekly rhythm" (Settings → Learning, default on) hides it everywhere when off.
   - No daily streak, ever (D93).
3. **Reminders (Android only, D177):**
   - Flag `reminders`. Off by default. Only turned on in Settings → Reminders. Never prompted elsewhere.
   - Turning on explains what will happen, then requests `POST_NOTIFICATIONS`.
     If denied, the setting stays off with a link to system settings.
   - One per local day at the chosen time (default 18:00, choices 07:00–21:00).
   - Always inexact: `isExactNotification: false`. It may arrive later than the chosen time.
   - Scheduling happens only after the user turns reminders on. At each launch
     and pause, cancel and schedule the next 7 days. Today is skipped once it's a practice day.
   - Text from a neutral pool ("A few places are ready to refresh."). No
     guilt, rhythm, numbers due or emoji.
   - Tapping opens the globe, not a round.
   - After 7 reminders in a row without the app being opened that day
     (placeholder), reminders stop. The next launch shows one line, "Reminders
     paused", with "Turn back on".
   - Import never turns reminders on, because permission is per device.
   - "Delete everything" (FE01) cancels every scheduled reminder.
4. **Web:** no reminders. Browsers can't schedule local notifications without a server.
5. **Settings changes** apply at the next pause (D163) and are stored as `SettingChanged`.

### Interfaces

```ts
export function practiceDays(answers: Iterable<AnswerRecorded>): readonly LocalDate[];

export function weeklyRhythm(days: readonly LocalDate[], today: LocalDate, minDays: number):
  { weeks: number; thisWeek: readonly boolean[] };   // 7 entries, Monday first

export interface ReminderScheduler {
  readonly available: boolean;   // false on web
  enable(time: LocalTime): Promise<Result<void, { kind: 'permission-denied' }>>;
  disable(): Promise<void>;
  reschedule(state: LearnerState, now: number): Promise<void>;
  cancelAll(): Promise<void>;     // called by FE01 delete
}
```

### Edge cases
- Travel: reminder times follow the device's current zone at scheduling time.
- Clock change: the next reschedule corrects the time.
- Reboot: rescheduled on next launch. Whether alarms survive a reboot is checked manually (AC-25.9).
- Notification permission revoked in system settings: detected at launch. The setting turns off silently.
- Practice before 04:00: counts for the previous local day (D134).
- Flag `streak` switched off in a pack: rhythm disappears at the next pause. Nothing is lost, because it's worked out from the log.

### Acceptance criteria
- **AC-25.1** Rhythm matches reference fixtures, including week boundaries and the 04:00 rule (unit test).
- **AC-25.2** No string shows a countdown, loss, remaining days or a daily streak (string lint, screenshots).
- **AC-25.3** No permission prompt and no scheduling call happen unless the user turns reminders on (E2E).
- **AC-25.4** Every scheduled notification sets `isExactNotification: false` (unit test).
- **AC-25.5** No reminder on a day that's already a practice day (E2E on emulator).
- **AC-25.6** Reminders stop after 7 unopened days and show "Reminders paused" once (unit test).
- **AC-25.7** The web build has no reminder setting (E2E).
- **AC-25.8** "Delete everything" leaves no scheduled reminders (E2E on emulator).
- **AC-25.9** Reminders fire after a device reboot (manual, Redmi A5 and Galaxy A07 4G). If not, the ADR decides between the next-launch reschedule only and a D entry for a boot permission.
- **AC-25.10** Rhythm never appears on a pause or mid-round (E2E).

### Out of scope
Push notifications, daily streaks, monthly variant, streak freezes, badges, rewards for streaks.

---

## FE26 Blitz

**Milestone:** M5 · **Packages:** engine (`session/`), ui, globe, audio ·
**Decisions:** D69, D76, D77, D93, D158, D162, D163 ·
**Depends on:** FE03, FE06, FE10, FE11, FE12, FE13

### Purpose
An optional quick-fire run on places the user already knows, for fun,
without touching learning or grading.

### Behaviour
1. **Flag `blitz`, off by default** (README scope). Internal builds can switch it on in S22.
2. **Where:** menu (S15) → "Blitz", only between rounds. Hidden while "No
   time pressure" is on (D158).
3. **Format:**
   - 60 s (placeholder). Light games only: tap the place (P1) and pick from options (P3).
   - Only established item-facets in the active perspective. Nothing new, no Meets.
   - Needs at least 12 established item-facets (placeholder). Below that, "Blitz" isn't shown.
4. **Timer:** a countdown bar, the only visible timer in the app (D77).
   With reduce motion on, it's a static bar that steps every 10 s.
5. **Never graded for learning (D77):**
   - FE11 graders give feedback only. No `AnswerRecorded`, no `ItemMet`.
   - No effect on memory, atlas, metrics, daily budget, rhythm or response-time baselines.
   - No new event type. Nothing is stored.
6. **End:** the places answered correctly light up on the globe with their
   names. No count, score, personal best or share (D76).
7. **Feedback:** effects and positive haptics only (D162). The rising-pitch combo applies (FE12).
8. **Leaving:** Back, the menu or the app going to the background ends the Blitz. Nothing is kept.
9. **Pending changes** (D163) apply before a Blitz starts, never during one.

### Interfaces

```ts
export function blitzAvailable(state: LearnerState, view: ContentView, flags: FlagSnapshot,
  settings: SettingsState): boolean;

export function blitzQueue(state: LearnerState, view: ContentView, seed: number): readonly BlitzQuestion[];

export interface BlitzSummary { correct: readonly ItemId[] }   // shown, never stored
```

### Edge cases
- The queue runs out before time: items repeat in a new order.
- Perspective change pending: applied before the Blitz starts.
- Screen reader detected: "No time pressure" is on (D158), so Blitz is hidden.

### Acceptance criteria
- **AC-26.1** A Blitz appends no events (E2E event-log check).
- **AC-26.2** Blitz never changes memory, atlas, metrics, budget, rhythm or baselines (property test).
- **AC-26.3** Blitz is unavailable with "No time pressure" on or the flag off (unit test, E2E).
- **AC-26.4** Blitz only asks established item-facets in the active perspective (property test).
- **AC-26.5** The end screen shows no number (screenshot review, string lint).
- **AC-26.6** With reduce motion on, the timer doesn't animate continuously (E2E).
- **AC-26.7** Blitz passes axe-core and works through the keyboard alone.

### Out of scope
Daily Blitz variant, scores, personal bests, leaderboards.

---

## FE27 Points, round pacing and experiments

**Milestone:** M5 · **Packages:** engine (`session/`, `metrics/`), ui, content, tools ·
**Decisions:** D59, D62, D69, D71, D72, D73, D74, D76, D104, D110, D133, D143, D150, D152, D158, D173, D179, D184 ·
**Depends on:** FE03, FE04, FE11, FE13, FE15, FE18

### Purpose
Run the MVP experiments safely: points, how rounds continue, the chapter
end and round pacing, each with a calm default for public builds.

### Behaviour
1. **Experiment register (D152).** Method, metrics and decision rule: 08.

   | ID | Question | Variants (default first) | Decision | Feature |
   |----|----------|--------------------------|----------|---------|
   | E01 | Continue between rounds | A tap to continue · B auto-continue after 3 s (placeholder) | D73 | FE15, FE27 |
   | E02 | Not used. Withdrawn before definition. ID never reused (08 §5) | – | – | – |
   | E03 | Points | A none · B round score at the pause, then discarded · C round score and personal best per game type | D76 | FE27 |
   | E04 | Daily challenge position | A after the warmup · others in `experiments/E04.md` | D72 | FE21 |
   | E05 | Not used. Withdrawn before definition. ID never reused (08 §5) | – | – | – |
   | E06 | Round length | A 60–120 s · others in `experiments/E06.md` | D71 | FE15 |
   | E07 | Park thresholds | A D173 values · others in `experiments/E07.md` | D133, D173 | FE19 |
   | E08 | Chapter end | A on · B off | D74, D179 | FE27 |
   | E09 | FSRS-7 trial (internal and closed builds) | A FSRS-6 · B FSRS-7 | FE13 item 11 switch checks (08 §9) | FE13 |

2. **Method (D150):**
   - Every variant runs through the sim harness (FE18) before going live.
   - Pre-registered in `experiments/Exx.md` (FE03 item 8).
   - Internal and closed builds only (D110). Public builds always get variant A.
   - At most 3 live at once (placeholder). At least 2 weeks each. Decided per 08 §6 (D184).
3. **Continue between rounds (E01, D73):**
   - A: the pause waits for a tap.
   - B: a ring fills for 3 s, then the next round starts. Any tap stops it.
   - "No time pressure" always forces A (D158, AC-03.4).
   - B can only become the public default after the DPIA clears it (D143).
4. **Chapter end (S08, D74, D179):**
   - Shown at a pause when fatigue is at level 1 or above (FE15), or after 25
     minutes of active practice in the session (placeholder).
   - "A good place to stop." with "Keep going" and "Stop here" equally prominent.
   - "Stop here" returns to the globe. No "done" wording (D69).
   - At most once per session, unless fatigue worsens.
   - On in public builds (D143). E08 tests it only in internal and closed builds.
5. **Points (E03, D76):**
   - Round score from ratings: Again 0, Hard 1, Good 2, Easy 3 (placeholders).
   - B: shown at the pause, then discarded.
   - C: also the personal best per game type, worked out from the answer log. No new event type.
   - Never shown mid-round, on the chapter end, in Blitz or in the daily challenge.
   - Never affects grading or scheduling.
6. **Exposure:** `ExperimentExposed` the first time a variant changes what the user sees (FE03).

### Interfaces

```ts
export function roundScore(answers: readonly AnswerRecorded[], weights: ScoreWeights): number;

export function personalBests(history: LearnerHistory, weights: ScoreWeights):
  ReadonlyMap<GameId, number>;

export function chapterEndDue(session: SessionSignals, history: LearnerHistory, now: number): boolean;

export function liveExperiments(pack: PackManifest): readonly ExperimentId[];   // CI cap check
```

### Edge cases
- Score weights change in a pack: personal bests are recomputed with the new weights.
- Import: assignments stay per install (D164). Personal bests are recomputed from the merged log.
- Experiment removed mid-run: falls back to variant A at the next pause (FE03).

### Acceptance criteria
- **AC-27.1** Public builds resolve every experiment to variant A (CI flag check, with AC-03.3).
- **AC-27.2** Auto-continue never happens with "No time pressure" on (property test, with AC-03.4).
- **AC-27.3** Chapter end shows at most once per session unless fatigue worsens (property test).
- **AC-27.4** "Keep going" and "Stop here" have equal size and weight (screenshot review).
- **AC-27.5** Points never appear mid-round, on chapter end, in Blitz or in the daily challenge (E2E).
- **AC-27.6** Personal bests match a reference projection of the same log (reference replay).
- **AC-27.7** A pack with more than 3 live experiments fails CI.
- **AC-27.8** Every live experiment has a sim harness report attached to its `experiments/Exx.md` (CI check).

### Out of scope
Badges, leaderboards, multipliers, experiments on public users.

---

## FE28 Progress view

**Milestone:** M5 · **Packages:** engine (`metrics/`, `selection/`), ui ·
**Decisions:** D69, D121, D127, D134, D149, D160, D181 ·
**Depends on:** FE04, FE07, FE08, FE14, FE16, FE25

### Purpose
Show what the user has learned in words and numbers, without targets,
rankings or loss language.

### Behaviour
1. **Where:** progress view (S23) from the menu (S15). The Living Atlas (FE08)
   stays the main view of progress. This screen is the written summary.
2. **Sections:**

   | Section | Content |
   |---------|---------|
   | Places | A link to the atlas summary (S14, D160). Not repeated here |
   | Facts | Established item-facets per facet group (location, names, flags, capitals, physical) |
   | Holding well | FE04 durable-knowledge metric, in words first, the number on tap |
   | Practice | Practice days over the last 12 weeks, and weekly rhythm if shown (FE25) |
   | Mix-ups | Up to 3 lookalike pairs confused most in the last 30 days (FE16) |

3. **Mix-ups:** "Practise this pair" queues the pair for the next round, with
   its contrast card first. The queue is held in memory and not stored.
4. **Wording:**
   - Falling recall is "ready to refresh", never "lost" or "forgotten".
   - No rankings, no comparison with other users, no daily budget (D69).
   - No time spent as a goal (D149).
5. **Projection only:** no new events. Computed off the main thread and cached in the snapshot (FE01).
6. **Perspective change:** counts are recomputed for the new perspective.
7. **Accessibility:** every chart has a table or list alternative. Colour is never the only signal (D127).

### Interfaces

```ts
export function progressSummary(
  state: LearnerState, view: ContentView, metrics: MetricsSnapshot, now: number,
): ProgressSummary;

export interface ProgressSummary {
  facets: ReadonlyMap<FacetGroup, number>;
  holdingWell: number;                          // 0–1, FE04
  practice: readonly PracticeDay[];             // last 84 local days
  mixUps: readonly ConfusionPair[];             // max 3
}
```

### Edge cases
- New user with no answers: one line pointing to the first round. No empty charts.
- Item established, then retired by a pack update: dropped from the counts and kept in history.
- Imported history: recomputed from the merged log.

### Acceptance criteria
- **AC-28.1** Counts match a reference projection for the same log and perspective (reference replay).
- **AC-28.2** No string mentions loss, ranking, other users or time spent as a target (string lint).
- **AC-28.3** Every chart has a table alternative and passes axe-core (E2E).
- **AC-28.4** Opening the screen appends no events (E2E event-log check).
- **AC-28.5** Summary for 10,000 answers renders in < 300 ms on the Galaxy A07 4G (performance test).
- **AC-28.6** "Practise this pair" puts the pair in the next round, after its contrast card (E2E).

### Out of scope
Year-in-review, sharing progress images, per-item history pages.

---

## FE29 Privacy enforcement and store declarations

**Milestone:** M5 · **Packages:** apps/web, apps/android, app-shell, CI ·
**Decisions:** D92, D93, D103, D107, D135, D141, D142, D177, D178, D183 ·
**Depends on:** FE01, FE02, FE04, FE24, FE25, FE30

### Purpose
Keep every byte of progress on the device, prove it in CI, and keep store
declarations accurate.

### Behaviour
1. **What leaves the device:** only content pack requests (FE02), links the
   user taps, and files or emails the user chooses to send (diagnostics
   FE04, summaries FE23, tester logs FE30, content issues FE24, feedback FE30).
   No accounts, server copy, analytics, ads, crash reporting or advertising IDs (D92).
2. **Enforcement:**
   - Network allowlist: the pack host only. Web uses CSP `connect-src` (D107).
     Every E2E run records requests and fails on any other host.
   - Android permissions (D178): `INTERNET`, `VIBRATE`, `POST_NOTIFICATIONS`.
     CI checks the merged manifest. A permission added by a library is removed
     with `tools:node="remove"` or needs a new D entry.
   - Runtime dependency allowlist: pinned, human-reviewed (D107). No analytics, ads or crash-reporting SDKs.
3. **No location:** perspective, language and units come from locale settings (FE05), never GPS or IP (D103).
4. **High-privacy defaults:** everyone is treated as under 18 (D93). Nothing
   to switch on for privacy, and no prompt nudges the user to share.
5. **Store declarations:**
   - Data safety: diagnostics and app interactions (FE04, FE23, FE30) declared
     as collected, optional and not shared. Nothing else.
   - Target ages 9–12, 13–15, 16–17 and 18+ (D142), so the Families policy
     applies. Opt in to the "Committed to follow the Play Families Policy" badge.
   - IARC questionnaire answered and kept with the release record.
   - Privacy policy linked in Play Console and in the app (FE24).
   - Android availability: UK only (D141).
   - `minSdk` 29, `targetSdk` 36 (D135).
6. **Every release** re-checks declarations against the network audit and the
   list of user-sent files (FE31).
7. **Pack and policy host (D183):** no access logs, or truncated IPs only,
   deleted within 7 days (placeholder).

### Interfaces

```ts
// CI tools only
export function auditRequests(log: readonly RecordedRequest[], allow: readonly string[]): readonly Violation[];
export function auditManifest(merged: AndroidManifest, allow: readonly AndroidPermission[]): readonly Violation[];
```

### Edge cases
- A library update adds a permission: CI fails until it's removed or a D entry allows it.
- A user taps an external link (credits source): opens the system browser, outside the app's audit.
- Pack host changes: the allowlist changes by spec PR only.

### Acceptance criteria
- **AC-29.1** E2E runs make network requests to the pack host only, on web and Android (network audit).
- **AC-29.2** The merged Android manifest contains only D178 permissions (CI manifest check).
- **AC-29.3** No runtime dependency outside the allowlist (CI dependency check).
- **AC-29.4** No code path reads location or makes an IP lookup (static check, network audit).
- **AC-29.5** Store declarations, target ages and IARC answers match the network audit and user-sent files (release checklist, manual).
- **AC-29.6** The Android build has `minSdk` 29 and `targetSdk` 36 (CI check).
- **AC-29.7** The host configuration keeps no access logs, or truncated IPs deleted within 7 days (release checklist, manual).

### Out of scope
Cloud sync, accounts, parental dashboards, Play Age Signals (PK09).

---

## FE30 Tester programme and feedback

**Milestone:** M5 · **Packages:** app-shell, ui, engine (`metrics/`), content ·
**Decisions:** D104, D110, D143, D145, D150, D151, D180 ·
**Depends on:** FE01, FE03, FE04, FE18, FE23

### Purpose
Gather the tester logs the learning engine needs and feedback from
everyone, without a server and without weakening privacy.

### Behaviour
1. **Tracks:**

   | Track | Who | Tester features |
   |-------|-----|-----------------|
   | Internal | Team | All, plus developer panel (S22) |
   | Closed | Invited adult testers | Log donation, "Share a summary", experiments |
   | Public | Everyone | Feedback only |

   Tester features are behind the `tester` flag, set per build channel (FE03).
2. **Testers are adults:** recruitment and the tester agreement confirm 18+.
   The app never asks for an age (D93). The DPIA is done before the closed test (D143).
3. **Log donation (D180):**
   - Settings → Your data → "Share my practice log". Never prompted. At most
     one reminder line per 30 days on the pause screen (placeholder), which the tester can switch off.
   - Consent per data type (D145): answers, settings that affect learning,
     app and pack versions, device class. Each can be left out.
   - A full preview, then the share sheet to the project address. Nothing is sent automatically.
   - Redaction: typed text that doesn't match a place name is replaced by its
     length. No device identifiers, no free text, no timezone names (UTC offsets only).
   - A random donation code is shown and kept on the device, so the tester
     can ask for deletion without identifying themselves.
4. **"Share a summary"** stays the counts-only file in FE23 (D151).
5. **Feedback** (all tracks): Settings → About → "Send feedback" opens an
   email draft with app and pack versions only. Attaching diagnostics (FE04) is optional, with the FE04 preview.
6. **Use of donated logs:** M3 ADRs, population defaults (FE17), sim harness
   calibration (FE18). Kept up to 24 months (placeholder). Deleted within 90
   days of a request by donation code. Handling is in `docs/release/data-handling.md`.

### Interfaces

```ts
export function donationBundle(log: Iterable<DomainEvent>, opts: DonationOptions): DonationBundle;

export interface DonationOptions { include: ReadonlySet<DonationDataType> }

export interface DonationBundle {
  donationCode: string;          // random, not derived from any device value
  schemaVersion: number;
  events: readonly RedactedEvent[];
  meta: Partial<{ appVersion: string; packVersions: readonly string[]; deviceClass: DeviceClass }>;
}
```

### Edge cases
- Share cancelled: nothing leaves the device. The code isn't stored.
- Large log: compressed. If over the share target's limit, split into numbered parts.
- Tester moves to a public build: donation options disappear. The donation code stays visible in About.
- Deletion requested for an unknown code: answered that nothing is held under it.

### Acceptance criteria
- **AC-30.1** Donation options never appear in public builds (CI flag check).
- **AC-30.2** A bundle contains no free text, device identifiers or timezone names (property test over generated logs).
- **AC-30.3** A data type left out in consent is absent from the bundle (property test).
- **AC-30.4** The preview shows exactly what is sent (E2E comparing preview and bundle).
- **AC-30.5** Nothing is sent without a share-sheet action by the user (network audit, AC-29.1).
- **AC-30.6** Donation codes don't repeat across 1 million generations and aren't derived from device values (unit test).
- **AC-30.7** The feedback draft contains only app and pack versions unless diagnostics are attached (E2E).
- **AC-30.8** Donated logs replay through the sim harness and `replayMemory` without errors (pipeline test).

### Out of scope
Automatic upload, in-app surveys, a tester dashboard.

---

## FE31 Updates and release

**Milestone:** M5 · **Packages:** apps/web, apps/android, app-shell, ui ·
**Decisions:** D11, D100, D108, D135, D136, D137, D138, D140, D143, D163 ·
**Depends on:** FE01, FE02, FE03, FE29

### Purpose
Ship new versions safely to web and Android, never interrupt a round, and
keep every release within the store and privacy rules.

### Behaviour
1. **Versions:** semantic app version. The event schema version follows FE01.
   An app never writes events that an older supported app can't read (D11, D137).
2. **Two release streams (D138):** content packs at any time (FE02). App
   about every 4 weeks, with a staged rollout on Android.
3. **Web:**
   - The service worker precaches the app shell. A new version downloads in the background.
   - It activates on the next launch, or at a pause when no round is open (D163). Never mid-round.
   - One active tab (D100, D108). An inactive tab on an older version reloads
     before "Use here" can take over.
   - Deploys are atomic. The previous version stays on the host for rollback.
4. **Android:**
   - Play's automatic updates only. No in-app update prompt in MVP.
   - If a content pack needs a newer app (FE02), one line at the next pause
     links to the store listing. The app keeps working with the packs it has.
5. **Release checklist** (`docs/release/checklist.md`):
   - All CI gates green, including FE29 audits.
   - Tested on the D136 device set.
   - Store declarations re-checked (AC-29.5). Privacy notice diff reviewed; if changed, the FE24 notice line is enabled.
   - Store listing reviewed as suitable for children (Families policy).
   - First public release: external WCAG audit done (D140) and DPIA signed off (D143).
6. **Staged rollout (Android):** 10%, then 50%, then 100% (placeholders), at least 2 days per stage.
   - Halt if Play Console Android vitals show crash or ANR rates above the
     previous release, or testers report a blocking bug.
   - Android can't downgrade. Fixes go out as a new version code.

### Interfaces

```ts
export interface UpdateCoordinator {
  updateReady(): boolean;
  applyAtPause(): Promise<void>;   // no-op while a round is open
}

export function packNeedsNewerApp(pack: PackManifest, app: AppVersion): boolean;
```

### Edge cases
- Web update ready while offline: activates on the next launch from cache.
- Halted rollout: users on the new version keep it. The fix ships as the next version code.
- Pack needs a newer app and Play isn't available (sideloaded): the message shows once, then stays in About.

### Acceptance criteria
- **AC-31.1** A web update never activates during a round (E2E).
- **AC-31.2** An older inactive tab never writes events after a newer schema is active (E2E with two tabs).
- **AC-31.3** Each release's events read correctly in the previous supported version (compatibility test, FE01).
- **AC-31.4** The checklist is completed and stored for every public release (release audit, manual).
- **AC-31.5** The web app works offline after an update (E2E).
- **AC-31.6** A pack that needs a newer app leaves current content working and shows the update line once (E2E).

### Out of scope
In-app update prompts, iOS, app stores other than Google Play.

