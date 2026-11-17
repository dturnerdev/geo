# M3 — Learning engine (FE13, FE14, FE16–FE18)

**Status:** v1.1. Template as in `m0-foundations.md`. Acceptance criteria (AC)
become automated tests unless marked "(manual)".

## M3 setup tasks (not features)

| Task | Output |
|------|--------|
| ADR: FSRS-7 switch checks (FE13 item 11). Compare FSRS-6 and FSRS-7 (log loss, RMSE bins, AUC, same-day calibration) on tester logs and the sim harness (FE18). Re-run at each candidate library release | ADR |
| ADR: optimiser on Android. Does the single-thread binding (`binding-wasm32-wasip1`) run in a Capacitor WebView Worker within the Redmi A5's memory and time limits? Fallback: population defaults only | ADR |
| Population default parameters: FSRS-6 (live) and FSRS-7 (for the trial), fitted from the sim harness, then from tester logs | `content/tuning/memory.toml` |
| Content: start sequence (D39), facet prerequisite graph, item fame tiers, families, lookalike pairs with contrast cues, Meet facts and anchor lines with sources, mini-Meet lines, goal presets | Pack chunks, `content/goals/`, pipeline checks |
| FE04 metric functions completed against the real model | `engine/metrics/` |
| Swap FE08 and FE15 stand-ins for the real implementations | Type tests AC-08.9, AC-15.10 stay green |

---

## FE13 Memory model and scheduler

**Milestone:** M3 · **Packages:** engine (`memory/`), domain, app-shell ·
**Decisions:** D1, D16, D17, D53, D59, D62, D117, D134, D137, D149, D168 ·
**Depends on:** FE01, FE11, FE15

### Purpose
Predict recall for every item-facet from the user's answers, and say what's
due, deterministically and on the device.

### Behaviour
1. **Unit of memory:** the item-facet (`ItemFacetKey = itemId + facetId`, D16).
   Levels R1–R4 aren't separate memories. FE14 picks the level from stability.
2. **Model:** FSRS-6 at M3 (D59). FSRS-7 is the target (item 11).
   - `ts-fsrs` v6, exact pinned version. Both models sit behind `MemoryModel`.
   - The model version always comes from the adopted parameters (FE17). The
     library default is never used by accident.
   - Only the model maths is used: stability, difficulty, recall and next
     interval. Scheduling policy (learning steps, due order) is ours.
   - Fuzz off. Spread comes from the round builder, not random intervals.
   - Only `engine/memory/` imports `ts-fsrs` or the binding (import-boundary rule).
3. **Input:** every `AnswerRecorded` rating is a review, including surprise
   checks. "Show me" is Again (FE11). Ratings come from the grader only (D17).
4. **Days:** local days with the 04:00 boundary (D134), using each event's own `tz`.
   - FSRS-6 uses whole local days.
   - FSRS-7 uses fractional local days, measured against each day's real
     length, so clock-change days are handled.
5. **Learning steps** (D168, placeholders), for new item-facets and after a lapse:

   | Step | When it's due |
   |------|---------------|
   | 1 | Later in the same round, at least 3 questions on |
   | 2 | Next round |
   | 3 | Next local day. Then FSRS intervals take over |

   - Same-day answers update memory state. Under FSRS-6 they never count for calibration (FE04).
   - Under FSRS-7, steps 1 and 2 may be timed by predicted same-day recall
     instead. The FSRS-7 ADR decides. Step 3 stays.
6. **Desired retention** (placeholders in `tuning.ts`): core 0.90,
   curiosity 0.85, deep 0.80. Maximum interval 730 days.
7. **Due means a priority, not an appointment.** An item-facet is due when
   predicted recall drops below its desired retention. The builder decides
   when it's actually asked (FE15).
8. **Memory state is a projection.** It's rebuilt by replaying answers in
   (at, id) order with the currently adopted parameters and model version (FE17).
   - Normal play updates state one answer at a time from the snapshot (FE01).
   - Full replay happens after an import, a parameter or model change, or a snapshot mismatch.
   - One model version is used for the whole replay, never a mix.
   - Ratings and outcomes are never changed by a replay (D117). Only memory state is.
