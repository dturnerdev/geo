# M0 — Foundations (FE01–FE05)

**Status:** v1.0. Every feature uses the template below. Acceptance criteria
(AC) are written to become automated tests; "(manual)" marks the exceptions.

## Feature template

```
## FEnn Name
Milestone · Packages · Decisions · Depends on
### Purpose
### Behaviour (MUST / MUST NOT)
### Interfaces
### Edge cases
### Acceptance criteria
### Out of scope
```

## M0 setup tasks (not features)

| Task | Output |
|------|--------|
| Repo scaffold per 07 §3, pnpm workspaces, strict tsconfig | Builds green |
| CI gates 1, 2, 7, 8, 9, 11 live from day one; the rest stub-pass until their feature lands | CI pipeline |
| Design tokens: neutral scales per theme | `packages/ui/tokens.ts` |
| ADR: Android export/import file mechanism (candidate: Capacitor Filesystem + Share) | ADR |
| ADR: Ed25519 verification (Web Crypto vs a small audited library), checked against the Safari 16.4 minimum | ADR |
| ADR: haptics. Does `@capacitor/haptics` follow Android's touch-feedback setting? If not, a minimal native wrapper | ADR |
| ADR: font subsetting allowed under the OFL terms | ADR |
| ADR: Android background check mechanism (WorkManager) | ADR |

---

## FE01 Event store and persistence

**Milestone:** M0 · **Packages:** domain, storage, app-shell, apps/web, apps/android ·
**Decisions:** D10, D11, D13, D92, D100, D106, D108, D109, D117, D137, D164 ·
**Depends on:** none

### Purpose
Store every learning action as an append-only event, rebuild state from it,
and let users back up, merge and delete their data.

### Behaviour
1. Every event uses one envelope:

   | Field | Type | Notes |
   |-------|------|-------|
   | `id` | `EventId` | UUIDv7, created in app-shell (never the engine) |
   | `type` | string literal | Discriminant |
   | `schema` | int | Version of this event type's payload |
   | `at` | int | UTC ms. Monotonic per device: `max(now, lastAt)` |
   | `tz` | string | IANA zone at the time of the event |
   | `origin` | string | Random per-install tag, used only to tell merged histories apart. Not the experiment install ID |
   | `contextId` | int | Row in `contexts` (app version, content pack version, grader versions, platform) (D106) |
   | `payload` | object | Per type, Zod-validated |

2. MVP event types: `ItemMet`, `AnswerRecorded` (rating, level, format, raw
   response, stored geometry, aids/hints used, surprise flag, round seed),
   `RoundStarted`, `RoundEnded`, `RoundParked`, `RoundResumed`,
   `SettingChanged`, `ExperimentAssigned`, `ExperimentExposed`,
   `ParametersAdopted`, `EmphasisAdded`, `EmphasisEnded`,
   `DailyChallengeCompleted`, `ContentPackApplied`, `ImportCompleted`.
   New types need a spec change.
3. `append` writes all given events in **one transaction** before the next
   question appears. Nothing ever updates or deletes an event row.
4. **Ordering:** by `at`, then `id`.
5. **Read-time upgrades:** old payload versions are upgraded by pure
   `upgradeVnToVn+1` functions when read. Stored rows are never rewritten.
   Every historic version keeps a fixture test for ever (D137).
6. **Snapshots** are a disposable cache keyed by (projection version, last
   event ID). On any mismatch, discard and rebuild.
7. **Web:** `@sqlite.org/sqlite-wasm` with `opfs-sahpool` in a dedicated Worker.
   - One active tab via the Web Locks API. A second tab shows S19.
   - "Use here" asks the holder (BroadcastChannel) to finish its write,
     release the lock and show S19 itself (D108).
   - Request persistent storage after the first completed round, not at launch.
8. **Android:** `@capacitor-community/sqlite`, WAL mode, app-private storage.
   Cloud backup off, device-to-device transfer on (D109).
