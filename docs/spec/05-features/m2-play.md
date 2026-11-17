# M2 — Play (FE10–FE12, FE15)

**Status:** v1.0. Template as in `m0-foundations.md`. Acceptance criteria (AC)
become automated tests unless marked "(manual)".

## M2 setup tasks (not features)

| Task | Output |
|------|--------|
| Game definition schema and the MVP game catalogue in the pack | `content/games/*.toml` |
| Stand-in `ReviewSource` and `NewItemSource` for FE15 until M3 | `engine/stand-ins/` |
| Haptic patterns tuned on the reference devices (06 §13) | Values in `tuning.ts`, ADR note |
| Placeholder sound set, licence-tagged, internal builds only (D89) | `content/audio/test/` |
| Simulation harness: first run of the round builder against simulated learners | `tools/sim-harness` report |

---

## FE10 Game framework and primitives

**Milestone:** M2 · **Packages:** domain, engine, ui, globe, content ·
**Decisions:** D23, D27, D36, D37, D41, D44, D49, D52, D77, D124, D126,
D127, D128, D129, D154, D159 ·
**Depends on:** FE06, FE07

### Purpose
Build each of the nine interactions (P1–P9) once, and define every game as a
small config on top of them, so games can be added or retired without
touching the scheduler.

### Behaviour
1. **Primitives:**

   | ID | Primitive | Answer type | Default load |
   |----|-----------|-------------|--------------|
   | P1 | Tap region(s) on the map | Region or set of regions | 1 |
   | P2 | Place a point | Point | 2 |
   | P3 | Pick from options / yes-no | Choice | 1 |
   | P4 | Type the answer | Text | 2 |
   | P5 | Drag and place | Assignment (item → slot) | 2 |
   | P6 | Put in order | Sequence | 2 |
   | P7 | Chain | Sequence through relationships (D44) | 3 |
   | P8 | Aim a beam | Bearing (degrees) | 2 |
   | P9 | Draw a path | Path (ordered points) | 3 |

   Load values are defaults (placeholders). A game may override them.
2. **A game is config only** (`content/games/*.toml`), with:
   - ID, name, primitive, facet, level (R1–R4)
   - Channels: any of `visual`, `audio`, `spatial`, `typed`
   - Load, required assets, grader ID, generator ID
   - An optional feature flag. Experimental games (Cartographer, Flag Forge,
     Connect) ship behind flags that are off by default.
   - Adding or retiring a game never changes the scheduler or session builder (D23).
3. **MVP game grid** (facet × level):

   | Facet | R1 | R2 | R3 | R4 |
   |-------|----|----|----|----|
   | F01 Continent/ocean | Flashpoint | Hot/Cold | Blind Drop | Snap |
   | F02 Region membership | Which Continent? | Continental Drift (few) | Continental Drift (full) | – |
   | F03 Find it | Flashpoint | Hot/Cold | Blind Drop | Snap |
   | F04 Name it | Pairs | Letter Reveal | Quickfire | The Between |
   | F05 Shape | Shadow | Through the Fog | Outline → type (distance and direction feedback) | Cartographer* |
   | F06 Flag → country | Flag Flash | Flag + continent hint | Flag → type | Banner Families |
   | F07 Country → flag | Flag Flash (reverse) | Missing Stripe | Spot the Fake | Flag Forge* |
   | F08 Country → capital | Seat of Power | Capital Gaps | Capital Quickfire | – |
   | F09 Capital → country | Seat of Power (reverse) | Letter Reveal | Capital Hunt | – |
   | F10 City location | Flashpoint (dots) | Hot/Cold (zoomed) | Drop the Pin (country outlined) | Drop the Pin (blank) |
   | F11 Neighbours | True Borders | One Neighbour | Surround | Pathfinder |
   | F12 Relative position | Compass pick | Bearing, wide beam | Bearing, narrow beam | Bearing + distance guess |
   | F13a Feature → map | Flashpoint | Hot/Cold | Blind Drop | – |
   | F13b Map → feature name | Pairs | Letter Reveal | Quickfire | – |
   | F14 Flow | Pick the right arrow | Turn the arrow | Draw it (route shown) | Draw it (blank map) |
   | F15 Earth layers | Pairs | Rank It | Label the cross-section (P5, D154) | – |
   | F16 Plates and boundaries | Flashpoint (plates) | True/False: boundary → landform | Trace the boundary | Connect* |
   | F17 Reference lines | Flashpoint (lines) | Hot/Cold by latitude | Coordinates | Rank It by latitude |
   | F19 Regions (UK, US) | Flashpoint | Letter Reveal | Quickfire | – |
   | F24 River course | True/False: "Does it flow through X?" | Order the countries | Downstream: next country or city | Downstream, source to mouth |

   \* Experimental, behind a flag, off by default.

