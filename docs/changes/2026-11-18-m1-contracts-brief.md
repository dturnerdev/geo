# M1 contracts brief, pins and sources

**Date:** 2026-11-18
**Branch:** `spec/m1-contracts` (from `origin/main`)
**Scope:** inputs for M1 contracts preparation only. No design decisions made; no new types, schemas, or file formats proposed. Items requiring decisions are recorded.

## Pins

| Package | Version | Licence | Used by |
|---------|---------|---------|---------|
| `three` | 0.187.0 | MIT | FE06 (globe and flat map) |
| `d3-geo` | 3.1.2 | ISC | FE06 (flat map projection and inverse projection) |
| `troika-three-text` | 0.53.1 | MIT | FE06 (labels) |

### Notes
- Versions selected as latest stable (no alpha/beta/rc/next) from `npm view <pkg> version` on 2026-11-18.
- `troika-three-text@0.53.1` peer dependency: `three: '>=0.125.0'`. This range includes `three@0.187.0`, so `three@0.187.0` is used.
- `npm view` reported no `types` or `typings` field for `three@0.187.0`, `d3-geo@3.1.2`, or `troika-three-text@0.53.1`. No `@types` packages were added.
- Pins added in `docs/spec/07-architecture-and-standards.md` (§2 Stack) and `AGENTS.md` (Code: allowed runtime dependencies). No other text changed in 07.


## Sources

### Manifest entries (`content/sources/natural-earth.toml`)
| Theme | Release tag | Download URL | SHA-256 | Licence | Status |
|-------|-------------|--------------|---------|---------|--------|
| `ne_110m_admin_0_countries` | `v5.1.2` | https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_admin_0_countries.geojson | `6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f` | public domain | unreviewed |
| `ne_50m_admin_0_countries` | `v5.1.2` | https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson | `3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb` | public domain | unreviewed |
| `ne_10m_admin_0_countries` | `v5.1.2` | https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_countries.geojson | `239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255` | public domain | unreviewed |
| `ne_10m_admin_0_countries_gbr` | `v5.1.2` | https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_countries_gbr.geojson | `7acfd0ccade031cd165630e4d5e9b51650079976d94008100407d03e0e83a492` | public domain | unreviewed |
| `ne_10m_admin_0_boundary_lines_land` | `v5.1.2` | https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_boundary_lines_land.geojson | `74d9c16229c095fde65943a9919e337682f044bcebccb120764f38edf3b70f4a` | public domain | unreviewed |
| `ne_10m_admin_0_disputed_areas` | `v5.1.2` | https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_disputed_areas.geojson | `9cafef8b7dfb6b164dc58f218f981f4ace9f716f6c03795d4c62d1ac9f3d50f5` | public domain | unreviewed |
| `ne_10m_admin_1_states_provinces` | `v5.1.2` | https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_1_states_provinces.geojson | `22d0e3ad85eb3e27f17cabf8ba2d50e554fbc27a87796ff891d958185da62fb5` | public domain | unreviewed |

### Notes
- Source: latest release of `nvkelso/natural-earth-vector` checked via `gh release view -R nvkelso/natural-earth-vector` — tag `v5.1.2` (2022-05-13). Natural Earth is public domain.
- Spec search (`rg -n -i "natural earth|admin.?0|admin.?1|boundary|disputed|POV|point.of.view" docs --glob '!docs/build/**' --glob '!docs/changes/**'`) found Natural Earth/perspective/disputed references but **no explicit Natural Earth theme filenames** (no `ne_*` theme names in spec). All seven themes were therefore taken from the requested default set and recorded as defaults: `ne_110m_admin_0_countries`, `ne_50m_admin_0_countries`, `ne_10m_admin_0_countries`, `ne_10m_admin_0_countries_gbr` (UK point of view), `ne_10m_admin_0_boundary_lines_land`, `ne_10m_admin_0_disputed_areas`, `ne_10m_admin_1_states_provinces`.
- Release `v5.1.2` has no release assets; the tag contains `geojson/<theme>.geojson` for all required themes, so GeoJSON files were downloaded (not shapefiles).
- Files downloaded to `content/sources/natural-earth/` (07 does not specify a source-data location). Data files are gitignored (`content/sources/natural-earth/*`, with `!content/sources/natural-earth/*.toml`); only the manifest `content/sources/natural-earth.toml` is committed.
- Manifest entries recorded in `content/sources/natural-earth.toml` (one per file): theme, release tag, download URL, sha256, licence "public domain", status "unreviewed".
- No perspective TOML files were created and no border data was changed.


## Type inventory

Searched with: `rg -n "\b<Name>\b" docs packages apps engine tools --glob '!docs/build/**' --glob '!docs/changes/**' --glob '!node_modules/**'` for each name. (`engine` top-level path not present; matches found under `packages/engine/` and other searched paths.)

