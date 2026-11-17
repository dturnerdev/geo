# 03 — Learning design

**Status:** v1.0. Decisions: D15–D24, D27–D32, D36–D83, D97, D126–D129,
D133–D134, D154, D158, D166, D167, D168, D170, D171, D172–D174, D176, D177, D179. Every number
marked (placeholder) lives in `engine/tuning.ts` and is tuned by the
simulation harness (FE18).

## 1. Core model

- **Item:** a real thing with a permanent ID (D16).
- **Facet:** one fact about an item, tested in one direction. Scheduled independently.
- **Format (game):** a config on top of an interaction primitive. Formats
  rotate; scheduling is per facet, never per format.
- **Kinds of knowledge:** place, relationship, concept, skill, change over time (D45).
- **Knowledge graph:** items plus typed relationships: `borders`, `flowsThrough`,
  `locatedIn`, `memberOf`, `partOf`, `sitsOnPlate`, `capitalOf`,
  `lookalikeOf`, `familyOf` (D42).

### Item types
Country, territory, city, subdivision, physical feature (river, range, peak,
lake, sea, desert), Earth structure (layer, plate, boundary), reference line,
climate zone/biome, celestial body (D40, reserved).

### Item classes

| Class | Target recall | Dropped if ignored? |
|-------|---------------|---------------------|
| Core | 0.90 | Never. Only how and when it's shown changes |
| Curiosity | 0.85 | Paused after repeated disengagement (D31) |
| Deep | 0.80 | Late layers only, never shown to beginners (D18) |

## 2. Facet catalogue

MVP = content ships in the MVP. All answer types for F01–F34 are built and
tested in the MVP (D41).

| ID | Facet | Direction / answer type | Applies to | Class | MVP |
|----|-------|-------------------------|------------|-------|-----|
| F01 | Continent/ocean location | name → map, map → name | Continents, oceans | Core | Yes |
| F02 | Region membership | item → continent/subregion | Countries | Core | Yes |
| F03 | Find it | name → map | Countries | Core | Yes |
| F04 | Name it | map → name | Countries | Core | Yes |
| F05 | Shape | outline → name | Countries | Core | Yes |
| F06 | Flag → country | one way | Countries | Core | Yes |
| F07 | Country → flag | one way | Countries | Core | Yes |
| F08 | Country → capital | one way (incl. regional capitals, home country) | Countries, home regions | Core | Yes |
| F09 | Capital → country | one way | Countries, home regions | Core | Yes |
| F10 | City location | name → map | Cities | Core (capitals, home cities), else curiosity | Yes |
| F11 | Neighbours | country → set | Countries | Core | Yes |
| F12 | Relative position | A → direction and distance to B. Scheduled per place | Countries, capitals | Core | Yes |
| F13 | Feature location | F13a name → map, F13b map → name | Physical features | Core (major), curiosity (minor) | Yes |
| F14 | Flow | feature → direction of flow or run | Rivers, ranges | Core (major) | Yes |
| F15 | Earth layers | order and properties | Layers | Core | Yes |
| F16 | Plates and boundaries | plate location; boundary type → landform | Plates, boundaries | Core | Yes |
| F17 | Reference lines | name → map; read/plot lat/lng (generated) | Lines, hemispheres | Core | Yes |
| F18 | Capital exceptions | country → each capital + role (multi-value) | Multi-capital countries | Curiosity | Later |
| F19 | Subdivisions | name → map, map → name | States, counties, nations | Core (home country), else curiosity | **Home country only** |
| F20 | Pronunciation | hear it → name (audio) | Named items | Curiosity | Later |
| F21 | Climate and biomes | zone → map | Zones | Curiosity | Later |
| F22 | Languages | country → set | Countries | Deep | Later |
| F23 | Deep stats | comparison (banded, dated) | Countries | Deep | Later |
| F24 | River course | river → ordered sequence of countries/cities | Major rivers | Core | Yes |
| F25 | Landforms and processes | concept (cause → effect) | Concepts | Curiosity | Later |
| F26 | Atmosphere and climate systems | concept + map | Concepts | Curiosity | Later |
| F27 | Map skills | generated exercise | Skills | Curiosity | Later |
| F28 | Blocs and organisations | set | Organisations | Deep | Later |
| F29 | Chokepoints and trade routes | map + chain | Features | Deep | Later |
| F30 | Time zones | relationship / numeric | Places | Curiosity | Later |
| F31 | Renamed and former places | time-dated fact | Places | Deep | Later |
| F32 | Water and carbon cycles | concept (stores and flows) | Concepts | Deep | Later |
| F33 | Hazards | map | Volcanoes, belts | Curiosity | Later |
| F34 | Local names (endonyms) | typed / audio | Places | Deep | Later |