9. **Export (S17):** gzipped JSON Lines.
   - Line 1 is a header: `{ format: "geo-export", formatVersion, exportedAt,
     appVersion, eventCount, sha256 }`. Then one event per line, contexts inlined.
   - Diagnostics are not included.
   - Filename: `geography-progress-YYYY-MM-DD.jsonl.gz`.
10. **Import (D164):**
    1. Validate the whole file first: header, checksum, every line with Zod,
       format version supported.
    2. Show a preview: answers in the file, date range, how many are new to this device.
    3. On confirm, insert only events whose `id` isn't present, in one transaction.
    4. Rebuild state from the merged log. Append `ImportCompleted { added, skipped, sourceExportedAt }`.
    5. Settings: last-writer-wins by `at`.
    6. Experiment assignment always uses this install's ID. Imported
       `ExperimentAssigned` events from other origins are kept but ignored for assignment.
    7. Optimiser: the most recent `ParametersAdopted` applies. The optimiser
       re-runs at the next trigger check.
11. **Delete everything (S17):**
    - Two-step confirmation, with export offered first.
    - Removes the database, snapshots, diagnostics and settings. Generates a new install ID and origin.
    - The only operation that removes events.
12. **Storage failure:** if `append` fails, keep the pending events in memory,
    retry once, then show S21 with export. Never drop an answer silently.

### Interfaces

```ts
export interface EventStore {
  append(events: readonly DomainEvent[]): Promise<Result<void, StoreError>>;
  readAll(): AsyncIterable<DomainEvent>;          // ordered by (at, id), upgraded
  count(): Promise<number>;
  hasIds(ids: readonly EventId[]): Promise<ReadonlySet<EventId>>;
  loadSnapshot(): Promise<Snapshot | null>;
  saveSnapshot(snapshot: Snapshot): Promise<void>;
  importBatch(events: readonly DomainEvent[]): Promise<Result<ImportReport, StoreError>>; // one transaction
  wipe(): Promise<void>;
}

export type StoreError =
  | { kind: 'full' } | { kind: 'blocked' } | { kind: 'corrupt' } | { kind: 'locked-elsewhere' };
```

Adapters: `SqliteNativeStore`, `SqliteWasmStore`, `InMemoryStore`. All pass one shared suite.

### Edge cases
- Device clock set backwards: `at` stays monotonic. The real clock is kept in diagnostics.
- Time zone change mid-session: each event keeps its own `tz`.
- Import of a file from a newer format version: rejected with "This file is
  from a newer version of the app. Update the app, then try again."
- Import of the device's own earlier export: adds only missing events.
- App killed mid-transaction: SQLite rolls back. The answer reappears as unanswered.
- OPFS unavailable (private browsing in some browsers): S21 explains that
  progress can't be saved here and offers to continue without saving.
- Very large logs: `readAll` streams and never loads all rows at once.

### Acceptance criteria
- **AC-01.1** All three adapters pass the shared EventStore suite.
- **AC-01.2** Killing the process immediately after an answer is accepted
  and the next question shows loses no events (Android and web E2E).
- **AC-01.3** State restore from 10,000 events < 2 s on the Galaxy A07 4G.
- **AC-01.4** `append` of one answer: p95 < 20 ms on the reference device (placeholder).
- **AC-01.5** Export then import into an empty store gives a projection equal to the original.
- **AC-01.6** Importing the same file twice: the second import adds 0 events; state unchanged.
- **AC-01.7** Merging logs from two devices gives the same state as
  projecting the union of both logs in (at, id) order (property test).
- **AC-01.8** A file with one corrupt line, wrong checksum or newer format
  version is rejected and the store is unchanged.
- **AC-01.9** A fixture for every historic payload version reads correctly through the upgraders.
- **AC-01.10** Second web tab shows S19; "Use here" moves the lock within 1 s;
  no write ever happens from two tabs (Playwright).
- **AC-01.11** Android manifest: cloud backup excluded, device transfer
  included (CI manifest check).