| Name | Status | Details |
|------|--------|---------|
| `CameraTarget` | Only used (no definition found) | Used at `docs/spec/05-features/m1-map.md:88`: `  flyTo(target: CameraTarget): Promise<void>;` |
| `CameraState` | Only used (no definition found) | Used at `docs/spec/05-features/m4-experience.md:88`: `export function shouldResume(question: Question, camera: CameraState, t: ParkThresholds): boolean;`; `docs/spec/05-features/m1-map.md:94`: `  onCameraChange(listener: (camera: CameraState) => void): Unsubscribe; // used by FE19 (D133)` |
| `LngLat` | Only used (no type/interface definition found; described as branded type) | Described at `docs/spec/glossary.md:91`: `\| LngLat \| Branded `{ lng, lat }` type, WGS 84 decimal degrees (D112–D113) \|`; `docs/spec/decisions.md:144`: `\| D113 \| `{ lng, lat }` named fields. Pairs only in GeoJSON I/O. Branded `LngLat` \| Active \| All \|`; `docs/spec/07-architecture-and-standards.md:171`: `- Stored as WGS 84 `{ lng, lat }` decimal degrees, at most 6 decimals. Branded `LngLat`. Pairs only in GeoJSON I/O.` Used widely in spec and ADRs (see Open contracts). |
| `AtlasSnapshot` | Only used (no definition found) | Used at `docs/spec/05-features/m1-map.md:89`: `  setAtlas(snapshot: AtlasSnapshot): void;                 // FE08`; `docs/spec/05-features/m1-map.md:345`: `): AtlasSnapshot;`; `docs/spec/05-features/m1-map.md:347`: `export function atlasChanges(previous: AtlasSnapshot, next: AtlasSnapshot): readonly AtlasChange[];`; `docs/spec/05-features/m1-map.md:349`: `export function atlasSummary(snapshot: AtlasSnapshot, view: ContentView): AtlasSummary; // S14`; `docs/spec/05-features/m4-experience.md:91`: `  item: ItemId, view: ContentView, learner: LearnerState, atlas: AtlasSnapshot,`; `docs/adr/0002-per-feature-state-texture.md:35,120,239,240,244`. |
| `LearnerState` | Only used (no definition found) | Used in spec signatures across M1–M5 (e.g. `docs/spec/05-features/m1-map.md:344`: `  learner: LearnerState, view: ContentView, predictor: RecallPredictor, now: number,`; `docs/spec/05-features/m3-learning-engine.md:264,272,298,461`; `docs/spec/05-features/m2-play.md:512,516`; `docs/spec/05-features/m4-experience.md:91,94,308`; `docs/spec/05-features/m5-optional.md:77,140,143,288`). |
| `ItemFacetKey` | Defined | Defined at `packages/engine/src/metrics/types.ts:7`: `export type ItemFacetKey = string;` Also described/used in spec (e.g. `docs/spec/05-features/m3-learning-engine.md:30`: `1. **Unit of memory:** the item-facet (`ItemFacetKey = itemId + facetId`, D16).`; `docs/spec/07-architecture-and-standards.md:143`: ties break by `ItemFacetKey`). Used in `packages/engine/src/metrics/*` and spec interfaces. |
| `DetailMesh` | Only used (no definition found) | Used at `docs/spec/05-features/m1-map.md:439`: `  load(level: DetailLevel, region: RegionChunkId): Promise<Result<DetailMesh, DetailError>>;` |
| `RegionChunkId` | Only used (no definition found) | Used at `docs/spec/05-features/m1-map.md:438`: `  isAvailable(level: DetailLevel, region: RegionChunkId): boolean;   // cached or bundled`; `docs/spec/05-features/m1-map.md:439`: `  load(level: DetailLevel, region: RegionChunkId): Promise<Result<DetailMesh, DetailError>>;` |
| `ContentItem` | Only used (no definition found) | Used at `docs/spec/05-features/m1-map.md:222`: `  item(id: ItemId): ContentItem \| undefined;          // undefined if not in this perspective`; `docs/spec/05-features/m1-map.md:223`: `  itemsOfKind(kind: ItemKind): readonly ContentItem[];` |
| `ItemKind` | Only used (no definition found) | Used at `docs/spec/05-features/m1-map.md:223`: `  itemsOfKind(kind: ItemKind): readonly ContentItem[];` |
| `BorderLine` | Only used (no definition found) | Used at `docs/spec/05-features/m1-map.md:225`: `  borders(): readonly BorderLine[];` |
| `RegionCode` | Defined | Defined at `packages/domain/src/locale.ts:8`: `export type RegionCode = string;` Also used in `packages/domain/src/locale.ts` (fields/schemas/helpers) and spec (e.g. `docs/spec/05-features/m1-map.md:215`, `docs/spec/05-features/m0-foundations.md:463`). |
| `ContentPack` | Defined | Defined at `packages/content/src/content-source.ts:48`: `export interface ContentPack {` with fields `packVersion`, `dataFormat`, `manifest`, `payload`, `chunks` (see `packages/content/src/content-source.ts:48-54`). Used extensively in `packages/content/*`, `packages/app-shell/*` (events), and spec (e.g. `docs/spec/05-features/m0-foundations.md:205`, `docs/spec/05-features/m1-map.md:218`, `docs/spec/05-features/m4-experience.md:227`). |
| `ContentView` | Defined (spec interface; no code definition found) | Defined at `docs/spec/05-features/m1-map.md:220`: `export interface ContentView {` with `perspective`, `item`, `itemsOfKind`, `displayName`, `borders` (see `docs/spec/05-features/m1-map.md:220-226`). Referenced in `docs/spec/07-architecture-and-standards.md:63` and used widely in spec signatures; no definition found in `packages/apps/tools` code. |
| `ItemId` | Defined | Defined at `packages/domain/src/ids.ts:9`: `export type ItemId = string;` Exported/used in domain and engine metrics/content-adjacent code and widely in spec and ADRs (e.g. `docs/spec/05-features/m1-map.md:90,102,222,224`, `docs/adr/0001-label-collision-and-priority.md`). |