Deep stats are always comparisons or bands, never exact figures.

## 3. Unlock order

### Breadth (which items)
1. Start: Earth layers → continents and oceans → reference lines → home
   country → world by fame score (population, size, prominence) (D39).
2. Plates run as a parallel track once continents are known.
3. Home country: its regions and their capitals are core and early (D66, D70).
   F19 unlocks once the home country's F03/F04 is established.
4. Every new item is introduced through an anchor (section 4).
5. Fame tiers and the prerequisite graph decide the next new item (D166, D167, FE14).

### Depth (which facets per item)
Facets unlock through the prerequisite graph in the pack (D167). Rules and
examples: FE14 item 2. CI checks the graph for cycles and reachability.

Physical and Earth facets (F13–F17, F24) unlock once enough related countries
are established (e.g. the Nile after Egypt and Sudan).

**Established:** correct on 2 separate days and stability ≥ 3 days (placeholder).

## 4. Discovery

### 4.1 Routes for a new item

| Condition | Route |
|-----------|-------|
| Item is in a tier credited by hidden placement (FE22) | Asked at R2 with no Meet. Name and fact line shown in its first feedback |
| Otherwise | Meet → immediate R1 question |

### 4.2 Meet (about 8–12 s, D51)
Globe flies from a known place → item outlined → name shown and spoken →
one anchor line ("between Russia and China") → one memorable fact →
question. Location and name only. Other facets get **mini-Meets** when they
unlock. The item gains its first atlas colour.

### 4.3 Anchors
Spatial (neighbour, inside, coast of) · family (the -stans, Baltic states) ·
physical (on the Danube) · name (Guinea family) · topical (post-MVP).

### 4.4 Learning steps (D168, placeholders)
1. Later in the same round, at least 3 questions on.
2. Next round.
3. Next local day. Then FSRS takes over (FE13).

### 4.5 Pacing (placeholders)
- 3–7 new facets per 5 minutes. At most 2–3 new items per round.
- About 1 new to 3 reviews.
- New items only when in-session accuracy ≥ about 85% and the backlog is light.
- Back-off: two missed new items in a row, or rising response times, lead to R1
  formats, more reveals and new items paused.

### 4.6 Lookalikes (D52, D127)
- Never introduced together. Establish one, then introduce the other with a **contrast card**.
- Once both are established, they're deliberately mixed.
- Flag lookalikes for colour-blind users are tagged by simulation. Their
  contrast cards use non-colour cues (layout, emblem, stripe order,
  proportions).

### 4.7 Hints, Show me, aids
- Hint ladder: continent → region → first letter → reveal. Any hint caps at **Hard**.
- Show me: **Again** internally, neutral on screen. Logged separately from failures (D53).
- Accessibility aids (colour names, list alternative, spelling support)
  **never lower a rating** (D128).
- Memory hooks are written by us (AI-drafted, human-reviewed). They reappear after a lapse.

### 4.8 Where a session may stop
- A round never ends between a Meet and its first question.
- Every new item gets one retrieval question before the next pause.

## 5. Primitives and games

### 5.1 Primitives

| ID | Primitive | Used by | MVP |
|----|-----------|---------|-----|
| P1 | Tap region(s) | Flashpoint, Hot/Cold, Surround, Capital Hunt | Yes |
| P2 | Place a point (distance-graded) | Blind Drop, Drop the Pin, Coordinates | Yes |
| P3 | Pick / yes-no | Pairs, Flag Flash, Seat of Power, Shadow, True Borders, Compass pick, Spot the Fake | Yes |
| P4 | Type (with hints) | Letter Reveal, Quickfire, Capital Gaps | Yes |
| P5 | Drag and place | Snap, Continental Drift, cross-section labels | Yes |
| P6 | Order | Rank It, river order | Yes |
| P7 | Chain | Pathfinder, Downstream | Yes |
| P8 | Aim a beam | Bearing | Yes |
| P9 | Draw a path | Flow, Trace the boundary, Cartographer* | Yes |
| P10 | Speech input | Speak It, Repeat After Me* | No |

\* Experimental, behind a feature flag.

### 5.2 Game grid

