# Glossary

Terms are listed in learning-model order. **⚠** marks a word with two meanings.

## Learning model

| Term | Meaning |
|------|---------|
| Item | A real thing that can be learned: a country, city, river, plate, Earth layer, reference line. Has a permanent ID (never reused) |
| Item type | Country, territory, city, subdivision, physical feature, Earth structure, reference line, climate zone/biome, celestial body (D40) |
| Item class | **Core** (never dropped, target recall 0.90), **Curiosity** (paused after repeated disengagement, 0.85), **Deep** (late layers, 0.80) |
| Facet | One testable fact about an item, in one direction (prompt → answer). Scheduling happens per facet (D16). IDs F01–F34 |
| Format / game | A specific way of testing a facet at a given level, e.g. Flashpoint, Shadow. A game is a config on top of a primitive |
| Primitive | One of ten reusable interactions P1–P10 (tap, place a point, pick, type, drag, order, chain, aim, draw, speak) |
| Level (R1–R4) | Recognise, cued, free recall, produce. Chosen from memory strength (the level ladder) |
| Rating | FSRS grade: Again, Hard, Good, Easy. Worked out by graders, never self-rated (D17) |
| Grader | A pure, versioned function turning a raw response into a rating plus stored geometry |
| Kind of knowledge | Place, relationship, concept, skill, change over time (D45) |
| Knowledge graph | Items plus typed relationships (borders, flows through, member of, sits on plate …) (D42) |
| Anchor | A known item used to introduce a new one (spatial, family, physical, name, topical) |
| Lookalike | A confusable pair (Niger/Nigeria, similar flags). Kept apart until both are established |
| Contrast card | Side-by-side card showing the one thing that tells a lookalike pair apart (D52) |
| Chain | A sequence through the graph: Pathfinder (borders), Downstream (rivers) (D44) |

## Discovery

| Term | Meaning |
|------|---------|
| Meet | About 10-second introduction of a new item's location and name, then an immediate question (D51) |
| Mini-Meet | Short introduction of a later facet when it unlocks, or after an answer changes ("This has changed") |
| Test before teaching | Items in tiers credited by hidden placement start at R2 without a Meet. Their first feedback gives the name and fact line (FE22) |
| Show me | Reveal button. Rated Again internally, always neutral on screen (D53) |
| Hint ladder | Continent → region → first letter → reveal. Any hint caps the rating at Hard |
| Accessibility aid | Colour names, list alternative, spelling support. Never lowers a rating (D128) |
| Learning steps | In-session repeats after a Meet, before FSRS takes over |
| Hidden placement | Up to 3 probes in each of rounds 1–3 set a fame-tier estimate per continent and facet group. Never shown as a test (D97, D166) |
| Probe | A hidden placement question on an unmet item at R2 or R3, with no Meet (FE22) |

## Memory and scheduling

| Term | Meaning |
|------|---------|
| FSRS | Free Spaced Repetition Scheduler. FSRS-6 via ts-fsrs (D59) |
| Stability | FSRS estimate of how long a memory lasts (days) |
| Predicted recall | FSRS estimate of the chance of recalling a facet now (retrievability) |
| Target recall | Desired retention per item class (0.90 / 0.85 / 0.80) |
| Established | Correct on 2 separate days and stability of at least 3 days (placeholder) |
| Fading | Established, but predicted recall below about 0.70 |
| Restored | Correct review while fading |
| Discovered | Met at least once. A country never drops below this on the atlas |
| Surprise check | About 5% of slots on items not yet due, in a new format. Least biased measure of retention |
| Optimiser | On-device fitting of FSRS parameters after 1,000 reviews over 30 local days (FE17, D169) |
| Shadow evaluation | Candidate models predict silently. They only replace the live model if they win on our data (D62) |
| Fame score | Ranks items by population, size and prominence. Sets fame tiers |
| Fame tier | A band of items by fame score. Unlocking and placement work by tier (D166) |
| Emphasis | Weighted entry from a source (MVP: learner, fork, goal). Reorders within a priority level, never adds content. Where entries overlap, the strongest weight applies (D55, FE14) |
| Interest fork | Occasional pick-one-of-three glowing destinations at a pause (D81) |
| Goal / deadline mode | Goal presets ship in the MVP: weights only, chosen in Settings (D170). Deadline mode is post-MVP (D64) |
| Topicality | Sustained-news emphasis source (D47). Post-MVP |
| Day boundary | 04:00 local time, for both the scheduler and the daily challenge (D134) |