ADRs copied unchanged from `build/m1` into `docs/adr/` and marked `Status: draft`: `docs/adr/0001-label-collision-and-priority.md`, `docs/adr/0002-per-feature-state-texture.md`.

## Open contracts

Quotes only (no proposals). Each subsection quotes every spec line found by the targeted searches noted, and any existing code that touches the topic.

### 1. Geometry-chunk schema and stable feature slots (L0–L2, globe/flat, region chunks)

Spec mentions:
- `docs/spec/06-ux-and-design.md:46:Map (globe/flat, "Show all names in Explore") · Play (no time pressure,`
- `docs/spec/06-ux-and-design.md:56:- **Map controls** (bottom right): zoom in, zoom out, globe/flat switch.`
- `docs/spec/06-ux-and-design.md:243:- The globe/flat switch crossfades.`
- `docs/adr/0002-per-feature-state-texture.md:45:- The texture is indexed by a dense per-feature slot. The slot is assigned by`
- `docs/adr/0002-per-feature-state-texture.md:47:  L0–L2, the globe/flat meshes and L2 region chunks. It is not the raw Natural`
- `docs/adr/0002-per-feature-state-texture.md:88:- Each map vertex gets one integer-ish attribute, the feature slot. The`
- `docs/adr/0002-per-feature-state-texture.md:152:- L0–L2 meshes and L2 region chunks share the same slot space and the same`
- `docs/adr/0002-per-feature-state-texture.md:156:  globe/flat morph changes positions, not styling. State survives the morph.`
- `docs/adr/0002-per-feature-state-texture.md:234:   across L0–L2 and region chunks. The pipeline task is blocked because the M0`
- `docs/adr/0002-per-feature-state-texture.md:241:   per-item state, per-layer state, feature slots, or the slot-to-item mapping.`
- `docs/spec/05-features/m1-map.md:10:| Pipeline geometry outputs: joined sphere mesh, flat cut mesh, outlines, tap zones, detail levels L0–L2, label anchors | Pack chunks, schema in `packages/content` |`
- `docs/spec/05-features/m1-map.md:111:- Tapping during the globe/flat morph: ignored until the morph ends.`
- `docs/spec/05-features/m1-map.md:415:   - Android: L0–L2 ship in the app (within the 40 MB budget).`
- `docs/spec/05-features/m1-map.md:455:- **AC-09.2** The Android package with L0–L2 is ≤ 40 MB (CI gate 8).`

Existing code touching this topic:
- (none found)

### 2. ContentPack/ContentView perspective schema (status, names, border lines, sources, reviewers)

Spec mentions:
- `docs/spec/05-features/m1-map.md:218:export function buildContentView(pack: ContentPack, perspective: PerspectiveId): ContentView;`
- `docs/spec/05-features/m1-map.md:220:export interface ContentView {`
- `docs/spec/05-features/m0-foundations.md:63:   `DailyChallengeCompleted`, `ContentPackApplied`, `ImportCompleted`.`
- `docs/spec/05-features/m0-foundations.md:194:   Append `ContentPackApplied`.`
- `docs/spec/05-features/m4-experience.md:91:  item: ItemId, view: ContentView, learner: LearnerState, atlas: AtlasSnapshot,`
- `docs/spec/05-features/m4-experience.md:94:export function topicsList(view: ContentView, learner: LearnerState, gates: SelectionGates): readonly TopicEntry[];`
- `docs/spec/05-features/m4-experience.md:163:  history: LearnerHistory, view: ContentView, seed: number,`
- `docs/spec/05-features/m4-experience.md:227:export function dailyChallenge(date: LocalDate, pack: ContentPack): DailyChallenge;`
- `docs/spec/07-architecture-and-standards.md:63:│  ├─ content/        pack loader, signature check, ContentView`
- `docs/spec/05-features/m0-foundations.md:205:  current(): ContentPack;`
- `docs/spec/05-features/m1-map.md:175:   - The engine never reads raw content. It gets a `ContentView` filtered by`
- `docs/spec/05-features/m1-map.md:281:   state, `ContentView` and `now`. It is never stored. It's rebuilt whenever`
- `docs/spec/05-features/m1-map.md:344:  learner: LearnerState, view: ContentView, predictor: RecallPredictor, now: number,`
- `docs/spec/05-features/m1-map.md:349:export function atlasSummary(snapshot: AtlasSnapshot, view: ContentView): AtlasSummary; // S14`