| Facet | R1 recognise | R2 cued | R3 free recall | R4 produce |
|-------|--------------|---------|----------------|------------|
| F01 | Flashpoint | Hot/Cold | Blind Drop | Snap |
| F02 | Which Continent? | Continental Drift (few) | Continental Drift (full) | – |
| F03 | Flashpoint | Hot/Cold | Blind Drop | Snap |
| F04 | Pairs | Letter Reveal | Quickfire | The Between |
| F05 | Shadow (outline → pick name) | Through the Fog | Outline → type, with distance/direction feedback | Cartographer* |
| F06 | Flag Flash | Flag + continent hint | Flag → type | Banner Families |
| F07 | Flag Flash (reverse) | Missing Stripe | Spot the Fake | Flag Forge* |
| F08 | Seat of Power | Capital Gaps | Capital Quickfire | – |
| F09 | Seat of Power (reverse) | Letter Reveal | Capital Hunt | – |
| F10 | Flashpoint (dots) | Hot/Cold (zoomed) | Drop the Pin (country outlined) | Drop the Pin (blank) |
| F11 | True Borders | One Neighbour | Surround | Pathfinder |
| F12 | Compass pick (8 sectors, D126) | Bearing, wide beam | Bearing, narrow beam | Bearing + distance guess |
| F13a | Flashpoint | Hot/Cold | Blind Drop | – |
| F13b | Pairs | Letter Reveal | Quickfire | – |
| F14 | Pick the right arrow (of 2) | Turn the arrow | Draw it (route shown) | Draw it (blank map) |
| F15 | Pairs | Rank It (depth/temperature) | Label the cross-section (P5, SVG, D154) | – |
| F16 | Flashpoint (plates) | True/False: boundary → landform | Trace the boundary | Connect* |
| F17 | Flashpoint (lines) | Hot/Cold by latitude | Coordinates (generated) | Rank It by latitude |
| F19 | Flashpoint | Letter Reveal | Quickfire | – |
| F24 | True/False "flows through X?" | Order (some given) | Downstream: next country/city | Downstream source → mouth |

Flag questions always offer the colour-names button (D129).

### 5.3 Overlays and round shapes
- **Doppelgänger:** supplies distractors for R1/R2 from known lookalikes. Never
  includes items outside the user's map perspective.
- **Soundtrack:** names are spoken alongside most games (Voice channel).
- **Interleave rule:** never the same game twice in a row; rotate facet and channel.

## 6. Grading

Graders are pure, versioned functions, one per primitive (D17). Ratings are
stored at answer time and never regraded silently. Changes need a versioned
migration. Geometry is computed once and stored in the event (D117).

### 6.1 Per primitive

| Primitive | Again | Hard | Good | Easy |
|-----------|-------|------|------|------|
| Tap / pick | Wrong | Hint used | Correct | Correct and fast |
| Place a point | Outside 2× tolerance | Within 2× tolerance | Within tolerance | Within ½ tolerance and fast |
| Type | Wrong, or matches another real place | Near-miss, or hint used | Exact (case, accents, accepted alternatives ignored) | Exact and fast |
| Set | < 70% found | 70–99% | All | All, fast, no wrong taps |
| Aim | Beyond near-miss angle | Near miss | Beam hit | Narrow-beam hit, first shot |
| Chain | Gave up | Over par | Par | Under par / perfect |
| Order | > 1 out of place | 1 swap | Perfect | Perfect and fast |
| Draw | Wrong direction or route | Right direction, poor route | Within tolerance | Within ½ tolerance and fast |

Tolerances: FE11 item 6. All thresholds are placeholders.

### 6.2 Caps and modifiers (applied in this order)
1. Easy only at R3/R4, with no hint, and only when fast (FE11).
2. Any hint: at most Hard.
3. Spelling support on: near-miss typing is rated Good (D128).
4. No aid, including "No time pressure", ever lowers a rating (D128). "Fast"
   is measured against the user's own median for that input method.

**Fast:** below the user's own median for that game and input method over the
last 20 answers. Only after at least 5 answers (placeholders, FE11).

### 6.3 Special rules
- **Typing (D56):** near-miss tolerance scales with word length. If what was
  typed matches another real place (Niger/Nigeria, Iran/Iraq), it's wrong.
  The correct spelling is always shown quietly.
- **Bearing (D27, D36, D37):** great-circle beam, width = difficulty. First shot
  graded. On a miss, the beam stops at its closest point, the target is outlined,
  one ungraded correction shot is fired from there, then the answer is shown. The
  distance counter ticks up and pops on landing (not graded).
- **Compass pick (D126):** only pairs where the great-circle and compass sectors agree.
- **Flags (D127, D129):** no pairs skipped. Spot the Fake changes layout, not
  just colour, when a colour-vision setting is set.

## 7. Scheduler