9. **Replaces the stand-ins:** `FsrsReviewSource` (FE15) and `FsrsRecallPredictor` (FE08).
10. **Retired items** (pack or perspective): kept in history, never due.
11. **Moving to FSRS-7 (target):**
    - **Why:** FSRS-6 can't use time elapsed within a day, so it can't
      realistically predict same-day recall. FSRS-7 can.
    - **Switch checks** (shadow evaluation, D62), all recorded in the ADR:
      1. On tester logs and the sim harness (FE18), FSRS-7's log loss, RMSE
         (bins) and AUC are no worse than FSRS-6 on multi-day answers.
      2. Same-day calibration RMSE (bins) is under 0.05 (placeholder).
      3. The sim harness finds no implausible intervals: no review interval
         above the maximum, and no established item-facet due again the same day.
      4. Pinned stable releases of `ts-fsrs` and the binding pass FSRS-7
         reference vectors on web and Android.
      5. FSRS-7 population defaults are fitted and shipped in the pack.
    - **Trial:** internal and closed builds first, as experiment E09 (FE03, 08 §9).
      Public builds stay on FSRS-6 until every check passes.
    - **Switch:** append `ParametersAdopted` with `modelVersion: 'FSRS-7'`
      and the population defaults (`reviewCount: 0`), then fully replay at
      the next pause. No new event type, no data migration.
    - **Rollback:** a later `ParametersAdopted` with FSRS-6, then full replay.
    - **After the switch:** FE04 gets a separate same-day calibration metric
      (spec change at that time). FE17 trains FSRS-7 from then on.

### Interfaces

```ts
export type ModelVersion = 'FSRS-6' | 'FSRS-7';

export interface MemoryState {
  stability: number;            // days
  stabilityFast: number | null; // FSRS-7 only
  difficulty: number;           // 1–10
  lastReviewAt: number;
  phase: 'learning' | 'review' | 'relearning';
  step: 0 | 1 | 2 | 3;
  reviews: number;
  lapses: number;
}

export interface MemoryModel {
  readonly modelVersion: ModelVersion;
  next(state: MemoryState | null, rating: Rating, at: number, tz: IanaZone): MemoryState;
  recall(state: MemoryState, at: number, tz: IanaZone): number;   // 0–1
  dueAt(state: MemoryState, retention: number): number;
}

export function createMemoryModel(params: MemoryParams): MemoryModel;  // params carry modelVersion

export function replayMemory(
  answers: Iterable<AnswerRecorded>, params: MemoryParams,
): ReadonlyMap<ItemFacetKey, MemoryState>;
```

### Edge cases
- Device clock wrong: monotonic `at` keeps the order. Elapsed days can't be negative.
- Travel: each answer uses its own `tz`. A long-haul flight can make a local
  day short or long. Elapsed days are never below 0.
- Months away: recall is low everywhere. FE14 picks the highest-value lapses
  first, and Refresh rounds handle it (FE15).
- Two answers for the same item-facet in one round (learning step 1): both
  update the state. The second uses the short-term update.
- Imported history: full replay of the merged log.
- History spans a model switch: the whole log is replayed with the current model.

### Acceptance criteria
- **AC-13.1** `MemoryModel` matches `ts-fsrs` reference vectors for FSRS-6 and FSRS-7 (unit test).
- **AC-13.2** The model version always comes from adopted parameters. No code path uses the library default (config test).
- **AC-13.3** Replay gives identical states on web and Android (reference replay).
- **AC-13.4** Predicted recall never rises between reviews (property test).
- **AC-13.5** Replay with new parameters or a new model version never changes any stored rating or outcome (property test).
- **AC-13.6** Full replay of 10,000 answers < 1 s on the Galaxy A07 4G, off the main thread.
- **AC-13.7** No package outside `engine/memory/` imports `ts-fsrs` or the binding (import-boundary rule).
- **AC-13.8** Sim harness (500 learners × 60 days): predicted vs actual recall
  RMSE (bins) under 0.05 (placeholder, CI gate 4).