- **AC-01.12** After "Delete everything", the store is empty and the install ID differs.
- **AC-01.13** A simulated full disk shows S21 with export; the pending answer is not lost while the app stays open.

### Out of scope
Accounts, sync, server storage (post-MVP; the envelope already supports them).

---

## FE02 Content packs and updates

**Milestone:** M0 · **Packages:** content, app-shell, apps/web, apps/android ·
**Decisions:** D88, D105, D107, D111, D137, D139, D146, D163 ·
**Depends on:** FE01

### Purpose
Ship content, flags, experiment definitions and tuning as signed packs that
work offline, update with little data and can't break a session.

### Behaviour
1. **Bundled pack:** every app build includes a full pack, so first launch works offline.
2. **Server layout (static):**
   - `/packs/manifest-v{dataFormat}.json`, signed.
   - `/packs/chunks/{sha256}`: immutable, fingerprinted.
   - No cookies, no query parameters, no identifying headers.
3. **Check:**
   1. Fetch the manifest for this app's data-format version (conditional request).
   2. Verify the Ed25519 signature against keys embedded in the app (current + next, for rotation).
   3. Download only missing chunks. Verify each hash.
   4. Validate the assembled pack with Zod.
   5. Stage it as "ready".
4. **When checks run (D111):**
   - Android: a background job at most every 12 h, only on unmetered
     networks with battery not low. Also on launch if the last check was more than 12 h ago and the network is unmetered.
   - Web: on open, if online.
   - Both: respect data-saver signals and the "Network" setting (mobile data off by default).
5. **Apply:** a ready pack is applied at the next pause or launch, never mid-round (D163).
   Append `ContentPackApplied`.
6. **Rollback:** keep the previous pack.
   - If the new pack fails to load, revert automatically and log to diagnostics.
   - A manifest may name a `rollbackTo` version.
7. **Version window:** a pack declares its data-format version. The app
   ignores packs it can't read (D137).

### Interfaces

```ts
export interface ContentSource {
  current(): ContentPack;
  checkForUpdate(reason: 'launch' | 'background' | 'open'): Promise<Result<UpdateStatus, PackError>>;
  applyReadyPack(): Result<PackVersion | null, PackError>;   // called by app-shell at a pause
}
export type PackError =
  | { kind: 'offline' } | { kind: 'bad-signature' } | { kind: 'bad-hash' }
  | { kind: 'invalid-content'; issues: readonly string[] } | { kind: 'unsupported-format' };
```

### Edge cases
- Download interrupted: completed chunks are kept; the next check resumes.
- Manifest valid but a chunk is missing on the server: the update is
  abandoned and the current pack stays.
- Clock wrong: signature checks don't depend on time.
- A pack removes an item the user has progress on: the item is retired from
  scheduling; events stay (04 §7).

### Acceptance criteria
- **AC-02.1** First launch in airplane mode reaches the first question.
- **AC-02.2** A pack with one altered byte, a wrong signature or an unknown key is rejected; the current pack stays.
- **AC-02.3** A ready pack is never applied while a round is in progress (E2E with forced update mid-round).
- **AC-02.4** An update changing one item downloads only the affected chunks.
- **AC-02.5** Android on metered data: no background check (instrumented test with network conditions).
- **AC-02.6** No more than 2 background checks per 24 h (scheduler test).
- **AC-02.7** A pack failing load-time validation triggers automatic rollback, logged to diagnostics.
- **AC-02.8** All requests go only to our host; no cookies or identifiers (zero-outside-requests test plus header assertion).

### Out of scope
Server-side tooling beyond static hosting; delta compression within chunks.

---

## FE03 Feature flags and experiments

**Milestone:** M0 · **Packages:** domain, engine, content, ui (developer panel), app-shell ·
**Decisions:** D23, D35, D104, D110, D139, D150, D152, D158, D163 ·
**Depends on:** FE01, FE02