Existing code touching this topic:
- `packages/content/src/test-helpers.ts:11:import type { ContentPack, PackChunk } from './content-source.ts';`
- `packages/content/src/test-helpers.ts:50:  readonly pack: ContentPack;`
- `packages/content/src/bundled-pack.ts:9:import type { ContentPack, PackChunk } from './content-source.ts';`
- `packages/content/src/bundled-pack.ts:52:export function createBundledContentPack(): ContentPack {`
- `packages/content/src/bundled-pack.ts:68:export const BUNDLED_CONTENT_PACK: ContentPack = createBundledContentPack();`
- `packages/content/src/content-source.ts:27:  current(): ContentPack;`
- `packages/content/src/content-source.ts:48:export interface ContentPack {`
- `packages/content/src/content-source.ts:75:  readonly onStaged?: (pack: ContentPack) => void;`
- `packages/content/src/content-source.ts:76:  readonly onApplied?: (pack: ContentPack, previous: ContentPack) => void;`
- `packages/content/src/content-source.ts:77:  readonly onRolledBack?: (failed: ContentPack, restored: ContentPack, error: PackError) => void;`
- `packages/content/src/content-source.ts:80:export type PackActivationGuard = (pack: ContentPack) => Result<void, PackError>;`
- `packages/content/src/content-source.ts:86:  readonly bundledPack: ContentPack;`
- `packages/content/src/content-source.ts:104:function defaultGuard(pack: ContentPack): Result<void, PackError> {`
- `packages/content/src/content-source.ts:112:function chunkSetMatches(manifest: PackManifest, pack: ContentPack): boolean {`
- `packages/content/src/content-source.ts:132:  private currentPack: ContentPack;`
- `packages/content/src/content-source.ts:133:  private previousPack: ContentPack | null = null;`
- `packages/content/src/content-source.ts:134:  private readyPack: ContentPack | null = null;`
- `packages/content/src/content-source.ts:152:  current(): ContentPack {`
- `packages/content/src/content-source.ts:299:    const ready: ContentPack = {`
- `packages/content/src/content-source.ts:369:  private rememberChunks(pack: ContentPack): void {`
- `packages/content/src/content-source.test.ts:5:import { StaticContentSource, type ContentPack, type PackError } from './content-source.ts';`
- `packages/content/src/content-source.test.ts:32:  readonly base: ContentPack;`
- `packages/content/src/content-source.test.ts:51:    readonly activationGuard?: (pack: ContentPack) =>`
- `packages/content/src/content-source.test.ts:65:    readonly onRolledBack?: (failed: ContentPack, restored: ContentPack, error: PackError) => void;`
- `packages/domain/src/upgraders.ts:37:  ContentPackApplied: {},`
- `packages/domain/src/projection.ts:3:  ContentPackAppliedPayload,`
- `packages/domain/src/projection.ts:36:export interface ContentPackValue {`
- `packages/domain/src/projection.ts:37:  readonly payload: ContentPackAppliedPayload;`
- `packages/domain/src/projection.ts:54:  readonly contentPack: ContentPackValue | null;`
- `packages/domain/src/projection.ts:88:  let contentPack: ContentPackValue | null = null;`
- `packages/domain/src/projection.ts:137:      case 'ContentPackApplied':`
- `packages/domain/src/events.ts:25:  'ContentPackApplied',`
- `packages/domain/src/events.ts:154:export type ContentPackAppliedPayload = z.infer<typeof contentPackAppliedPayloadSchema>;`
- `packages/domain/src/events.ts:173:  ContentPackApplied: 1,`
- `packages/domain/src/events.ts:211:  variant('ContentPackApplied', contentPackAppliedPayloadSchema),`
- `packages/domain/src/events.test.ts:81:    fixtureEvent('ContentPackApplied', { packVersion: '1.0.0', dataFormat: '1' }),`
- `packages/app-shell/src/content.ts:22:export interface ApplyContentPackAtPauseOptions {`
- `packages/app-shell/src/content.ts:31:export async function applyReadyContentPackAtPause(`
- `packages/app-shell/src/content.ts:32:  options: ApplyContentPackAtPauseOptions,`
- `packages/app-shell/src/content.ts:47:  const event = options.factory.create('ContentPackApplied', {`
- `packages/app-shell/src/content.test.ts:5:import { applyReadyContentPackAtPause } from './content.ts';`
- `packages/app-shell/src/content.test.ts:31:    const duringRound = await applyReadyContentPackAtPause({`
- `packages/app-shell/src/content.test.ts:39:    const atPause = await applyReadyContentPackAtPause({`
- `packages/app-shell/src/content.test.ts:55:    expect(events[0]?.type).toBe('ContentPackApplied');`