- **AC-13.9** Swapping in the real predictor and review source needs no change in `atlas/` or `session/` (AC-08.9, AC-15.10).
- **AC-13.10** A replay never mixes model versions (property test).
- **AC-13.11** Public builds resolve to FSRS-6 until the FSRS-7 ADR is marked accepted (CI check).

### Out of scope
Cross-facet memory transfer, per-item difficulty seeded from other users.

---

## FE14 Item selection, unlocking and emphasis

**Milestone:** M3 · **Packages:** domain, engine (`selection/`), content, tools/content-pipeline, ui ·
**Decisions:** D18, D31, D39, D52, D55, D64, D66, D69, D81, D90, D104, D163, D166, D167, D168, D170, D171 ·
**Depends on:** FE07, FE13, FE15

### Purpose
Decide which new item-facets to introduce, which level to ask at and which
reviews matter most, and let users steer what and how much they learn,
without breaking the order learning needs.

### Behaviour
1. **Unlock order (D39, D66, D166):**
   - Start sequence: Earth layers → continents and oceans → reference lines →
     home country, its regions and their capitals (D66, D70) → world by fame.
   - Plates run as a parallel track once continents are established.
   - World items are in fame tiers (pipeline: population, size, prominence;
     D104). New items come from the lowest open tier, rotating continents so
     no single area dominates.
   - A tier opens when 70% of the previous tier's core item-facets are established (placeholder).
   - Hidden placement (FE22) can open tiers early.
2. **Facet prerequisites (D167):** a graph in the pack. Examples:

   | Facet | Needs |
   |-------|-------|
   | F04 Name it | F03 established |
   | F06 / F07 Flags | F03 established |
   | F08 Country → capital | F03 discovered |
   | F09 Capital → country | F08 established |
   | F11 Neighbours | F03 established for the item and 2 neighbours |
   | F12 Relative position | F03 established for both items |
   | F13a Feature location | F03 established for 2 related countries (placeholder; the Nile after Egypt and Sudan) |
   | F19 Subdivisions | Home country's F03 and F04 established |
   | F24 River course | F13a established |
   | Deep facets (D18) | All core facets of the item established |

   CI checks the graph has no cycles and that every facet is reachable.
3. **Core, curiosity and deep (D18, D31, D90):**
   - Core items unlock first and drive the daily budget.
   - Curiosity items fill free play and pauses only.
   - A curiosity item answered with "Show me" 3 times in a row (placeholder)
     is paused for 30 local days (placeholder). Core items are never paused.
4. **Level choice (D168, placeholders):**

   | Stability | Level |
   |-----------|-------|
   | < 2 days | R1 |
   | 2–7 days | R2 |
   | 7–30 days | R3 |
   | ≥ 30 days | R4 |

   - Never more than one level up per review.
   - After a lapse, one level down.
   - If no game exists at the chosen level, the nearest lower level is used.
5. **Review value:** `value = fame weight × emphasis weight × (desired retention − predicted recall)`.
   Overdue reviews are ordered by value, highest first.
6. **Backlog gate:** backlog is the number of core item-facets with recall
   0.10 below their target (placeholder). New items pause while backlog > 30
   (placeholder) or recent accuracy < 85% (FE15).
7. **New-item limit:** at most 20 new item-facets per local day (placeholder),
   never more than 1 new to 3 reviews in a round (FE15).
8. **Lookalikes (D52):** pairs come from the pipeline.
   - The second of a pair is introduced only after the first is established.
     Its Meet is followed by a contrast card (FE16).
   - Unestablished lookalikes are never in the same round. Once both are established, they're mixed on purpose.
9. **Round-type triggers** (FE15 builds the round):

   | Type | Trigger |
   |------|---------|
   | Claim | An item has 1 facet left before its next atlas layer (FE08) |
   | Theme run | A family (the -stans, Benelux) is next in unlock order and none of its members is met |
   | Journey | Session over 10 minutes (placeholder) and at least 4 established items linked by neighbours or rivers |