### Purpose
Switch features on and off from content packs, and run pre-registered
experiments with internal testers, without app updates.

### Behaviour
1. Flags and experiments are defined in the pack (`content/experiments/`):
   - Flags: ID, default, description, owner, review date.
   - Experiments: ID, version, variants with weights, link to `experiments/Exx.md`.
2. **Build channels:** `internal`, `closed`, `public`. Experiments run only in
   `internal` and `closed` (D110). `public` always gets each experiment's default variant.
3. **Precedence** (highest first):
   1. Compliance overrides (e.g. D158 forces tap to continue)
   2. Developer panel override (internal builds only)
   3. Experiment variant
   4. Pack flag value
   5. Code default
4. **Assignment:** `bucket = hash32(installId + ':' + experimentId + ':' + version) mod 10000`,
   mapped to variants by weight.
   - Recorded once as `ExperimentAssigned`.
   - Sticky until the experiment version changes.
   - `hash32` is implemented in `engine/random.ts` with published test vectors.
5. **Exposure:** `ExperimentExposed` is logged the first time in a session
   that a variant actually changes what the user sees.
6. **Changes** from a new pack take effect at the next pause (D163).
7. **Developer panel (S22):** lists every flag and experiment, with current
   value, source of the value and an override switch. Removed from public builds at compile time.
8. CI checks that every experiment in the pack has an `experiments/Exx.md`
   with every field of the 08 §8 template filled in, except the result.

### Interfaces

```ts
export interface FlagReader {
  isOn(flag: FeatureFlagId): boolean;
  variant<E extends ExperimentId>(experiment: E): VariantOf<E>;
  explain(flagOrExperiment: string): ValueSource;   // for the developer panel
}
```

The engine receives a resolved, immutable `FlagSnapshot` per round. It never reads flags itself.

### Edge cases
- Weights changed without a version bump: existing assignments stay; CI warns.
- Experiment removed from the pack: everyone falls back to the flag/code default at the next pause.
- Imported `ExperimentAssigned` from another origin: ignored for assignment (D164).

### Acceptance criteria
- **AC-03.1** `hash32` matches its test vectors on web and Android.
- **AC-03.2** Over 100,000 random install IDs, each variant gets its weight ±1%.
- **AC-03.3** Public builds contain no developer-panel code (bundle inspection) and always resolve to default variants.
- **AC-03.4** With "No time pressure" on, E01 can never produce auto-continue (property test).
- **AC-03.5** A flag switched off in a new pack changes behaviour at the next pause, not mid-round.
- **AC-03.6** CI fails for an experiment without a complete `experiments/Exx.md`.

### Out of scope
Server-side experiment analysis (tools/ scripts handle tester summaries).

---

## FE04 Local metrics and diagnostics

**Milestone:** M0 (metric functions grow in M3) · **Packages:** engine, storage, ui, app-shell ·
**Decisions:** D5, D103, D145, D149, D150, D151 ·
**Depends on:** FE01

### Purpose
Compute success metrics on the device from the event log, keep a local
technical log, and let testers share a counts-only summary.

### Behaviour
1. **Metrics are pure functions** in `engine/metrics/`, computed from the
   event log only. Same log, same result, every platform.

   | Metric | Definition (placeholders in `tuning.ts`) | Role |
   |--------|-------------------------------------------|------|
   | Durable knowledge | Item-facets with predicted recall ≥ 0.90 in 30 days | North star (D149) |
   | Surprise-check accuracy | Correct share of surprise-flagged answers on item-facets first learned ≥ 30 days ago | Primary |
   | Efficiency | Durable item-facets gained per hour of active practice | Primary |
   | Calibration | Log loss and RMSE (bins) of predicted vs actual recall. Same-day answers excluded | Primary (health check) |
   | Transfer | Correct share in a format never used before for that item-facet | Secondary |
   | Return after gaps, session length spread | Descriptive only | Guardrail, never a target |

2. **Active practice time:** sum of per-answer response times, each capped
   at 60 s (placeholder). Idle and parked time never counts.