1. **Engine:** FSRS-6 via ts-fsrs, behind `MemoryModel` (FE13). FSRS-7 is the
   target, trialled as E09 (FE13 item 11, 08 §9). State is always rebuilt from the log.
2. **Day:** 04:00–04:00 local. Events store their time zone (D134). Same-day
   repeats are handled by learning steps. Metrics ignore same-day predictions.
3. **Level ladder (placeholders, FE14):** stability < 2 days → R1, 2–7 days → R2,
   7–30 days → R3, ≥ 30 days → R4 if a game exists. Never more than one level
   up per review. After a lapse, one level down.
4. **Targets:** 0.90 / 0.85 / 0.80 by class.
5. **Surprise checks:** about 5% of review slots, on items not due, ideally learned
   30+ days ago and not reviewed in the last 7 days, in a different format. They update memory
   and are tagged.
6. **Optimiser (FE17):** default parameters until at least 1,000 reviews over
   30 local days. Re-run after 500 more reviews or 30 days. Adopted only if log
   loss on held-out reviews improves by at least 1%. Saved as an event. One
   parameter set per user (D60).
7. **Shadow evaluation (D62):** candidate models predict silently and are scored by log
   loss, RMSE (bins) and AUC. They switch only when they win on our data.
8. **What's new (D166, D167):** fame tiers, the prerequisite graph and the
   FE14 gates choose new items and keep in-session accuracy around 85%.
   FSRS decides *when*; FE14 decides *what's new*.
9. **Daily budget and backlog:** the daily budget is a setting of 5, 10, 15
   or 20 minutes of active practice, default 10 (D171). New items pause above
   the backlog threshold (FE14). Core first.
10. **Related facets:** two facets of the same item never appear in one round,
    except Claim rounds (established facets only).

### Atlas states

| State | Definition |
|-------|------------|
| Discovered | Met at least once. The floor for countries |
| Established | Section 3 rule |
| Fading | Established, predicted recall < about 0.70 |
| Restored | Correct review while fading |

| Facets established | Atlas change |
|--------------------|--------------|
| F03/F04 | Country in realistic colour |
| F08/F10 | Capital lights |
| F13/F14 (rivers) | Rivers drawn |
| F13/F16 (mountains, plates) | Relief appears |
| F19 | Internal borders |
| F21 | Biome tint |

## 8. Session builder (FE15)

- No session length is planned in advance. Each round is built at the pause before it:
  `buildRound(input)` (FE15). The seed is stored.
- **Inputs:** due reviews, learning steps, new-item candidates (unlocks, fame
  tiers, emphasis), surprise checks, the daily challenge slot, fatigue and
  engagement signals.

### Round anatomy (about 60–120 s, 6–12 questions, D71)
1. **Warmup:** 1–2 high-recall reviews, light formats.
2. **Drill:** reviews and new items (about 1:3), plus any surprise check.
3. **Boss:** one harder item or format (predicted recall about 0.70–0.80).
4. **End on a win:** if the Boss is missed, one quick easy item.
5. **Pause:** atlas animates what improved. Public builds wait for a tap. Auto-continue is E01, internal and closed builds only (D73). "No time pressure" always means tap (D158).

### Round types

| Type | When |
|------|------|
| Standard | Default |
| Claim | Item has several established facets. Finishing it triggers the atlas upgrade |
| Theme | A family is ready, or chosen from Topics |
| Journey | Long sessions: Pathfinder/Downstream chains |
| Refresh | Back after a gap. ≤ about 5 min, highest-value lapses first |
| Daily | First round of the local day: the daily challenge slot follows the warmup (E04). Its answers never reach the scheduler (D174) |

### Slot priority
1. Learning steps due now
2. Overdue core reviews (atlas visibility, lowest recall first)
3. New items (accuracy ≥ about 85%, backlog under threshold)
4. Surprise check
5. Curiosity and deep reviews

Emphasis and goals reorder within a priority level, never across levels (FE15).

### Mixing
- Load: light 1, medium 2, heavy 3. About 12 per round, at most 1 heavy.
- ≥ 2 primitives per round. Never the same game twice in a row.
- Rotate facet and channel (visual, audio, spatial, typed).
- Lookalikes apart until both are established.

### Format choice
Eligible = matches facet, level and enabled flags. Exclude last-used format for that
facet. Prefer least recently used. Engagement nudges weights by ±20% at most,
never removes a format (D20).

### Fatigue (behaviour only, no messages mid-round)
- **Signals:** accuracy more than about 10 points below session start; response time more than about 30%
  above usual; more hints or Show me; leaving mid-round.