### 3. Service-worker chunk and cache contract (FE09)

Spec mentions:
- `docs/spec/placeholders.md:93:| Zoom hysteresis | Detail rises at threshold T, drops only below T − 0.25 zoom levels | FE09 |`
- `docs/spec/placeholders.md:94:| Maximum zoom | Smallest core item fills about a third of the screen | FE09 |`
- `docs/spec/decisions.md:41:| D25 | Street-level zoom inside the app | Post-MVP (D122, PK07) | FE09 |`
- `docs/spec/decisions.md:42:| D26 | Map tiles never from OSM's servers | Post-MVP; self-hosted only (D103) | FE09 |`
- `docs/spec/decisions.md:153:| D122 | No street detail in MVP | Active (PK07) | FE09 |`
- `docs/spec/README.md:52:| M1 Map | FE06–FE09 |`
- `docs/spec/07-architecture-and-standards.md:54:│  ├─ web/            entry, service worker, CSP, e2e/`
- `docs/spec/05-features/m5-optional.md:474:   - The service worker precaches the app shell. A new version downloads in the background.`
- `docs/spec/05-features/m4-experience.md:26:**Depends on:** FE06, FE08, FE09, FE14, FE15, FE24`
- `docs/spec/05-features/m4-experience.md:46:5. **Camera:** full zoom range (FE09). Idle drift after 10 s without input`
- `docs/spec/05-features/m1-map.md:1:# M1 — Map (FE06–FE09)`
- `docs/spec/05-features/m1-map.md:41:   - Drag to orbit, pinch or scroll to zoom. Zoom limits come from FE09.`
- `docs/spec/05-features/m1-map.md:135:(FE09, PK07), the 3D cross-section (PK12).`
- `docs/spec/05-features/m1-map.md:384:## FE09 Map detail and zoom`
- `docs/spec/05-features/m1-map.md:386:**Milestone:** M1 · **Packages:** globe, content, apps/web (service worker), tools/content-pipeline ·`
- `docs/spec/05-features/m1-map.md:417:     After the first completed round, the service worker caches L1 and L2`
- `docs/spec/05-features/index.md:15:| FE09 | Map detail and zoom | M1 | `m1-map.md` | S02 |`

Existing code touching this topic:
- `packages/content/src/host.ts:44:  readonly cache: 'no-cache';`
- `packages/content/src/host.ts:117:      cache: 'no-cache',`

### 4. Label text and fame for setVisibleLabels (ADR-0001)