3. **"Show me"** is counted separately from incorrect answers in every metric.
4. **Minimum sample (placeholders):** below this, a metric returns `null` and
   shows "Not enough data yet", never 0.
   - Rates: 30 answers.
   - Calibration: 200 answers, with at least 20 answers per bin. Smaller bins
     merge with a neighbour.
   - Surprise-check accuracy: 20 checks.
5. **Per-variant metrics:** for each experiment, metrics are computed from the
   first `ExperimentExposed` onwards, grouped by variant.
6. **When computed:** on demand (developer panel, summary) and at pauses at
   most once per session. On web, inside the storage Worker. Never blocks a round.
7. **Diagnostics log** (device only, separate from the event log):
   - Records errors, storage failures, pack rollbacks, performance timings
     (cold start, round build, frame-rate samples) and real-clock readings.
   - Never records typed answers, place choices or free text.
   - Ring buffer capped at 1 MB or 30 days, whichever comes first (placeholders).
   - Not included in exports. Removed by "Delete everything".
8. **Share a summary (D151):**
   - Available in `internal` and `closed` builds only (public post-MVP, PK06).
   - Contains only allowlisted fields: app version, pack version, build channel,
     platform and OS major version, experiment variants, metric values, and
     counts in fixed buckets (answers, rounds, active days).
   - Never contains event or install IDs, timestamps finer than a calendar
     week, time zone, item-level answers or diagnostics text.
   - The full contents are shown in plain language before sharing. The user
     shares it with the system share sheet (Android) or a download (web).
     The app never sends it.

### Interfaces

```ts
export function computeMetrics(
  events: Iterable<DomainEvent>, content: ContentIndex, now: number,
): MetricsReport;

export interface MetricsReport {
  durableKnowledge: number;
  surpriseAccuracy: number | null;
  efficiencyPerHour: number | null;
  calibration: { logLoss: number; rmseBins: number } | null;
  transfer: number | null;
  byVariant: ReadonlyMap<ExperimentId, ReadonlyMap<VariantId, MetricsReport>>;
}

export interface DiagnosticsLog {
  record(entry: DiagnosticEntry): void;
  recent(limit: number): readonly DiagnosticEntry[];
  clear(): void;
}

export function buildSummary(report: MetricsReport, meta: SummaryMeta): TesterSummary; // Zod allowlist schema
```

### Edge cases
- Merged histories from two devices: metrics include all events; each is counted once.
- Device clock wrong: metrics use monotonic `at`; the diagnostics real-clock readings flag the gap.
- Item retired by a pack: its history still counts towards past metrics but not durable knowledge.
- Brand-new user: every metric except durable knowledge is `null`.

### Acceptance criteria
- **AC-04.1** Golden fixture logs produce exact expected metric values on web and Android (reference replay).
- **AC-04.2** Same-day answers are excluded from calibration (unit test).
- **AC-04.3** "Show me" answers never count as incorrect in any metric (property test).
- **AC-04.4** A metric below its minimum sample returns `null`.
- **AC-04.5** The summary file validates against the allowlist schema; any extra field fails CI.
- **AC-04.6** The summary preview matches the shared file byte for byte.
- **AC-04.7** Generating or sharing a summary makes no network request.
- **AC-04.8** The diagnostics log never exceeds its cap, and contains no answer content (schema test).
- **AC-04.9** Metrics for a 10,000-event log compute in < 1 s on the Galaxy A07 4G, off the main thread.
- **AC-04.10** No "Share a summary" option exists in public builds.
- **AC-04.11** With 199 answers calibration shows "Not enough data yet"; with 200 it shows a value, and no bin used has fewer than 20 answers (unit test).

### Out of scope
Server-side collection, dashboards, opt-in summaries for all users (PK06).

---

## FE05 Localisation, units and time