4. **Question generation:**
   - `generate(item, facet, level, view, seed)` is pure and deterministic.
   - Wrong options come from the lookalike list first (D52, D127), then
     nearby or related items, always from the active `ContentView` (FE07).
   - Generated exercises (Coordinates, Compass pick) are built from geometry
     at generation time. Compass pick uses only pairs where the great-circle
     and compass sectors agree (D126).
   - Labels for the item in question are hidden (D121).
5. **Every answer type exists in the domain now** (D41), even where no MVP
   content uses it: region, set, point, choice, text, assignment, sequence,
   bearing, path, multi-value with roles, date range, comparison and audio.
   Each has a schema and a test.
6. **Hints:** each primitive declares its hints, for example a letter
   revealed, a continent outline or a wider beam. Using a hint caps the
   rating at Hard (FE11). "Show me" is always available and is not a hint (D53).
7. **Accessibility aids** (D128). These never lower a rating:

   | Aid | Applies to | What it does |
   |-----|------------|--------------|
   | List alternative | P1, P2, P9 and map-based P5 | Searchable list of candidate places, graded as the equivalent map answer |
   | Keyboard crosshair | P1, P2, P8 | `Enter` answers at the crosshair (FE06) |
   | Tap-tap | P5, P6 | Select, then select the target. Move up/down buttons for P6 |
   | Colour names | Flag questions (F06, F07) | Lists each flag's colours in words (D129) |
   | Bearing by number | P8 | Type or step a compass bearing |
   | Path by steps | P9 | Pick the next point or direction from options |

8. **Bearing (P8):**
   - The beam is drawn as a great-circle arc. Beam width is the difficulty (D37).
   - The distance counter ticks up and pops on landing. It isn't graded (D36).
   - One graded first shot, one correction shot, then the answer is shown (D27).
9. **Chain (P7):** one mechanic for Pathfinder and Downstream (D44). The
   shortest route is par. Bridges and tunnels count as links.
10. **No visible timers** (D77). Response time is recorded, never shown.
11. **Feedback rendering** follows 06 §6. Results are announced in a polite live region.

### Interfaces

```ts
export type PrimitiveId = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8' | 'P9';
export type Level = 'R1' | 'R2' | 'R3' | 'R4';
export type Channel = 'visual' | 'audio' | 'spatial' | 'typed';

export interface GameDefinition {
  id: GameId;
  primitive: PrimitiveId;
  facet: FacetId;
  level: Level;
  channels: readonly Channel[];
  load: 1 | 2 | 3;
  assets: readonly AssetKind[];
  grader: GraderId;
  generator: GeneratorId;
  flag: FeatureFlagId | null;
}

export function generateQuestion(
  game: GameDefinition, item: ItemId, view: ContentView, seed: number,
): Result<Question, GenerateError>;

export type RawResponse =
  | { kind: 'region'; at: LngLat | null; itemIds: readonly ItemId[] }
  | { kind: 'point'; at: LngLat }
  | { kind: 'choice'; optionId: string }
  | { kind: 'text'; value: string }
  | { kind: 'assignment'; pairs: readonly [string, string][] }
  | { kind: 'sequence'; ids: readonly string[] }
  | { kind: 'bearing'; degrees: number; shot: 1 | 2 }
  | { kind: 'path'; points: readonly LngLat[] }
  | { kind: 'showMe' };
```

The React component for each primitive receives a `Question` and returns a
`RawResponse`. It never grades.

### Edge cases
- Too few lookalikes or related items for a full set of options: fill from
  the same continent, then the same kind. If there still aren't enough,
  generation fails and the builder picks another game.
- An item with no flag, capital or neighbours: games for that facet are never eligible.
- Islands with no land neighbours: Surround and Pathfinder are never
  generated. Bridges and tunnels count as links where they exist.
