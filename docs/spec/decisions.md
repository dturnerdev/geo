# Decision register

Status values: **Active**, **Amended** (still active, details changed by a
later decision), **Superseded → Dx**, **Post-MVP** (structures built now,
feature later), **Deferred**. "Where" lists the owning features or areas.
CP = content pipeline.

## 1. Vision and scope

| ID | Decision | Status | Where |
|----|----------|--------|-------|
| D1 | A geography learning app with no end point. A 5-minute session and a multi-day binge are both useful | Active | FE15 |
| D2 | Audience: confident readers aged 10+, mainly secondary, college, university and interested adults | Active (Play bands per D142) | All |
| D3 | Android and web required. iOS later, and nothing may rule it out | Active | All |
| D4 | Free for now. Paid model (likely paid sync) deferred, switchable later without a rewrite | Deferred | — |
| D5 | Success = durable retention for little effort, measured by the metrics in 08 | Active → D149 | FE04 |
| D6 | Inspiration: Seterra, Worldle, HexHunt, Teuteuf games, Travle, WhichWay. Not GeoGuessr or Duolingo | Active | — |
| D7 | Readable and maintainable beats clever or efficient | Active | All |
| D8 | No deadline, low budget, personal project | Active | — |
| D9 | No account needed. Accounts optional and only add sync | Amended by D92 (no accounts in MVP) | — |
| D10 | Android works fully offline and syncs when online | Amended by D92 (sync post-MVP) | FE01 |
| D11 | Backwards compatibility: progress survives every update, older app versions keep working, minimum OS/browser support is not dropped casually | Amended by D14, D137 | FE01, FE02 |
| D12 | Spinnable globe with a switch to a flat map. Both first-class | Active (D153) | FE06 |
| D13 | Web works offline too. One sync design for web and Android | Active (sync post-MVP) | FE01 |
| D14 | Minimum versions fixed at launch, supported ≥ 5 years. Dropping one needs a written reason | Amended by D137 | 09 |
| D15 | Streaks are an optional module, off by default, with gentler variants | Active → D78; amended by D176 | FE25 |
| D16 | Items, facets and formats are the core concept. Scheduling per facet | Active | domain |
| D17 | Ratings worked out by fixed rules. No self-rating, no AI in the app | Active | FE11 |
| D18 | Deep facets (languages, GDP, exports) are late layers, never shown to beginners | Active | FE14 |
| D19 | No learning-style personalisation. Everyone gets all channels. Personalise by item and facet | Active | FE14, FE15 |

## 2. Users and journeys

| ID | Decision | Status | Where |
|----|----------|--------|-------|
| D20 | No likes, ratings or favourites. Enjoyment inferred from behaviour. Nudges format frequency ±20% only | Active | FE15 |
| D21 | No separate placement test. Calibration runs continuously from the first tap | Active (via D97) | FE14, FE22 |
| D22 | ML only if offline, deterministic, explainable, with a rule-based fallback. No generative AI in the app. Population estimates shipped as data | Amended by D104 (population data opt-in, post-MVP) | FE13, FE17 |
| D23 | Plug-in games: each declares facets, levels, channels, load, assets and grader. Flags and experiments. Adding or retiring a game never touches the scheduler | Active | FE03, FE10, FE11 |
| D24 | Living Atlas replaces fog of war. Map always visible. Detail grows with learning and fades gently | Active | FE08 |
| D25 | Street-level zoom inside the app | Post-MVP (D122, PK07) | FE09 |
| D26 | Map tiles never from OSM's servers | Post-MVP; self-hosted only (D103) | FE09 |
| D27 | Bearing: great-circle arc, first shot graded, one correction shot, then the answer | Active | FE10, FE11 |
| D28 | Flow (river and range direction) is its own facet | Active | F14 |
| D29 | Earth structure layer (tectonic plates) | Active | F16 |
| D30 | Daily challenge in MVP, inside normal flow, position A/B tested | Amended by D79, D134, D174 | FE21 |
| D31 | Core vs curiosity items. Curiosity paused after repeated disengagement | Active | FE14 |
| D32 | Sessions are rounds with quiet atlas pauses. No pop-ups | Active | FE15, FE08 |
| D33 | Touching the globe pauses the round and opens Explore | Superseded → D133 | — |
| D34 | Language, units, time zone and region from the device, overridable. Defaults en-GB, metric | Active (no IP lookup, D103) | FE05 |
| D35 | Developer panel listing every experiment and flag with switches. Hidden in public builds | Active | FE03, FE23 |