10. **Emphasis (D55):**
    - An entry has a target (continent, family, item or facet), weight,
      source, start and end.
    - Sources in the MVP:

      | Source | Created by | Active at once | Default length |
      |--------|------------|----------------|----------------|
      | `learner` | Settings (FE23), Explore place card (FE19) | 3 (placeholder) | 30 days (placeholder) |
      | `fork` | Interest forks (FE20, D81), Topics (FE19) | 2 | 30 days (placeholder) |
      | `goal` | Worked out from the goal setting (item 11), not stored | – | While the goal is set |

    - `learner` and `fork` entries: `EmphasisAdded { entryId, target, weight, source, start, until }`.
      `EmphasisEnded { entryId, reason }` when the user ends one, it expires, or
      every item-facet in it is established.
    - Default weight ×2 (placeholder). Where entries overlap, the strongest
      weight applies. Weights never add or multiply (D55).
    - Emphasis reorders within a priority level only (FE15). It never adds
      content or skips prerequisites.
11. **Goals (D64, D170):** presets in the pack (`content/goals/`), chosen in
    Settings and stored as `SettingChanged`. Each preset expands to `goal`
    emphasis entries. MVP presets:

    | Goal | Effect |
    |------|--------|
    | All-round (default) | No entries |
    | Countries and capitals | F03–F09 weighted up |
    | Physical world | F13–F17 and F24 weighted up |
    | Travel | F10, F12 and cities weighted up |

    Goals change weights only. They never lock a facet out. No deadlines (D64 deadline mode stays post-MVP).
12. **Daily budget (D69, D171):** minutes of active practice (FE04 definition).
    Options 5, 10, 15 or 20. Default 10 (placeholder). Stored as `SettingChanged`.
    - After it's met, rounds shift to free play (FE15). New core items stay gated.
    - Never shown as a target, countdown or "done" (D69).
13. **When changes apply:** emphasis, goal and budget changes apply at the next pause (D163).

### Interfaces

```ts
export function newItemCandidates(
  state: LearnerState, view: ContentView, limits: NewItemLimits,
): readonly ItemFacetKey[];   // implements NewItemSource

export function chooseLevel(memory: MemoryState | null, previous: Level | null): Level;

export function reviewValue(key: ItemFacetKey, recall: number, weights: SelectionWeights): number;

export function roundTypeTriggers(
  state: LearnerState, view: ContentView, session: SessionSignals,
): readonly RoundType[];

export type EmphasisTarget =
  | { kind: 'continent'; id: ContinentId } | { kind: 'family'; id: FamilyId }
  | { kind: 'item'; id: ItemId } | { kind: 'facet'; id: FacetId };

export type EmphasisSource = 'learner' | 'fork' | 'goal';

export interface EmphasisEntry {
  id: EmphasisId;
  target: EmphasisTarget;
  weight: number;
  source: EmphasisSource;
  start: number;
  until: number | null;   // null for goal entries
}

export function goalEntries(goal: GoalId, view: ContentView): readonly EmphasisEntry[];

export function activeEmphasis(
  stored: readonly EmphasisEntry[], goal: GoalId, view: ContentView, now: number,
): readonly EmphasisEntry[];   // feeds RoundInput.emphasis (FE15)

export function selectionWeights(entries: readonly EmphasisEntry[]): SelectionWeights;  // strongest wins

export function dailyBudgetMet(state: LearnerState, now: number, budgetMinutes: number): boolean;
```

### Edge cases
- Every item in a tier is a lookalike of another unestablished item: one of each pair is held back.
- Perspective change: items that aren't in the new perspective leave
  selection, and tiers are recounted (FE07).
- Small continent (Oceania): rotation skips it once its open tier is exhausted.
- All core items established: new items come from curiosity and deeper facets only.
- Emphasis on items whose prerequisites aren't met: prerequisites are
  weighted up first. Order is never skipped.
- Emphasis on a region with no items in the active perspective: not offered.
- Imported emphasis entries: kept. Per-source caps apply to the merged set, newest first.