- Flag questions with near-identical flags (Chad and Romania): allowed (D127).
  Contrast cards use non-colour cues.
- Answering on the flat map near the edge: arcs and beams split cleanly (FE06).

### Acceptance criteria
- **AC-10.1** Every game in the catalogue validates against the schema and
  names an existing primitive, facet, grader and generator (CI content check).
- **AC-10.2** `generateQuestion` gives identical output for the same inputs
  on web and Android (reference replay).
- **AC-10.3** No generated question shows the label of its own item (property test).
- **AC-10.4** Compass pick never uses a pair where the sectors disagree (property test, D126).
- **AC-10.5** Every map-based game can be completed by keyboard alone and by
  screen reader through the list alternative (Playwright + axe-core, manual screen-reader pass).
- **AC-10.6** Every answer type in item 5 has a schema test, even without MVP content.
- **AC-10.7** Experimental games never appear unless their flag is on.
- **AC-10.8** Adding a test game to the pack makes it eligible with no code change in the engine.
- **AC-10.9** No timer is visible in any game (screenshot review, manual).

### Out of scope
Speech input (P10), Blitz (FE26), Journey and Theme run content (M3–M4), the
3D cross-section (PK12).

---

## FE11 Grading

**Milestone:** M2 · **Packages:** engine (`grading/`, `geo/`), domain ·
**Decisions:** D17, D27, D37, D53, D56, D58, D77, D115, D117, D118, D128 ·
**Depends on:** FE10

### Purpose
Turn every raw response into a rating and an outcome using fixed,
explainable rules, the same on every platform.

### Behaviour
1. **Graders are pure functions,** one per primitive, with game-level settings.
   - Each grader has a version number. The versions in use are stored in the
     event's context (FE01).
   - No self-rating and no AI (D17).
2. **Output:**
   - A rating (`again`, `hard`, `good`, `easy`) for the scheduler.
   - An outcome (`correct`, `close`, `incorrect`, `shown`) for feedback (06 §6).
   - The geometry used (distances, angles, inside/outside), stored in the
     event and never recomputed (D117).
3. **Rules per primitive** (all thresholds are placeholders in `tuning.ts`):

   | Primitive | Again | Hard | Good | Easy |
   |-----------|-------|------|------|------|
   | Tap / pick (P1, P3) | Wrong | Hint used | Correct | Correct and fast (R3/R4 only) |
   | Place a point (P2) | Outside 2× tolerance | Within 2× tolerance | Within tolerance | Within half tolerance and fast |
   | Type (P4) | Wrong, or matches another real place | Near-miss, or hint used | Exact match | Exact and fast |
   | Set (P1 Surround) | Under 70% found | 70–99% found | All found | All found, fast, no wrong taps |
   | Drag (P5) | More than 1 wrong | 1 wrong | All correct | All correct and fast |
   | Order (P6) | More than 1 out of place | 1 swap | Perfect | Perfect and fast |
   | Chain (P7) | Gave up | Over par | Par | Under par or perfect |
   | Aim (P8) | Miss beyond the near-miss angle | Near miss | Beam hit | Narrow-beam hit, first shot |
   | Draw (P9) | Wrong direction or route | Right direction, route off tolerance | Within tolerance | Within half tolerance and fast |

4. **Outcome mapping:** Good and Easy → `correct`. Hard → `close`, except
   when Hard comes only from a hint, which is `correct`. Again → `incorrect`.
   "Show me" → rating Again, outcome `shown`, always neutral on screen (D53).
5. **Taps** are graded against pipeline tap zones in `LngLat`, never against
   what the renderer drew (D118). Small items have enlarged zones.
6. **Distance tolerance (placeholders):** sphere maths with R = 6,371.0088 km (D115).
   - Point items (cities, peaks): 75 km.
   - Area items: distance from the nearest tap-zone edge (inside is 0).
     Tolerance is the larger of 25 km and 25% of √(area/π). Malta 25 km,
     France about 105 km, Russia about 580 km.
   - Line items (rivers, reference lines, boundaries): 50 km from the line.
   - Draw (P9): mean distance from the route, within the larger of 50 km and
     5% of the route length.