## 3. Learning design

| ID | Decision | Status | Where |
|----|----------|--------|-------|
| D36 | Bearing distance counter ticks up and pops on landing. Not graded | Active | FE10 |
| D37 | Bearing beam covers a strip. Beam width is the difficulty. Replaces minimum hit zones | Active | FE10, FE11 |
| D38 | Earth layers are the first items | Active | content |
| D39 | Order: Earth layers → continents/oceans → reference lines → home country → world by fame. Plates in parallel | Active | FE14 |
| D40 | Solar system Easter egg post-MVP. Renderer not Earth-specific; "celestial body" is a valid item type | Post-MVP (hooks now) | FE06, domain |
| D41 | MVP builds structures for every facet type F01–F34: all answer types, multi-value facts with roles, date ranges, sets, sequences, comparisons, audio, generated exercises. Each has a test | Active | domain, FE10, FE11 |
| D42 | Content is a knowledge graph of items and typed relationships | Active | CP, FE14 |
| D43 | Topicality signal: reorders only, no headlines | Post-MVP (D50) | FE14 |
| D44 | One general chain mechanic (Pathfinder, Downstream) | Active | P7 |
| D45 | Kinds of knowledge: place, relationship, concept, skill, change over time | Active | domain |
| D46 | Territories are curiosity items | Active → D90 | content |
| D47 | Topicality needs sustained coverage (28-day average, 3 of 4 weeks, harder entry than exit, cap of about 10, editor overrides) | Post-MVP | — |
| D48 | Topicality sources: GDELT (UK outlets) and Wikimedia page views. BBC only if licensed | Post-MVP | — |
| D49 | F24 River course in MVP | Active | content, P6, P7 |
| D50 | Topicality ships post-MVP, structure in MVP | Active | domain |
| D51 | A Meet introduces location and name only. Later facets get mini-Meets | Active | FE16 |
| D52 | Lookalikes: establish one first, then introduce the other with a contrast card | Active | FE15, FE16 |
| D53 | "Show me" = Again internally, always neutral on screen | Active | FE11, FE16 |
| D54 | Viewing an Explore card ≥ about 3 s counts as a Meet | Superseded → D172 | FE19 |
| D55 | Emphasis system: weighted entries with dates and source. Reorders within a tier only. Strongest wins | Active (hook in MVP) | FE14, FE15 |
| D56 | Typing: exact match any rating. Near-miss accepted but capped at Hard. Guard against other real places | Active | FE11 |
| D57 | Audio: master, voice, music and effects sliders with mutes, plus haptics. Music dips under speech. Captions always | Amended by D161, D162 | FE12, FE23 |
| D58 | Points, combos and timers deferred to 3f. No visible timers meanwhile | Superseded → D76, D77 | — |
| D59 | FSRS-6 via ts-fsrs. Upgrade to FSRS-7 when it ships in a maintained library | Active (PK08) | FE13 |
| D60 | One parameter set per user | Active | FE17 |
| D61 | Recency weighting in the optimiser once supported | Active | FE17 |
| D62 | Shadow evaluation. Switch models only when they win on our data | Active (on device) | FE17 |
| D63 | Population and graph data feed selection. Small pre-trained model is a later research track under D22 | Amended by D104 | FE14 |
| D64 | Goals (facet set, deadline, owner) and deadline mode. Structure and hook in MVP | Amended by D170 (goal presets in MVP) | FE13, FE14 |
| D65 | Per-student weekly tests with a shared anchor subset. Common final test | Post-MVP | — |
| D66 | Home-country regions and their capitals are core and early | Active | FE14, content |
| D67 | In schools only teachers set exam goals. Personal licences set their own | Post-MVP | — |
| D68 | Printable A4 PDF tests with answer key. Printed final test is one version | Post-MVP | — |
| D69 | Nothing marks "done for today" | Active | FE15 |
| D70 | MVP region data: UK and US | Active | content |
| D71 | Round length about 60–120 s (placeholder) | Active (E06) | FE15 |
| D72 | Daily challenge after the warmup by default, A/B tested | Active (E04) | FE15, FE21 |
| D73 | Tap to continue between rounds is an A/B toggle. Default needs a Children's Code check before public release | Active (PK05) | FE27 |
| D74 | Fatigue chapter-end nudge is an A/B toggle | Amended by D143, D179 | FE27 |
| D75 | en-GB and en-US in MVP. Region from the device | Amended by D103 (no IP fallback) | FE05 |
| D76 | Rewards: atlas, then in-round feel, then rising-pitch combo. Score only in the daily challenge. Points variants A/B/C | Active (E03) | FE27 |
| D77 | No visible timers. Blitz optional, never affects grading | Active | FE26 |
| D78 | Streak spec: breaks never mentioned. Under-18s get gentler variants only | Active (all users, D93) | FE25 |
| D79 | Daily challenge is Worldle-style and shared. Only the first attempt feeds the scheduler | Superseded → D174 | FE21 |
| D80 | No notifications in MVP | Superseded → D177 | — |
| D81 | Interest forks: pick one of three, ≤ 30% of new-item slots, Topics view in Explore | Active | FE19, FE20 |
| D82 | Printed weekly tests: teacher picks shared or personalised. Recorded for comparison | Post-MVP | — |
| D83 | Class atlas: shared globe, no rankings, class completion goals | Post-MVP (D147) | — |