- **Levels 0–2:**
  - Lighter games, fewer new items, more Journey and Explore-style rounds.
  - At a pause: chapter end (D74, on by default publicly), also after 25
    minutes of active practice (D179). At most once per session, unless the signals worsen.

### After the daily budget
Free play: curiosity, Journeys, deeper layers. New core items stay gated.
Nothing on screen changes (D69).

### Explore interruptions (D133, D173)
Camera movement never parks a map-answer question. On other questions, a turn
> 30° or a zoom > 1 detail level parks the round. The Explore control and the
menu always park it. The round resumes at the same question, and parked time
never counts as response time. After more than about 10 minutes away, the rest
of the round is rebuilt.

## 9. Motivation layer

### Reward hierarchy (D76)
1. **Living Atlas:** the main reward. Milestones play as atlas moments, not badges.
2. **In-round game feel:** hit effects, Bearing counter, sound.
3. **Rising-pitch combo:** no counter, no multiplier, a miss resets silently.
4. **Daily challenge score:** the only number. Resets daily.

Points experiment E03: A none (default, always in public builds) · B round
score shown at pause then discarded · C round score + personal best per game
type. Internal and closed builds only (FE27).

### Timers (D77)
None visible. Flashpoint pulses until tapped. Quickfire is rhythm, not a clock.
Letter Reveal hints limit the rating, with no fail state. **Blitz:** flag, off by
default, free play only. It records no events, shows no score and is hidden
with "No time pressure" (FE26).

### Streak module: weekly rhythm (D15, D78, D93, D176, D177)
- Flag on by default. "Show weekly rhythm" hides it.
- A week counts with at least 2 practice days. Shown in the menu and progress view only.
- No daily streak, ever. Breaks are never mentioned. A reset is silent.
- Android reminders: off by default, turned on only in Settings, inexact,
  at most one a day, skipped on practice days. None on web (FE25).

### Daily challenge (D134, D174)
- 5 questions (P2, P8, P6, one P3 flag pick), the same for everyone,
  perspective-safe. No timer.
- Separate from learning: no effect on scheduler, atlas, metrics or Meets.
- Plain text share. No bonus stages, no archive.

### Interest forks (D81)
- Three glowing destinations at a pause, only when the new-item gate is open,
  at most once every 3 sessions (placeholder).
- Two options come from unlocked-but-unstarted content. One is linked to
  emphasis from place cards or Theme runs (Explore itself records nothing, D172).
- The choice becomes a fork emphasis entry (FE20). At most 2 active, including Topics choices. Fades if not engaged with. ≤ 30% of new-item slots.

### Emphasis system (D55, FE14)
- Entries: target, weight, source, start, end.
- Reorders within a priority level only, never adds content. Where entries
  overlap, the strongest weight applies. Weights never add up.
- MVP sources: `learner` (settings, place cards), `fork` (forks, Topics),
  `goal` (goal presets, D170). Teacher and topicality sources are post-MVP.

### Post-MVP (structures built now)
- **Topicality (D43, D47, D48, D50):** sustained coverage only (28-day average,
  3 of 4 weeks, harder entry than exit, about 10 per region cap, editor overrides).
  GDELT (UK outlets) + Wikimedia page views. No headlines.
- **Deadline mode and teacher goals (D64, D67):** goal presets already ship (D170). Post-MVP adds:
  - Facet set + deadline + owner. Only teachers set them in schools.
  - Effects: target about 0.95, capped intervals, final review before the date, unmet
    goal facets brought forward, gradual return after the deadline.
- **Teacher tests (D65, D68, D82):** per-student weekly tests with a shared anchor
  subset. Common final test. Printable A4 with answer key. Teacher picks shared or
  personalised print, and the choice is recorded.
- **Class atlas (D83, D147):** shared globe, no rankings, class completion goals.

## 10. Placeholders (all in `engine/tuning.ts`)

Round length · questions per round · load budget · established threshold ·
fading threshold · ladder thresholds · target recall per class · surprise
rate and eligibility · pacing (new per 5 min, per round, ratio) · accuracy
gate · backlog threshold · fatigue thresholds · chapter-end time · fast median
window and minimum · park thresholds (D173) · background park time · round
rebuild time · placement probes (rounds, per round, cap, stop rule,
correction) · fork interval, session gap, weight, duration and fade ·
optimiser trigger · interest slot cap · format nudge range · refresh cap ·
feedback dwell time · Bearing beam widths and near-miss angle · distance tolerances. Full register with defaults: `placeholders.md`.