### Acceptance criteria
- **AC-14.1** No item-facet is introduced before its prerequisites are met (property test).
- **AC-14.2** The prerequisite graph is acyclic and every facet is reachable (CI content check).
- **AC-14.3** No new items while the backlog gate is closed (property test).
- **AC-14.4** Level never rises more than one step per review (property test).
- **AC-14.5** Unestablished lookalikes never appear in the same round (property test).
- **AC-14.6** Curiosity items never count towards the daily budget.
- **AC-14.7** Sim harness: a simulated learner at 10 minutes a day reaches a
  tier-1 durable knowledge target within 60 days (placeholder, CI gate 4).
- **AC-14.8** Emphasis and goal weights never move an item across priority levels (property test, with AC-15.5).
- **AC-14.9** Overlapping entries apply the strongest weight only. Weights never add or multiply (property test).
- **AC-14.10** Emphasis ends automatically on expiry or when fully established (unit test).
- **AC-14.11** No goal ever removes a facet from selection (property test).
- **AC-14.12** No screen shows the daily budget as a target or countdown (screenshot review, string lint).
- **AC-14.13** Emphasis, goal and budget changes apply at the next pause, never mid-round (E2E).
- **AC-14.14** The second of a lookalike pair is never introduced before the first is established (property test).
- **AC-14.15** Core items are never paused. Curiosity pauses end after their set time (property test).
- **AC-14.16** The start sequence (D39) is followed for a new user with no placement credit (property test).

### Out of scope
Teacher-set goals, deadline mode, topicality, calendar-based trip planning,
class-set content (post-MVP).

---

## FE16 Meet and contrast cards

**Milestone:** M3 · **Packages:** engine, ui, globe, audio, content ·
**Decisions:** D51, D52, D57, D121, D127, D129, D158, D166 ·
**Depends on:** FE06, FE12, FE14

### Purpose
Introduce each new item briefly before it's asked, and help untangle places
the user keeps confusing.

### Behaviour
1. **Meet card,** shown the first time an item appears (D51, D166):
   - Location and name only: the globe flies from a known place to the item
     and highlights it. Name, one anchor line ("between Russia and China")
     and one memorable fact, with a voice clip and caption (D57).
   - `ItemMet` is appended when the card is shown.
   - It's not a question and isn't graded. The R1 question follows straight after.
   - Tap to continue. It never auto-advances with "No time pressure" on (D158).
   - The item's own label is shown on the Meet card only (D121 exception).
   - Exception: placement probes and placed items (FE22) have no Meet card.
2. **Mini-Meet (D51):** when a later facet of a met item unlocks (capital,
   flag, neighbours), one short line for that facet is shown before its first
   question. Worked out from the log; no `ItemMet`.
3. **Family Meet card:** a Theme run opens with one card for the family
   (all members highlighted, one shared fact), then a Meet card per member.
4. **Confusion:** an answer is a confusion when the wrong response is a
   lookalike of the target (Niger for Nigeria, Chad for Romania).
5. **Contrast card:**
   - Shown straight after the Meet of the second item in a lookalike pair (D52).
   - Also shown after the feedback for the second confusion of the same pair (placeholder).
   - Side by side: both items on the map, plus pipeline contrast cues.
   - Cues never rely on colour alone (D127). Flag cues include colour names (D129).
   - At most 1 per round. A lookalike introduction takes priority.
   - The pair is then asked together once in the next round.
6. **No new event type:** confusions, mini-Meets and contrast cards are worked
   out from `AnswerRecorded` and `ItemMet`, so replays show the same cards.
7. **Content:** every core item has a Meet fact and anchor line with a source,
   and a mini-Meet line per MVP facet. Every lookalike pair has contrast cues.
   The pipeline blocks the pack if not.

### Interfaces

```ts
export function confusionOf(answer: AnswerRecorded, view: ContentView): ConfusionPair | null;

export function contrastDue(history: Iterable<AnswerRecorded>, pair: ConfusionPair): boolean;

export function miniMeetDue(history: LearnerHistory, key: ItemFacetKey): boolean;

export interface MeetCard { item: ItemId; anchor: SourcedFact; fact: SourcedFact; voice: ItemId | null }
export interface MiniMeet { key: ItemFacetKey; line: SourcedFact }
export interface ContrastCard { pair: ConfusionPair; cues: readonly ContrastCue[] }
```