## 4. Content and data

| ID | Decision | Status | Where |
|----|----------|--------|-------|
| D84 | Natural Earth perspectives are the border base. A perspective file covers lines, status and names | Active | FE07, CP |
| D85 | Markets without a ready perspective: nearest one plus a reviewed list of changes | Active | FE07 |
| D86 | MVP UK and US, then Europe. China, Russia, India excluded pending legal review | Active (PK04) | — |
| D87 | No OSM data in learning content. Licence allowlist. Licence register in repo | Active | CP, FE24 |
| D88 | Content is plain-text files edited by PR with human review. Urgent fixes ship as a pack | Active | CP, FE02 |
| D89 | Non-commercial test audio in internal builds only. Licence-tagged. Release builds block it | Active | FE12, CP |
| D90 | Core set (193 UN + 2 observers), territories, counties, content-change rules per sections 4.2, 4.4, 4.6 | Active | content, FE13 |

## 5. Features, architecture and standards

| ID | Decision | Status | Where |
|----|----------|--------|-------|
| D91 | Milestones M0–M5 | Active | backlog |
| D92 | Local only in MVP. Export/import file is the backup | Active (import per D164) | FE01 |
| D93 | Everyone treated as under 18. No age question. Daily streak never offered | Active | All |
| D94 | Placement round with a skip button | Superseded → D97 | — |
| D95 | Stack and repo layout per file 07 | Active | All |
| D96 | Coding rules per file 07. CI blocks violations | Active | All |
| D97 | Hidden placement inside the first 2–3 rounds. No skip, no test wording | Active | FE22 |
| D98 | React for UI only. Learning logic outside it | Active | ui |
| D99 | US spelling in code identifiers. British in docs and en-GB text | Active | All |
| D100 | One active tab on web | Confirmed by D108 | FE01 |
| D101 | TOML for authoring. Compiled into the pack | Active | CP |
| D102 | Android cloud backup off, device-to-device transfer on | Confirmed by D109 | android |
| D103 | Privacy: nothing about the user leaves the device. No third-party code. Self-hosted assets. Static servers. No IP lookups. Internet permission only | Amended by D165 (adds VIBRATE), D178 (adds POST_NOTIFICATIONS) | All |
| D104 | A/B learning: internal testers in MVP, opt-in summaries later. Difficulty from fame and simulation | Confirmed by D110 (PK06) | FE03, FE04 |
| D105 | Network use: changes-only updates, immutable fingerprinted files, data-saver respected | Amended by D111 | FE02 |
| D106 | Size budgets: web ≤ 3 MB, Android ≤ 40 MB, audio per accent, history ≤ 6–25 MB/yr. `contexts` table | Active | FE01, CI |
| D107 | Signed packs (Ed25519), strict CSP, pinned dependencies with human review | Active | FE02, CI |
| D108 | One active tab with "Use here" takeover | Active | FE01 |
| D109 | Android: cloud backup off, device transfer on | Active | android |
| D110 | Experiments with internal testers in MVP. Opt-in summaries post-MVP | Active | FE03 |
| D111 | Background content check at most twice a day (Android, unmetered, battery not low). Web on open | Active | FE02 |
| D112 | Store WGS 84 lng/lat decimal degrees only. Projections for drawing only | Active | engine/geo |
| D113 | `{ lng, lat }` named fields. Pairs only in GeoJSON I/O. Branded `LngLat` | Active | All |
| D114 | At most 6 decimal places | Active | CP |
| D115 | Game maths on a sphere, R = 6,371.0088 km. Metres, degrees, clockwise from true north | Active | FE11 |
| D116 | Published distances computed with geographiclib in the pipeline, shown rounded | Active | CP |
| D117 | Geometry computed once at answer time and stored in the event | Active | FE01, FE11 |
| D118 | Taps graded by the engine against pipeline tap zones. Small items enlarged | Active | FE06, FE11 |
| D119 | Own Three.js globe. No Cesium, no MapLibre in MVP | Active | FE06 |
| D120 | 180° splits exist only in source GeoJSON. Pipeline rejoins and fixes ring direction | Active | CP |
| D121 | Labels hidden until the name facet is established, and during questions about that item | Active | FE06, FE08 |
| D122 | No street detail in MVP | Active (PK07) | FE09 |
| D123 | Lucide icons via `<Icon>` wrapper, per-icon imports | Active | ui |
| D124 | Accessibility built in: WCAG 2.2 AA plus Android guidelines | Active | All |
| D125 | Colour-blind-safe colours are the only colours: never colour alone, Okabe-Ito, no red/green | Active | ui, globe |
| D126 | Compass pick uses only pairs where great-circle and compass sectors agree | Active | F12 |
| D127 | No flag pairs skipped. Lookalikes tagged by simulation. Contrast cards use non-colour cues | Active (PK03) | CP, FE16 |
| D128 | Accessibility aids never lower a rating | Active | FE11 |
| D129 | Colour-names button on flag questions. Optional colour-vision setting, device only, never inferred | Active | FE10, FE23 |
| D130 | Three.js WebGLRenderer (WebGL2), pinned, upgraded in steps | Active | FE06 |
| D131 | Web first-load budget stays at about 3 MB | Active | CI |
| D132 | Flag lookalike approach earmarked for post-MVP review | Active (PK03) | — |
| D133 | Touching the globe never pauses a round. A clear change of intent parks it (60° for 3 s, 2 zoom steps; placeholders) | Amended by D173 (E07) | FE15, FE19 |
| D134 | Daily challenge resets at 04:00 local | Active | FE21 |