**Milestone:** M0 · **Packages:** domain, engine (`time/`), ui, app-shell ·
**Decisions:** D34, D75, D99, D103, D112, D115, D116, D134 ·
**Depends on:** FE01

### Purpose
Give every screen correct language, spelling, number formats, units and
local-day boundaries, detected from the device and overridable, with no
network lookups.

### Behaviour
1. **Locales:** en-GB (source) and en-US. All UI text lives in FormatJS ICU
   message files. Code never joins sentence fragments.
2. **Detection** (device only, no IP lookup, D103):

   | Device language | Device region | Locale | Distance units |
   |-----------------|---------------|--------|----------------|
   | English | US | en-US | Miles |
   | English | Any other | en-GB | Kilometres |
   | Not English | US | en-US | Miles |
   | Not English | Any other | en-GB | Kilometres |

   - If the device exposes a measurement-system preference, it overrides the
     units column.
   - The device region is passed on as `deviceRegion` for perspective
     selection in FE07. FE05 does not choose a perspective.
3. **Overrides:** language, units and region can each be changed in settings.
   Changes are stored as `SettingChanged` events and take effect at once,
   except perspective changes, which wait for a pause (D163).
4. **Numbers and units:** all formatting through `Intl.NumberFormat` and
   `Intl.DateTimeFormat`. Internal values stay SI: metres and degrees (D115).
   Displayed distances are rounded per D116 rules (placeholders).
5. **Time:**
   - Events store UTC ms plus IANA zone (FE01).
   - The local day runs 04:00 to 04:00 (D134). All local-day maths lives in
     `engine/time/` and nowhere else.
   - The current zone comes from `Intl.DateTimeFormat().resolvedOptions().timeZone`,
     read by app-shell and passed in.
6. **Spelling:** British spelling in en-GB strings, US spelling in en-US strings,
   US spelling in code identifiers (D99). Place names come from the
   perspective file, not the message files.
7. **CI checks:** every key exists in both locales; ICU syntax valid; no unused keys;
   a pseudo-locale (accented, +40% length) builds for layout testing.

### Interfaces

```ts
export type Locale = 'en-GB' | 'en-US';
export type DistanceUnit = 'km' | 'mi';

export interface LocaleSettings {
  locale: Locale;
  units: DistanceUnit;
  deviceRegion: RegionCode | null;   // ISO 3166-1 alpha-2, for FE07
  timeZone: IanaZone;
}

export function resolveLocale(device: DeviceLocaleInfo, overrides: LocaleOverrides): LocaleSettings;
export function localDay(at: number, tz: IanaZone): LocalDay;          // engine/time, 04:00 boundary
export function formatDistance(metres: number, s: LocaleSettings): string;
```

### Edge cases
- Clocks change (UK last Sunday of March and October, US second Sunday of
  March and first Sunday of November): 04:00 local always exists, so the day
  boundary is unaffected. Tested anyway.
- Travel across zones: each event's own `tz` decides its local day. A day
  can be shorter or longer than 24 h. Nothing breaks.
- Device region missing: `deviceRegion` is `null`; locale falls back to en-GB, kilometres.
- Language changed mid-round: text updates at once; the round continues.

### Acceptance criteria
- **AC-05.1** `resolveLocale` matches the detection table for every row (unit test).
- **AC-05.2** `localDay` puts 03:59 local on the previous day and 04:00 on the
  new day, including on clock-change days in Europe/London and America/New_York.
- **AC-05.3** `localDay` gives identical results on web and Android (reference replay).
- **AC-05.4** CI fails on a missing key, invalid ICU message or unused key.
- **AC-05.5** The pseudo-locale at 200% text size shows no clipped or overlapping text on any M0 screen (Playwright + manual).
- **AC-05.6** No locale or region detection makes a network request.
- **AC-05.7** An override survives restart and import (`SettingChanged`, last-writer-wins).
- **AC-05.8** No string is built by joining fragments (lint rule).

### Out of scope
Languages other than English, right-to-left layouts, temperature and area
units (added when a facet needs them).