Spec mentions:
- `docs/spec/glossary.md:36:| Hidden placement | Up to 3 probes in each of rounds 1–3 set a fame-tier estimate per continent and facet group. Never shown as a test (D97, D166) |`
- `docs/spec/glossary.md:54:| Fame score | Ranks items by population, size and prominence. Sets fame tiers |`
- `docs/spec/glossary.md:55:| Fame tier | A band of items by fame score. Unlocking and placement work by tier (D166) |`
- `docs/spec/decisions.md:60:| D39 | Order: Earth layers → continents/oceans → reference lines → home country → world by fame. Plates in parallel | Active | FE14 |`
- `docs/spec/decisions.md:135:| D104 | A/B learning: internal testers in MVP, opt-in summaries later. Difficulty from fame and simulation | Confirmed by D110 (PK06) | FE03, FE04 |`
- `docs/spec/decisions.md:217:| D166 | New items follow the D39 start sequence, then fame tiers. Hidden placement uses adaptive probes (FE22). No Elo. Every new item gets a Meet then an R1 question; the Elo quick-check and guess-first routes are dropped. Amends 03 §3 (breadth item 5), §4.1, §7.8 | Active | FE14, FE16, FE22 |`
- `docs/adr/0002-per-feature-state-texture.md:270:- ADR-0001 (label collision), for the same import-boundary problem`
- `docs/adr/0001-label-collision-and-priority.md:1:# ADR-0001: Label collision and priority for globe labels`
- `docs/adr/0001-label-collision-and-priority.md:15:Collision is resolved by item priority (fame), with at most 60 labels on screen`
- `docs/adr/0001-label-collision-and-priority.md:50:- a fame/priority value;`
- `docs/adr/0001-label-collision-and-priority.md:53:The spec currently defines `setVisibleLabels(items: ReadonlySet<ItemId>)` and`
- `docs/adr/0001-label-collision-and-priority.md:54:does not say where display text and fame are carried. The globe must not read`
- `docs/adr/0001-label-collision-and-priority.md:61:1. Candidates are ordered by descending fame.`
- `docs/adr/0001-label-collision-and-priority.md:62:2. Equal fame is broken by ascending `ItemId`, so the result is deterministic.`
- `docs/adr/0001-label-collision-and-priority.md:63:3. A candidate with no fame value is treated as the lowest priority, so a`
- `docs/adr/0001-label-collision-and-priority.md:111:Given the same candidates, fame values, viewport, camera and text scale, the`
- `docs/adr/0001-label-collision-and-priority.md:129:- The highest-fame labels always win, labels never move from their anchors, and`
- `docs/adr/0001-label-collision-and-priority.md:142:- The current FE06 interface does not carry the display text or fame needed by`
- `docs/adr/0001-label-collision-and-priority.md:159:- **Priority by screen area or camera distance instead of fame:** rejected. It`
- `docs/adr/0001-label-collision-and-priority.md:167:`setVisibleLabels(items: ReadonlySet<ItemId>)`, while the layout needs display`
- `docs/adr/0001-label-collision-and-priority.md:168:text and fame for each item. `globe` may not import `content` or read raw`
- `docs/adr/0001-label-collision-and-priority.md:171:state how app-shell supplies `{ itemId, text, fame }`, for example through an`
- `docs/spec/04-content-and-data.md:107:fame = 0.62`
- `docs/spec/04-content-and-data.md:161:   - Every core item has a fame tier. Probe sets exist per continent and`
- `docs/spec/05-features/m1-map.md:63:   - Collision is resolved by item priority (fame), with at most 60 labels on`
- `docs/spec/05-features/m1-map.md:90:  setVisibleLabels(items: ReadonlySet<ItemId>): void;      // D121, decided in app-shell`
- `docs/spec/03-learning-design.md:80:   country → world by fame score (population, size, prominence) (D39).`
- `docs/spec/03-learning-design.md:259:8. **What's new (D166, D167):** fame tiers, the prerequisite graph and the`
- `docs/spec/03-learning-design.md:290:- **Inputs:** due reviews, learning steps, new-item candidates (unlocks, fame`
- `docs/spec/05-features/m4-experience.md:287:10. **Probe items:** per-continent fame-tier probe sets in the pack, for F03,`
- `docs/spec/02-user-journeys.md:17:   country → wider world by fame (D39).`
- `docs/spec/05-features/m2-play.md:441:   - M2 uses stand-ins: fame order for new items, and fixed review intervals`
- `docs/spec/05-features/m3-learning-engine.md:13:| Content: start sequence (D39), facet prerequisite graph, item fame tiers, families, lookalike pairs with contrast cues, Meet facts and anchor lines with sources, mini-Meet lines, goal presets | Pack chunks, `content/goals/`, pipeline checks |`
- `docs/spec/05-features/m3-learning-engine.md:165:     home country, its regions and their capitals (D66, D70) → world by fame.`
- `docs/spec/05-features/m3-learning-engine.md:167:   - World items are in fame tiers (pipeline: population, size, prominence;`
- `docs/spec/05-features/m3-learning-engine.md:205:5. **Review value:** `value = fame weight × emphasis weight × (desired retention − predicted recall)`.`
- `docs/spec/05-features/m3-learning-engine.md:516:   - **Item difficulty** from fame tier and lookalike links (D104). Wrong`

Existing code touching this topic:
- (none found)

### 5. Camera and coordinate types (CameraTarget, CameraState, LngLat)