### Edge cases
- Item met on another device (import): no Meet card again.
- Item has no voice clip: the card shows without audio.
- A confusion with a non-lookalike: no contrast card. The pipeline review
  list records it for possible new lookalike pairs (tester summary counts only).
- A round already has a contrast card: the next one waits for a later round.
- No known place to fly from (first Meet ever): the globe starts from its default view.

### Acceptance criteria
- **AC-16.1** Every item gets exactly one Meet card, before its first question, except placement probes and placed items (FE22) (property test).
- **AC-16.2** Meet cards never auto-advance with "No time pressure" on (E2E).
- **AC-16.3** At most 1 contrast card per round (property test).
- **AC-16.4** Contrast cards pass the colour-blind simulations and include non-colour cues (screenshots).
- **AC-16.5** The pipeline rejects a core item without a sourced Meet fact and anchor line, a missing mini-Meet line, or a lookalike pair without cues.
- **AC-16.6** Replaying a log shows the same contrast cards and mini-Meets at the same points (reference replay).
- **AC-16.7** Meet, mini-Meet and contrast cards pass axe-core and work through the keyboard alone.
- **AC-16.8** Every later facet of a met item gets one mini-Meet before its first question (property test).
- **AC-16.9** The second item of a lookalike pair always gets a contrast card straight after its Meet (property test).

### Out of scope
User-written notes, AI-generated facts in the app.

---

## FE17 Parameter optimiser

**Milestone:** M3 · **Packages:** engine (`memory/`), app-shell, apps/web, apps/android, ui (developer panel) ·
**Decisions:** D60, D61, D62, D117, D137, D149, D163, D164, D169 ·
**Depends on:** FE01, FE13

### Purpose
Fit memory model parameters to each user's own answers on the device, and
adopt them only when they predict better.

### Behaviour
1. **Defaults:** population parameters ship in the content pack. They apply
   until the user has their own. A pack update changes defaults only for users without adopted parameters.
   One parameter set per user (D60).
2. **Engine:** `@open-spaced-repetition/binding-wasm32-wasip1` (single-thread WASI),
   exact pinned version, in a dedicated Worker.
   - Needs no COOP/COEP headers. The threaded build is deprecated and never used.
   - Training runs synchronously inside the Worker, which stays busy for the whole run.
   - It trains the model version currently adopted: FSRS-6, then FSRS-7 after the switch (FE13).
   - `engine/memory/` builds the training items from events, using each
     answer's own `tz`, the 04:00 boundary and same-day answers (short-term on).
   - Recency weighting (D61) is switched on once the pinned binding supports it (ADR).
   - Android: per ADR. If unsupported, Android uses the population defaults only.
3. **Trigger check** (D169) at a pause, at most once per session:
   - First run: at least 1,000 reviews over at least 30 local days (placeholders).
   - Re-run: 500 more reviews or 30 days since the last run (placeholders).
4. **Run:** in the background Worker. Never blocks a round.
   - Cancelled by terminating the Worker if the app goes to the background
     or memory runs low. Retried at a later trigger.
5. **Adoption rule (D169):**
   - Candidate vs current, time-series split log loss, same-day answers excluded under FSRS-6.
   - Adopt only if log loss improves by at least 1% (placeholder).
   - Append `ParametersAdopted { modelVersion, params, reviewCount, logLossBefore, logLossAfter }`.
   - Full memory replay (FE13) at the next pause (D163).
   - Model switches are not parameter adoptions. They follow FE13 item 11 (D62).
6. **Determinism:** training may differ slightly by platform. Replays always
   use the stored parameters, never retrain.
7. **Import (D164):** the most recent `ParametersAdopted` applies. Re-runs at the next trigger check.
8. **Developer panel (S22):** current parameters, model version and source,
   log loss, last run, and a "run now" button (internal builds only).

### Interfaces

```ts
export interface Optimiser {
  readonly available: boolean;   // false where the ADR rules it out
  shouldRun(state: LearnerState, now: number): boolean;
  run(answers: readonly AnswerRecorded[], current: MemoryParams, signal: AbortSignal):
    Promise<Result<OptimiserResult, OptimiserError>>;   // abort terminates the Worker
}

export type OptimiserError =
  | { kind: 'not-enough-data' } | { kind: 'cancelled' } | { kind: 'failed'; reason: string };
```