## Sessions

| Term | Meaning |
|------|---------|
| Session | A continuous period of use. No length is planned in advance |
| Round | About 60–120 seconds, 6–12 questions, built at the pause before it (FE15) |
| Round type | Standard, Claim, Theme, Journey, Refresh, Daily |
| Slot roles | Warmup, Drill, Boss, Recovery (end-on-a-win item) |
| Load budget | Light 1 / medium 2 / heavy 3 points. About 12 per round, at most 1 heavy (placeholder) |
| Pause | Quiet atlas animation between rounds. The "end of a paragraph" |
| Chapter end | A pause that adds "A good place to stop" when fatigued or after 25 minutes of active practice (D74, D179) |
| Fatigue level | 0, 1 or 2, from behaviour signals only. Drives lighter rounds |
| Free play | Rounds after the daily budget: curiosity, Journeys, deeper layers |
| Explore | Using the globe freely. Never counts as learning: no Meets, answers or atlas changes (D172) |
| Blitz | Optional timed run on established places. Records nothing, shows no score (FE26) |
| Park | Round set aside by the Explore control, the menu, or a clear change of intent on non-map questions. "Back to round" tab resumes it (D133, D173) |
| Daily challenge | Shared 5-question puzzle, the same for everyone. Separate from learning (D174) |
| Practice day | A local day with at least one recorded answer. Explore, Blitz and the daily challenge don't count |
| Weekly rhythm | Weeks in a row with at least 2 practice days. The only streak in the app (D176) |
| Reminder | Optional inexact Android notification, at most one a day, off by default (D177) |
| Living Atlas | The globe as a progress display. Detail appears as facets are established and fades gently (D24) |
| Progress view | Written summary of learning beside the Living Atlas (S23, D181) |

## Map and geometry

| Term | Meaning |
|------|---------|
| Perspective | Per-market data file: border lines, country status, names (D84) |
| Control vs claim | Neutral way of teaching disputed areas: "who controls it?", "who claims it?" |
| LngLat | Branded `{ lng, lat }` type, WGS 84 decimal degrees (D112–D113) |
| Bearing | Initial great-circle direction, clockwise from true north. Also the name of game P8 |
| Tap zone | Pipeline-made shape used for grading taps. Enlarged for small items (D118) |
| GlobeController | The only interface the UI uses to talk to the globe. Owns the renderer |
| ⚠ Projection (map) | A way of flattening the sphere (e.g. Equal Earth for flat mode) |
| ⚠ Projection (state) | `project(state, event)`: pure function folding an event into learner state. In code, always say `project…` for state and `mapProjection` for maps |

## Data and delivery

| Term | Meaning |
|------|---------|
| Event | Append-only record of a learning action (FE01) |
| Event log | All events. The only source of truth for progress |
| Snapshot | Disposable cache of rebuilt state |
| EventStore | Storage interface with native SQLite, WASM SQLite and in-memory adapters |
| Content pack | Compiled, signed (Ed25519), versioned bundle of content, flags, experiments and tuning |
| Pipeline | `tools/content-pipeline`: import → staging → human review → checks → pack |
| Licence register | Repo file listing every source, its licence and required credit (D87) |
| Export file | Gzipped JSON Lines of all events. The user's backup (D92) |
| Share a summary | Opt-in counts-only file for testers (D151) |
| Donation code | Random code shown when a tester shares their log, used only to request deletion (D180) |
| ⚠ Flag (feature) | On/off switch shipped in the content pack. In code: `featureFlag` |
| ⚠ Flag (national) | A country's flag (facets F06/F07). In code: `nationalFlag` or `flagArt` |
| Experiment / variant | Pre-registered test. Variant = hash(installId, experimentId) |
| Install ID | Random on-device ID used only for experiment assignment. Never sent anywhere |
| Reference device | Galaxy A07 4G (targets). Floor: Redmi A5. High end: Pixel 9 Pro |
| North star | Durable knowledge: item-facets with predicted recall ≥ 0.90 in 30 days (D149, FE04) |
| Guardrail | A metric an experiment may not make worse beyond the 08 §7 margins |
| Pre-registration | `experiments/Exx.md`, written before an experiment's code ships (08 §8) |
| True memory | A simulated learner's hidden recall, from a model that isn't the engine's (FE18) |
| Risk | Entry in the risk register, ID `RK` (11 §1) |
| Distance tolerance | How far a placed point or drawn path may be from the target and still count (FE11 item 6) |