7. **Typing (D56):**
   - Matching ignores case, accents, punctuation and accepted alternative names.
   - A near-miss (within the typing tolerance below, or a sound-alike) is
     accepted, capped at Hard, and the correct spelling is shown quietly.
   - **Typing tolerance (placeholders):**
     - Normalise both strings first: ignore case, accents, punctuation, spaces
       and a leading "The".
     - Count typos as edit distance, where swapping two adjacent letters counts as 1.
     - Typos allowed, by the length of the target name: 1–4 letters 0,
       5–8 letters 1, 9 or more 2. Spelling support adds 1 at each length.
     - If the answer is as close or closer to another valid name for the same
       facet, it isn't accepted. The feedback shows both names.
   - **Guard:** if the text matches another real place in the active
     `ContentView` (Niger/Nigeria, Austria/Australia, Iran/Iraq), it's Again.
   - **Spelling support** (setting): a near-miss counts as Good, not Hard.
     The guard still applies.
8. **Bearing (D27, placeholders):**
   - Only the first shot is rated. The correction shot gives feedback but
     doesn't change the rating.
   - Correct if the answer is within the beam either side of the exact bearing.
   - The beam is the larger of a fixed angle (R1–R2 20°, R3 15°, R4 10°) and
     half the target's width seen from the start point.
   - Up to 15° beyond the beam edge counts as a near miss.
9. **"Fast":**
   - Measured against the user's own median response time for that game and
     input method (touch, keyboard, screen reader, list alternative), over the
     last 20 answers (placeholder).
   - With fewer than 5 samples (placeholder), Easy isn't available and Good is the top rating.
   - Never a fixed time limit. Blitz never affects grading (D77).
10. **Aids never lower a rating** (D128): list alternative, keyboard crosshair,
    tap-tap, colour names, bearing by number, spelling support and no time
    pressure. Hints are not aids.
11. **Surprise checks** are graded the same way. Only the event's flag differs.

### Interfaces

```ts
export type Rating = 'again' | 'hard' | 'good' | 'easy';
export type Outcome = 'correct' | 'close' | 'incorrect' | 'shown';
export type InputMethod = 'touch' | 'keyboard' | 'screenReader' | 'list';

export interface GradeInput {
  question: Question;
  response: RawResponse;
  responseMs: number;
  hintsUsed: number;
  aidsUsed: readonly AidId[];
  inputMethod: InputMethod;
  speedBaseline: SpeedBaseline | null;
  settings: { spellingSupport: boolean };
  view: ContentView;
}

export interface GradeResult {
  rating: Rating;
  outcome: Outcome;
  geometry: StoredGeometry;   // D117
  reasons: readonly GradeReason[];   // explainable, shown in the developer panel
  graderVersion: number;
}

export function grade(input: GradeInput): GradeResult;
```