### Edge cases
- Candidate is worse: nothing is adopted. Logged to diagnostics.
- Parameters outside safe bounds: clipped by the library, then evaluated as normal.
- App closed mid-run: nothing is adopted. Runs again at the next trigger.
- Merged logs from two devices with different parameters: the latest adoption wins until the next run.
- Model switched (FE13) during a run: the result is thrown away, because it was trained for the old model.

### Acceptance criteria
- **AC-17.1** No run before the first-run threshold (unit test).
- **AC-17.2** Parameters are adopted only when log loss improves by the threshold (unit test with fixtures).
- **AC-17.3** Adoption applies at the next pause, never mid-round (E2E).
- **AC-17.4** Replaying a log with stored parameters gives identical states on web and Android, whatever the training platform (reference replay).
- **AC-17.5** A run never drops below 30 fps on the Galaxy A07 4G during a round (performance test).
- **AC-17.6** The threaded binding isn't in any bundle, and the web app needs no COOP/COEP headers (CI bundle check).
- **AC-17.7** With `available` false, the app uses pack defaults and nothing errors.
- **AC-17.8** Sending the app to the background stops a run within 1 s and adopts nothing (E2E).

### Out of scope
Server-side training, sharing parameters between users.

---

## FE18 Simulation harness

**Milestone:** M3 (smoke run from M2, AC-15.11) · **Packages:** tools/sim-harness, CI ·
**Decisions:** D22, D104, D149, D150 ·
**Depends on:** FE01, FE04, FE11, FE13, FE14, FE15

### Purpose
Run the real engine against thousands of simulated learners, offline and
deterministically, to tune every placeholder, catch rule breaks and test
experiments before real users see them.

### Behaviour
1. **Real engine only:** the harness drives the production `engine/`
   packages (graders, memory, selection, session builder, metrics) through
   their public interfaces. No copies or forks. UI, globe and audio aren't simulated.
2. **Virtual world:**
   - An in-memory event store implementing the FE01 store interface. Every
     simulated event is a valid FE01 event.
   - A virtual clock. Each learner has a time zone, including clock changes and travel.
3. **Simulated learners:**
   - **True memory:** each learner and item-facet has a hidden memory from a
     model that is not the engine's own (a power-law forgetting model with
     per-learner and per-item noise; family set in config). The engine's FSRS
     is never used as truth, so tests can't just confirm themselves.
   - **Item difficulty** from fame tier and lookalike links (D104). Wrong
     answers favour lookalikes and neighbours.
   - **Prior knowledge** by profile (item 4).
   - **Responses:** raw responses per primitive (tap on the target, a
     lookalike, a neighbour or a random place; typed names with or without
     typos; placed points with error scaled by recall strength), graded by
     the real FE11 graders. Response time from a per-learner distribution,
     slower when recall is weak.
   - **Behaviour:** practice days and session lengths per profile, quitting
     mid-round, "Show me", aids switched on.
4. **Reference population** (shares are placeholders; replaced by tester-log
   fits under item 11):

   | Profile | Pattern | Share |
   |---------|---------|-------|
   | Daily short | 5 minutes a day, 6 days a week | 20% |
   | Daily standard | 10 minutes a day | 25% |
   | Binge | 45-minute sessions, 2 days a week | 10% |
   | Sporadic | 1–3 random days a week, 1–10 minutes | 20% |
   | Returner | 30 days active, 90 days away, then back | 10% |
   | Expert | Knows tiers 1–3 on some continents already | 5% |
   | Accessibility | "No time pressure" and spelling support on | 5% |
   | Traveller | Changes time zone weekly, including clock changes | 5% |

5. **Runs:**

   | Run | Size | When | Result |
   |-----|------|------|--------|
   | Smoke | 500 learners × 60 days | Every PR touching `engine/`, `content/tuning/` or `tuning.ts` | CI gate 4 |
   | Full | 5,000 learners × 365 days (placeholder) | Nightly and before every release | Report, regressions flagged |
   | Sweep | Per sweep file | On demand | Report and proposed values |
   | Replay | Donated tester logs | On demand | Report only |