Spec mentions:
- `docs/spec/glossary.md:91:| LngLat | Branded `{ lng, lat }` type, WGS 84 decimal degrees (D112–D113) |`
- `docs/spec/decisions.md:144:| D113 | `{ lng, lat }` named fields. Pairs only in GeoJSON I/O. Branded `LngLat` | Active | All |`
- `docs/spec/07-architecture-and-standards.md:171:- Stored as WGS 84 `{ lng, lat }` decimal degrees, at most 6 decimals. Branded `LngLat`. Pairs only in GeoJSON I/O.`
- `docs/spec/06-ux-and-design.md:350:- Taps: screen → map plane → `projection.invert` → `LngLat` → engine grading.`
- `docs/spec/05-features/m4-experience.md:88:export function shouldResume(question: Question, camera: CameraState, t: ParkThresholds): boolean;`
- `docs/spec/05-features/m2-play.md:140:  | { kind: 'region'; at: LngLat | null; itemIds: readonly ItemId[] }`
- `docs/spec/05-features/m2-play.md:141:  | { kind: 'point'; at: LngLat }`
- `docs/spec/05-features/m2-play.md:147:  | { kind: 'path'; points: readonly LngLat[] }`
- `docs/spec/05-features/m2-play.md:222:5. **Taps** are graded against pipeline tap zones in `LngLat`, never against`
- `docs/spec/05-features/m1-map.md:26:turn every tap into a `LngLat` for the engine to grade, and stay smooth on`
- `docs/spec/05-features/m1-map.md:47:   - Flat mode: screen → map plane → `projection.invert` → `LngLat` (D153).`
- `docs/spec/05-features/m1-map.md:88:  flyTo(target: CameraTarget): Promise<void>;`
- `docs/spec/05-features/m1-map.md:93:  screenToLngLat(x: number, y: number): LngLat | null;`
- `docs/spec/05-features/m1-map.md:94:  onCameraChange(listener: (camera: CameraState) => void): Unsubscribe; // used by FE19 (D133)`
- `docs/spec/05-features/m1-map.md:99:  | { kind: 'marker'; at: LngLat; style: 'answer' | 'chosen' }`
- `docs/spec/05-features/m1-map.md:100:  | { kind: 'arc'; from: LngLat; to: LngLat }`
- `docs/spec/05-features/m1-map.md:101:  | { kind: 'beam'; from: LngLat; bearingDeg: number; widthDeg: number }`
- `docs/spec/05-features/m1-map.md:119:- **AC-06.1** `screenToLngLat` round-trips with the projection to within`
- `docs/adr/0001-label-collision-and-priority.md:48:- an anchor (`LngLat` or the pipeline's projected anchor) and the current screen`

Existing code touching this topic:
- (none found)

### 6. Any other name from S3 that is "not found"

No S3 name was entirely absent from spec/code search results. The following S3 names have **no definition found** (only usages and/or prose descriptions); quoted mentions for each:

#### `CameraTarget` (no definition found in spec/code search)

Spec/code mentions:

- `docs/spec/05-features/m1-map.md:88:  flyTo(target: CameraTarget): Promise<void>;`
#### `CameraState` (no definition found in spec/code search)

Spec/code mentions:

- `docs/spec/05-features/m4-experience.md:88:export function shouldResume(question: Question, camera: CameraState, t: ParkThresholds): boolean;`
- `docs/spec/05-features/m1-map.md:94:  onCameraChange(listener: (camera: CameraState) => void): Unsubscribe; // used by FE19 (D133)`
#### `LngLat` (no definition found in spec/code search)

Spec/code mentions:

- `docs/spec/glossary.md:91:| LngLat | Branded `{ lng, lat }` type, WGS 84 decimal degrees (D112–D113) |`
- `docs/spec/decisions.md:144:| D113 | `{ lng, lat }` named fields. Pairs only in GeoJSON I/O. Branded `LngLat` | Active | All |`
- `docs/spec/07-architecture-and-standards.md:171:- Stored as WGS 84 `{ lng, lat }` decimal degrees, at most 6 decimals. Branded `LngLat`. Pairs only in GeoJSON I/O.`
- `docs/spec/06-ux-and-design.md:350:- Taps: screen → map plane → `projection.invert` → `LngLat` → engine grading.`
- `docs/spec/05-features/m2-play.md:140:  | { kind: 'region'; at: LngLat | null; itemIds: readonly ItemId[] }`
- `docs/spec/05-features/m2-play.md:141:  | { kind: 'point'; at: LngLat }`
- `docs/spec/05-features/m2-play.md:147:  | { kind: 'path'; points: readonly LngLat[] }`
- `docs/spec/05-features/m2-play.md:222:5. **Taps** are graded against pipeline tap zones in `LngLat`, never against`
- `docs/spec/05-features/m1-map.md:26:turn every tap into a `LngLat` for the engine to grade, and stay smooth on`
- `docs/spec/05-features/m1-map.md:47:   - Flat mode: screen → map plane → `projection.invert` → `LngLat` (D153).`
- `docs/spec/05-features/m1-map.md:93:  screenToLngLat(x: number, y: number): LngLat | null;`
- `docs/spec/05-features/m1-map.md:99:  | { kind: 'marker'; at: LngLat; style: 'answer' | 'chosen' }`
- `docs/spec/05-features/m1-map.md:100:  | { kind: 'arc'; from: LngLat; to: LngLat }`
- `docs/spec/05-features/m1-map.md:101:  | { kind: 'beam'; from: LngLat; bearingDeg: number; widthDeg: number }`
- `docs/adr/0001-label-collision-and-priority.md:48:- an anchor (`LngLat` or the pipeline's projected anchor) and the current screen`
#### `AtlasSnapshot` (no definition found in spec/code search)

Spec/code mentions:

- `docs/spec/05-features/m4-experience.md:91:  item: ItemId, view: ContentView, learner: LearnerState, atlas: AtlasSnapshot,`
- `docs/spec/05-features/m1-map.md:89:  setAtlas(snapshot: AtlasSnapshot): void;                 // FE08`
- `docs/spec/05-features/m1-map.md:345:): AtlasSnapshot;`
- `docs/spec/05-features/m1-map.md:347:export function atlasChanges(previous: AtlasSnapshot, next: AtlasSnapshot): readonly AtlasChange[];`
- `docs/spec/05-features/m1-map.md:349:export function atlasSummary(snapshot: AtlasSnapshot, view: ContentView): AtlasSummary; // S14`
- `docs/adr/0002-per-feature-state-texture.md:35:`GlobeController.setAtlas(snapshot: AtlasSnapshot)` (FE06, FE08). The import`
- `docs/adr/0002-per-feature-state-texture.md:120:- app-shell computes a new `AtlasSnapshot` at a pause (or a feedback highlight`
- `docs/adr/0002-per-feature-state-texture.md:239:2. **`AtlasSnapshot` shape and the `setAtlas` contract.** FE08 uses`
- `docs/adr/0002-per-feature-state-texture.md:240:   `AtlasSnapshot` but never defines it. It does not say whether it carries`
- `docs/adr/0002-per-feature-state-texture.md:244:   interface is `setAtlas(snapshot: AtlasSnapshot): void`; this ADR does not`
#### `LearnerState` (no definition found in spec/code search)

Spec/code mentions:

- `docs/spec/05-features/m5-optional.md:77:  reschedule(state: LearnerState, now: number): Promise<void>;`
- `docs/spec/05-features/m5-optional.md:140:export function blitzAvailable(state: LearnerState, view: ContentView, flags: FlagSnapshot,`
- `docs/spec/05-features/m5-optional.md:143:export function blitzQueue(state: LearnerState, view: ContentView, seed: number): readonly BlitzQuestion[];`
- `docs/spec/05-features/m5-optional.md:288:  state: LearnerState, view: ContentView, metrics: MetricsSnapshot, now: number,`
- `docs/spec/05-features/m4-experience.md:91:  item: ItemId, view: ContentView, learner: LearnerState, atlas: AtlasSnapshot,`
- `docs/spec/05-features/m4-experience.md:94:export function topicsList(view: ContentView, learner: LearnerState, gates: SelectionGates): readonly TopicEntry[];`
- `docs/spec/05-features/m4-experience.md:308:export function isFirstRun(state: LearnerState): boolean;`
- `docs/spec/05-features/m3-learning-engine.md:264:  state: LearnerState, view: ContentView, limits: NewItemLimits,`
- `docs/spec/05-features/m3-learning-engine.md:272:  state: LearnerState, view: ContentView, session: SessionSignals,`
- `docs/spec/05-features/m3-learning-engine.md:298:export function dailyBudgetMet(state: LearnerState, now: number, budgetMinutes: number): boolean;`
- `docs/spec/05-features/m3-learning-engine.md:461:  shouldRun(state: LearnerState, now: number): boolean;`
- `docs/spec/05-features/m2-play.md:512:  candidates(state: LearnerState, view: ContentView, limit: number): readonly ItemId[];`
- `docs/spec/05-features/m2-play.md:516:  state: LearnerState;`
- `docs/spec/05-features/m1-map.md:344:  learner: LearnerState, view: ContentView, predictor: RecallPredictor, now: number,`
#### `DetailMesh` (no definition found in spec/code search)

Spec/code mentions:

- `docs/spec/05-features/m1-map.md:439:  load(level: DetailLevel, region: RegionChunkId): Promise<Result<DetailMesh, DetailError>>;`
#### `RegionChunkId` (no definition found in spec/code search)

Spec/code mentions:

- `docs/spec/05-features/m1-map.md:438:  isAvailable(level: DetailLevel, region: RegionChunkId): boolean;   // cached or bundled`
- `docs/spec/05-features/m1-map.md:439:  load(level: DetailLevel, region: RegionChunkId): Promise<Result<DetailMesh, DetailError>>;`
#### `ContentItem` (no definition found in spec/code search)

Spec/code mentions:

- `docs/spec/05-features/m1-map.md:222:  item(id: ItemId): ContentItem | undefined;          // undefined if not in this perspective`
- `docs/spec/05-features/m1-map.md:223:  itemsOfKind(kind: ItemKind): readonly ContentItem[];`
#### `ItemKind` (no definition found in spec/code search)

Spec/code mentions:

- `docs/spec/05-features/m1-map.md:223:  itemsOfKind(kind: ItemKind): readonly ContentItem[];`
#### `BorderLine` (no definition found in spec/code search)

Spec/code mentions:

- `docs/spec/05-features/m1-map.md:225:  borders(): readonly BorderLine[];`