### Edge cases
- Tap in space or off the map: no answer. The question stays open.
- Tap on a shared border: the pipeline's tap zones decide. The result is deterministic.
- Typed answer that matches the right place in the other locale ("Côte
  d'Ivoire" and "Ivory Coast"): accepted, because both are alternative names.
- A place with a name inside another name ("Niger" typed for Nigeria): Again, by the guard.
- Response time over 10 minutes (left open): never Easy. Capped at 60 s for metrics (FE04).
- Changed grader rules: a new version applies only to new answers. Old events keep their stored rating.

### Acceptance criteria
- **AC-11.1** Golden fixtures for every primitive produce the expected
  rating and outcome on web and Android (reference replay).
- **AC-11.2** "Show me" is always Again with outcome `shown` (property test).
- **AC-11.3** Turning on any aid never gives a lower rating for the same response (property test, D128).
- **AC-11.4** A near-miss is never above Hard without spelling support, and
  never above Good with it (property test).
- **AC-11.5** The guard list (Niger/Nigeria, Austria/Australia, Iran/Iraq,
  and the full pipeline-generated list) is always Again.
- **AC-11.6** Bearing correction shots never change the rating.
- **AC-11.7** Easy is never given without a speed baseline (unit test).
- **AC-11.8** The same tap gives the same result on the globe and the flat map (property test with FE06).
- **AC-11.9** `grade` p95 < 5 ms on the Galaxy A07 4G (placeholder).
- **AC-11.10** Every event stores its geometry and grader version. Replays never call geometry functions (spy test).
- **AC-11.11** "Slovakia" is never accepted for Slovenia, or the other way round, with spelling support on or off (unit test).
- **AC-11.12** "Nigera" is accepted for neither Niger nor Nigeria, and the feedback names both (unit test).
- **AC-11.13** "the  côte d'ivoire" grades as Côte d'Ivoire with 0 typos (unit test).
- **AC-11.14** A Bearing answer exactly on the beam edge is correct. 15° beyond the edge is a near miss, and 15.1° beyond is wrong (property test).
- **AC-11.15** Distance tolerances match fixtures for Malta, France, Russia, a city and the Nile, and a point inside an area scores distance 0 (unit test).

### Out of scope
How ratings update memory (FE13), daily challenge scoring (FE21), points (FE27).

---

## FE12 Audio and haptics

**Milestone:** M2 · **Packages:** audio, ui, app-shell, apps/android ·
**Decisions:** D57, D76, D89, D103, D156, D161, D162, D178 ·
**Depends on:** FE02, FE05

### Purpose
Give every outcome a calm sound and, for positive moments only, a light
haptic, with full user control and captions for every spoken word.

### Behaviour
1. **Mixer:** Web Audio API with four channels: master, voice, music and
   effects. Each has a slider and mute, stored as `SettingChanged`.
2. **Sounds** A01–A10 follow 06 §8. Music (A10) is reserved: the channel and
   slider exist, the default is off and no music ships (D161).
3. **Format:** AAC-LC `.m4a`, mono for effects and voice (D156). Decoded once and cached in memory.
4. **Voice:**
   - One clip per item per accent (en-GB, en-US), loaded on demand.
   - Captions are always shown for voice (D57).
   - Music ducks under voice: −10 dB, 150 ms attack, 400 ms release (placeholders).
5. **Combo pitch (D76):** A01 rises by one step per consecutive correct
   answer in a round, up to 5 steps (placeholder). It resets on anything
   else and at the end of the round. There is no visible combo counter in M2.
6. **Licences:** test audio is tagged non-commercial and only allowed in
   internal builds. Release builds fail CI if any is present (D89).
7. **Web autoplay:** the audio context starts on the first user gesture.
   Nothing plays before that, and no error is shown.
8. **Haptics (D162):**

   | ID | Event | Android (`@capacitor/haptics`) | Web (Vibration API) |
   |----|-------|-------------------------------|---------------------|
   | H01 | Correct answer | Light impact | 10 ms (placeholder) |
   | H02 | Bearing hit | Light impact | 10 ms (placeholder) |
   | H03 | Atlas bloom | Success notification (candidate, confirmed in ADR) | 15, 40, 25 ms pattern (placeholder) |

   - **Never** for incorrect, close, Show me, hints, timers or navigation.
   - On by default where supported. One switch in Settings → Sound and haptics.
   - At most one haptic per 300 ms (placeholder).
   - Android: follows the system touch-feedback setting (M0 ADR).
   - Web: only where `navigator.vibrate` exists. Otherwise the setting is hidden.
   - The Android app needs `VIBRATE` (D178). Reminders add `POST_NOTIFICATIONS`
     (FE25). No other permission is added.
9. **System settings:** respect the device mute switch where the platform
   exposes it. Audio stops when the app goes to the background.

### Interfaces

```ts
export type AudioChannel = 'master' | 'voice' | 'music' | 'effects';
export type SoundId = 'A01' | 'A02' | 'A03' | 'A04' | 'A05' | 'A06' | 'A07' | 'A08' | 'A09' | 'A10';
export type HapticId = 'H01' | 'H02' | 'H03';

export interface Mixer {
  play(sound: SoundId, options?: { pitchStep?: number }): void;
  speak(item: ItemId, accent: Locale): Promise<Result<void, AudioError>>;  // caption shown by ui
  setLevel(channel: AudioChannel, level: number): void;   // 0–1
  setMuted(channel: AudioChannel, muted: boolean): void;
}

export interface Haptics {
  readonly supported: boolean;
  fire(id: HapticId): void;   // rate-limited, no-op when unsupported or off
}
```

`Haptics.fire` only accepts H01–H03, so a haptic for a negative outcome can't be written.

### Edge cases
- A voice clip is missing or fails to decode: the caption still shows, and the game continues.
- Several sounds at once: effects are capped at 2 voices (placeholder). Older ones fade out.
- Bluetooth headphones with latency: no timing depends on audio.
- The user turns off touch feedback in Android settings: no haptics, even
  if the in-app switch is on.

### Acceptance criteria
- **AC-12.1** No haptic ever fires for an `incorrect`, `close` or `shown`
  outcome, or for a hint (property test plus type test).
- **AC-12.2** Haptics never fire more than once per 300 ms (unit test).
- **AC-12.3** On web without `navigator.vibrate`, the haptics setting is hidden and nothing errors.
- **AC-12.4** The merged Android manifest contains only the D178 permissions (CI gate 11).
- **AC-12.5** Each channel's slider and mute work separately and survive restart.
- **AC-12.6** Music is off by default and no music file is in any build.
- **AC-12.7** Every voice clip shows a caption (E2E).
- **AC-12.8** A release build with any non-commercial test audio fails CI.
- **AC-12.9** Nothing plays before the first user gesture on web (Playwright).
- **AC-12.10** Haptics follow Android's touch-feedback setting (manual, reference devices).

### Out of scope
Music content, speech input (P10), the pronunciation facet F20.

---

## FE15 Session builder

**Milestone:** M2 (real memory model and selection plug in at M3) ·
**Packages:** engine (`session/`), app-shell, ui ·
**Decisions:** D1, D20, D31, D32, D52, D55, D64, D69, D71, D72, D74, D133,
D139, D158, D163, D166, D173 ·
**Depends on:** FE10, FE11 (FE13, FE14 in M3)

### Purpose
Build each round just before it starts, from what's due, what's new and how
the user is doing, so any session length works and stopping costs nothing.

### Behaviour
1. **No plan is set in advance.** Each round is built at the pause before it (D1).
2. **Pure function:** `buildRound(input) → Round`. The seed is stored in
   `RoundStarted`, so any round can be rebuilt exactly.
3. **Sources, behind interfaces:**
   - `ReviewSource`: due reviews, learning steps and predicted recall.
   - `NewItemSource`: new-item candidates in unlock order.
   - M2 uses stand-ins: fame order for new items, and fixed review intervals
     (1, 3, 7, 21 days; placeholders). FE13 and FE14 replace them in M3 with
     no change to the builder.
4. **Round shape** (about 60–120 s, about 6–12 questions; D71):
   1. **Warmup:** 1–2 reviews with high predicted recall, in light games.
   2. **Drill:** reviews and new items, about 1 new to 3 reviews, plus any surprise check.
   3. **Boss:** one harder item or format, predicted recall about 0.70–0.80.
   4. **End on a win:** if the Boss is missed, one quick easy item follows.
   5. **Pause:** atlas changes play (FE08), then the next round is built.
5. **Filling slots** (in priority order):
   1. Learning steps due now
   2. Overdue core reviews, highest value first
   3. New items, only if recent accuracy is at least 85% and the backlog is under its threshold
   4. Surprise check (about 5% of slots)
   5. Curiosity and deep reviews

   Emphasis (D55) and goal (D64) weights reorder items within a level, never across levels.
6. **Mixing rules:**
   - Load budget about 12 per round, at most 1 heavy (load 3) game.
   - Never the same game twice in a row. At least 2 primitives per round.
   - Rotate facet and channel.
   - No two facets of the same item in one round, except in Claim rounds.
   - Lookalikes are kept apart until both are established, then mixed deliberately (D52).
7. **Picking a game per slot:**
   - Eligible: matches the facet and level, and is enabled by flags and experiments.
   - Excludes the game used last time for that item-facet. Prefers the least recently used.
   - Engagement can shift weights by up to ±20%. It never removes a game (D20).
8. **Round types:**

   | Type | When | Milestone |
   |------|------|-----------|
   | Standard | Default | M2 |
   | Refresh | Back after a gap. About 5 minutes at most, highest-value lapses first | M2 |
   | Claim | An item has several established facets. Finishing it triggers the atlas upgrade | M3 |
   | Theme run | A family is ready to introduce (the -stans, Benelux) | M3 |
   | Journey | Long sessions, chains of Pathfinder and Downstream routes | M3 |
   | Daily challenge | Slot exists; filled by FE21 after the warmup (D72) | M4 |
   | Placement | Hidden probes in rounds 1–3; filled by FE22 (D97, D166) | M4 |

9. **Fatigue** (no messages, ever):
   - Signals: accuracy more than about 10 points below the session start,
     response time more than about 30% above the user's usual, more hints or
     "Show me", leaving partway through a round.
   - Response: lighter games, fewer new items, more Journey or Explore-style rounds.
10. **After the daily budget is met:** rounds shift to free play (curiosity,
    Journeys, deeper layers). New core items stay gated. Nothing marks "done
    for today" (D69).
11. **Between rounds:**
    - Tap to continue or automatic continue comes from E01. "No time
      pressure" always forces tap to continue (D158).
    - The chapter-end pause (S08, D74) is a hook. It's on by default for
      public builds and A/B tested in FE27.
    - Pending packs, perspective and flag changes apply here (D163).
12. **Parking (D133, D173):**
    - FE19 detects the change of intent. The Explore control and the menu
      always park. FE15 parks the round (`RoundParked`) and resumes it at the
      same question (`RoundResumed`).
    - If the round was parked for more than 10 minutes (placeholder), the
      unanswered slots are rebuilt because what's due has changed.
13. **Saving:** the answer event is appended before the next question shows
    (FE01). If the app closes mid-round, the next launch starts a new round. Answered questions stay answered.

### Interfaces

```ts
export interface ReviewSource {
  due(now: number): readonly DueEntry[];
  predictedRecall(key: ItemFacetKey, now: number): number | null;
}

export interface NewItemSource {
  candidates(state: LearnerState, view: ContentView, limit: number): readonly ItemId[];
}

export interface RoundInput {
  state: LearnerState;
  view: ContentView;
  games: readonly GameDefinition[];
  flags: FlagSnapshot;
  reviews: ReviewSource;
  newItems: NewItemSource;
  emphasis: readonly EmphasisEntry[];
  signals: SessionSignals;   // fatigue and engagement, from behaviour only
  now: number;
  seed: number;
}

export type RoundType = 'standard' | 'refresh' | 'claim' | 'themeRun' | 'journey' | 'daily' | 'placement';

export interface Round {
  id: RoundId;
  type: RoundType;
  seed: number;
  slots: readonly Slot[];   // Slot is a discriminated union per slot kind
}

export function buildRound(input: RoundInput): Round;
export function rebuildRemaining(round: Round, answered: number, input: RoundInput): Round;
```

### Edge cases
- Brand-new user: no reviews. Rounds are new items in unlock order (D39);
  hidden placement arrives with FE22.
- Large backlog after months away: Refresh rounds first. New items stay gated until the backlog is under its threshold.
- Too few eligible games for the mixing rules: rules relax in a fixed order
  (channel rotation first, the "never twice in a row" rule last) and the reason is logged.
- Every eligible item is a lookalike of another in the round: one is swapped for the next candidate.
- Clock jumps forward or back mid-session: the builder uses the injected `now`; monotonic `at` protects ordering (FE01).

### Acceptance criteria
- **AC-15.1** The same `RoundInput` gives an identical `Round` on web and Android (reference replay).
- **AC-15.2** Every round meets the load budget, has at most 1 heavy game, never repeats a game back to back and uses at least 2 primitives, unless a logged relaxation applies (property test).
- **AC-15.3** No two facets of the same item appear in one non-Claim round (property test).
- **AC-15.4** A missed Boss is always followed by one easy item (property test).
- **AC-15.5** Emphasis weights never move an item across priority levels (property test).
- **AC-15.6** With "No time pressure" on, a round never continues automatically (E2E).
- **AC-15.7** No screen or string says "done for today" or similar (string lint plus screenshot review).
- **AC-15.8** A round parked for over 10 minutes rebuilds only the unanswered slots.
- **AC-15.9** Round build p95 < 50 ms on the Galaxy A07 4G with a 10,000-event history.
- **AC-15.10** Replacing the stand-in sources with any other implementation needs no change in `session/` (type test).
- **AC-15.11** Simulation smoke test (500 learners × 60 days) completes with no invariant violations (CI gate 4).

### Out of scope
The FSRS scheduler (FE13), unlock and selection rules (FE14), Meet and
contrast cards (FE16), Explore and park detection (FE19), daily challenge
(FE21), hidden placement (FE22), points and the streak module (FE25, FE27).