6. **Invariants**, checked on every answer and round. Any violation fails the
   run and prints the seed and learner index to reproduce it:
   - Rounds: AC-15.2 to AC-15.5.
   - Selection: AC-14.1, AC-14.3 to AC-14.5, AC-14.6, AC-14.14.
   - Memory: AC-13.4, AC-13.10, no interval above the maximum.
   - Cards: AC-16.1, AC-16.3.
7. **Metrics:** every FE04 metric, worked out twice: from the engine's
   predictions and from true memory. Plus interval distribution, new items per
   day, backlog, and time to first established item. True memory lets the
   report check predicted recall against actual recall, which real logs can't.
8. **Tuning sweeps:**
   - A sweep file lists placeholders and their allowed ranges.
   - Each candidate runs on the reference population. The report ranks them
     and proposes a `tuning.ts` diff.
   - A candidate is preferred only if it beats the current values on the north
     star (D149) without worse calibration or any invariant violation.
   - The harness never writes `tuning.ts`. A person opens the PR.
9. **Experiments (D150):** every experiment's variants run through the
   harness before going live. The report is attached to its pre-registration
   file in `experiments/`.
10. **Population defaults:** first FSRS defaults are fitted from simulated
    logs with the FE17 binding (run in Node). Replaced by tester-log fits once
    enough logs are donated (D22: shipped as data).
11. **Calibration from tester logs:** donated logs are used to fit profile
    settings (practice patterns, error rates) so the simulated population
    resembles real testers. Only fitted aggregate values go in the repo, never logs.
12. **Determinism:** one seed gives an identical report and event logs on any
    CI machine. Each learner's seed comes from the run seed and learner index,
    so results don't depend on the number of worker threads.

### Interfaces

```ts
export interface SimConfig {
  seed: number;
  population: readonly ProfileShare[];
  days: number;
  truth: TruthModelId;
  tuning: TuningOverrides;
  flags: FlagSnapshot;
  pack: PackRef;
}

export interface SimLearner {
  readonly profile: ProfileId;
  readonly seed: number;
  nextSession(now: number): SessionPlan | null;
  respond(question: Question, now: number): SimResponse;   // raw response + response time
}

export interface SimReport {
  seed: number;
  engineVersion: string;
  packVersion: string;
  metrics: { predicted: MetricsSummary; truth: MetricsSummary };
  distributions: SimDistributions;
  violations: readonly InvariantViolation[];
}

export function runSimulation(config: SimConfig): Promise<SimReport>;
export function runSweep(sweep: SweepFile): Promise<SweepReport>;
```

### Edge cases
- The engine throws: recorded as a violation with seed and learner index.
- Smoke run over its time budget: CI fails with a timing report.
- A sweep value outside its allowed range: the sweep is rejected before it runs.
- Pack changes between runs: reports record the pack version. Runs are only compared on the same pack.

### Acceptance criteria
- **AC-18.1** The same seed, pack and engine give identical reports and event logs, whatever the thread count (CI runs twice and compares).
- **AC-18.2** `tools/sim-harness` uses only public engine entry points, and no engine code is copied (import-boundary rule, duplication check).
- **AC-18.3** The smoke run finishes within 10 minutes on the CI runner (placeholder).
- **AC-18.4** Any invariant violation fails CI gate 4 and prints a one-line reproduce command.
- **AC-18.5** The truth model is never the engine's memory model (config test).
- **AC-18.6** Simulated event logs pass FE01 import validation (round-trip test).
- **AC-18.7** Sweeps never write `tuning.ts` (test checks the file is unchanged).
- **AC-18.8** The reference population includes clock-change and travel learners, and their replays match on web and Android engines (reference replay).
- **AC-18.9** Every report includes each FE04 metric, both predicted and true.
- **AC-18.10** Profile shares in `SimConfig` sum to 100%, and a 5,000-learner run matches each share to within 1 learner of its rounded count (unit test).

### Out of scope
Simulating UI or rendering, machine-learned learner models, publishing
results outside the repo.