## 8. Experiments and metrics

| ID | Decision | Status | Where |
|----|----------|--------|-------|
| D149 | North star: retained knowledge. Primary: surprise-check accuracy, efficiency, calibration. Time spent is never a goal | Active | FE04 |
| D150 | Method: simulations first, within-tester switching where safe, pre-registered files in `experiments/`, sequential statistics, default unless clearly beaten, minimum 2 weeks, max about 3 live | Amended by D184 | FE03, tools |
| D151 | "Share a summary" counts-only file for testers | Active | FE04, FE23 |
| D152 | MVP experiment register E01–E07 | Amended by D179 (adds E08), D184 (adds E09) | FE27 |

## 9. Quality and release

| ID | Decision | Status | Where |
|----|----------|--------|-------|
| D135 | Minimum Android 10 (API 29), target API 36 | Active | android |
| D136 | Devices: Galaxy A07 4G (targets), Redmi A5 (floor), Pixel 9 Pro (high end), an Android 10 phone, a low-cost tablet, web set. Minimum Safari 16.4 | Active | 09 |
| D137 | Support: event log readable forever; packs served 5 years per app version; devices supported while their WebView is updated + 12 months | Active | FE01, FE02 |
| D138 | Two release streams: content packs any time; app about every 4 weeks, staged rollout | Active (PK02) | 09 |
| D139 | Risky features behind flags for fast switch-off | Active | FE03 |
| D140 | Test plan and accessibility testing per file 09. External WCAG audit before public release | Active | CI |

## 10. Legal and compliance

| ID | Decision | Status | Where |
|----|----------|--------|-------|
| D141 | No Play Age Signals in MVP. Android UK only; US via web | Active (PK09) | android |
| D142 | Play target ages 9–12, 13–15, 16–17, 18+ | Active | store |
| D143 | DPIA before closed test, including D73 condition. D74 on by default for public release | Active | docs/legal |
| D144 | Three-layer privacy policy (en-GB, en-US), complaints procedure, ICO fee decision | Active (PK01) | docs/legal |
| D145 | Tester agreement: consent per data type, 90-day deletion | Amended by D180 | docs/legal |
| D146 | Border notice on credits, "Report a content issue", 48-hour urgent fix target | Active | FE24, CP |
| D147 | Class atlas needs an Online Safety Act check before release | Active | — |
| D148 | Paid UK/US privacy-law review required | Active (PK10) | — |

## 11. Added after the freeze (2026-11-17)

| ID | Decision | Status | Where |
|----|----------|--------|-------|
| D153 | Flat map in MVP: Equal Earth, globe morphs into it, lazy-loaded cut mesh, taps graded via inverse projection | Active | FE06 |
| D154 | Cross-section: SVG + P5 in MVP; 3D cutaway post-MVP behind `CrossSectionView` | Active (PK12) | FE10 |
| D155 | Typeface: Atkinson Hyperlegible Next, self-hosted | Active | ui |
| D156 | Audio: AAC-LC .m4a | Active | FE12 |
| D157 | Menus and settings follow system light/dark; globe always on dark space; high contrast separate | Active | ui, globe |
| D158 | "No time pressure" forces tap to continue, overrides E01; on if a screen reader is reported | Active | FE15, FE23 |
| D159 | Single-key shortcuts can be turned off; globe keys only while the globe has focus | Active | ui, FE06 |
| D160 | Atlas summary: text version of the Living Atlas | Active | FE08 |
| D161 | Music off by default; no music shipped until sourced; channel and slider remain | Active | FE12, FE23 |
| D162 | Positive haptics in MVP: correct answer, Bearing hit, atlas bloom. Never for incorrect, close, Show me or hints. On by default where supported; follows Android's touch-feedback setting; web only where the Vibration API exists | Active | FE12, FE23 |
| D163 | Content packs, perspective and flag changes apply at a pause, never mid-round | Active | FE02, FE03, FE07 |
| D164 | Import merges by event ID, never replaces. Whole file validated first; all-or-nothing; newer format rejected; settings last-writer-wins; experiment assignments stay per install | Active | FE01 |
| D165 | Android permissions: `INTERNET` and `VIBRATE` only. Amends D103 | Superseded → D178 | android |
| D166 | New items follow the D39 start sequence, then fame tiers. Hidden placement uses adaptive probes (FE22). No Elo. Every new item gets a Meet then an R1 question; the Elo quick-check and guess-first routes are dropped. Amends 03 §3 (breadth item 5), §4.1, §7.8 | Active | FE14, FE16, FE22 |
| D167 | Facet unlocks follow a prerequisite graph in the pack, checked in CI for cycles and reachability. Replaces the linear chain in 03 §3 (depth) | Active | FE14, CP |
| D168 | Level ladder by stability: R1 < 2 days, R2 2–7, R3 7–30, R4 ≥ 30 (placeholders). At most one level up per review, one down after a lapse. Learning steps: later in the same round, next round, next local day. Amends 03 §4.4, §7.3 | Active | FE13, FE14 |
| D169 | Optimiser: first run after 1,000 reviews over 30 local days, re-run after 500 more reviews or 30 days. Parameters adopted only if time-split log loss improves ≥ 1% (placeholders). Model switches still follow D62. Amends 03 §7.6 | Active | FE17 |
| D170 | Learner goal presets ship in the MVP: weights only, no deadline, stored as a setting. Deadline mode and teacher goals stay post-MVP. Amends D64 | Active | FE14 |
| D171 | Daily budget is a user setting: 5, 10, 15 or 20 minutes of active practice, default 10 (placeholder). Amends 03 §7.9 | Active | FE14, FE15 |
| D172 | Explore is never learning: viewing a place card isn't a Meet, and Explore appends no `AnswerRecorded` or `ItemMet`. Supersedes D54. Amends 02 J5.2 | Active | FE19 |
| D173 | Park thresholds: on non-map questions, a turn > 30° or a zoom > 1 detail level parks the round. Camera movement never parks a map-answer question. Opening the menu parks the round. Placeholders; E07 may test others. Amends D133 values | Active (E07) | FE15, FE19 |
| D174 | Daily challenge: 5 questions (P2, P8, P6, one P3 flag pick), the same for everyone, perspective-safe. Separate from learning: no effect on scheduler, atlas, metrics or Meets. No bonus stages, no archive. Supersedes D79. Amends D30, 02 J9 | Active | FE21 |
| D175 | First run: a start screen (globe, one line, "Start", links to accessibility settings and import, privacy line) before the first round. The first round opens with a Meet then an R1 question. One optional budget-and-goal card after round 3. Amends 06 S01, 02 J1.1 | Active | FE22 |
| D176 | The streak module is a weekly rhythm: a week counts with at least 2 practice days (placeholder). Flag on by default; the user can hide it. No daily streak (D93), no monthly variant in MVP. Amends D15, 03 §9 | Active | FE25 |
| D177 | Android reminders: off by default, turned on only in Settings, inexact, at most one per local day, skipped on practice days, stop after 7 unopened days. Neutral wording. None on web. Supersedes D80. Amends 01 scope, README "Out", 06 principle 3 | Active | FE25 |
| D178 | Android permissions: `INTERNET`, `VIBRATE`, `POST_NOTIFICATIONS` only. Any permission merged in by a library is removed in the manifest or needs a new D entry. No exact alarms, no location. Supersedes D165 | Active | FE12, FE25, FE29 |
| D179 | Chapter end also triggers after 25 minutes of active practice in a session (placeholder). At most once per session unless fatigue worsens. A/B tested in internal and closed builds as E08. Amends D74 | Active (E08) | FE27 |
| D180 | Tester log donation in internal and closed builds: consent per data type, full preview, share sheet only, random donation code. Kept up to 24 months (placeholder), deleted within 90 days of a request. Adds to D151. Amends D145 | Active | FE30 |
| D181 | Progress view (FE28, S23): a written summary of learning beside the Living Atlas. Places link to S14 and aren't repeated. Amends 06 screen list | Active | FE28 |
| D182 | M5 holds FE25–FE31: optional modules (FE25–FE27) and release readiness (FE28–FE31). No M6; D91 unchanged. Amends README milestones | Active | backlog |
| D183 | Data held off the device: pack and policy host keeps no access logs, or truncated IPs only, deleted within 7 days. Feedback, content-issue and diagnostics emails deleted once handled, within 90 days; content-issue text kept without the sender. Tester logs per D180 (placeholders) | Active | 10, FE29 |
| D184 | Experiment decisions: simulation is the main evidence of benefit. Closed-test data can only rule out harm (margins in 08 §7). Public default stays A when evidence is unclear. Each experiment is analysed once at its pre-registered end date, replacing D150's sequential statistics. FSRS-7 trial registered as E09 | Active | 08, FE13, FE27 |

