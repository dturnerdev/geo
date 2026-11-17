# M1 — Map (FE06–FE09)

**Status:** v1.0. Template as in `m0-foundations.md`. Acceptance criteria (AC)
become automated tests unless marked "(manual)".

## M1 setup tasks (not features)

| Task | Output |
|------|--------|
| Pipeline geometry outputs: joined sphere mesh, flat cut mesh, outlines, tap zones, detail levels L0–L2, label anchors | Pack chunks, schema in `packages/content` |
| Reference screenshot set for CI gate 6 | `apps/web/e2e/screenshots/` |
| ADR: label collision and priority approach (troika-three-text) | ADR |
| ADR: per-feature styling via a state texture indexed by feature ID | ADR |
| Perspective files: `uk`, `us`, `default` (Natural Earth base, D84) | `content/perspectives/` |

---

## FE06 Globe and flat map

**Milestone:** M1 · **Packages:** globe, engine (`geo/`), ui, app-shell ·
**Decisions:** D12, D40, D112–D121, D125, D130, D153, D157, D159 ·
**Depends on:** FE02, FE05

### Purpose
Draw a spinnable 3D globe and an Equal Earth flat map from one renderer,
turn every tap into a `LngLat` for the engine to grade, and stay smooth on
low-cost phones.

### Behaviour
1. **Renderer:**
   - Three.js `WebGLRenderer` (WebGL2), exact pinned version (D130).
   - Created only inside `GlobeController`. No other package imports Three.js.
2. **Body:** the globe draws a `CelestialBody { id, radiusM, meshes }`.
   Earth is the only body in the MVP. Nothing is hard-coded to Earth, so that
   the solar system Easter egg can come later (D40).
3. **Render on demand:**
   - Frames are drawn only while the camera moves, an animation runs or data
     changes.
   - When idle, the globe draws nothing, which saves battery.
4. **Camera:**
   - Drag to orbit, pinch or scroll to zoom. Zoom limits come from FE09.
   - No auto-rotation while a question is on screen.
   - Gentle idle drift during pauses only, and never with reduce motion on.
   - `flyTo` durations follow `motion.camera` (06 §7).
5. **Taps to coordinates:**
   - Globe mode: ray–sphere intersection. A tap in space returns `null`.
   - Flat mode: screen → map plane → `projection.invert` → `LngLat` (D153).
   - The globe only reports coordinates. It never decides right or wrong (D118).
6. **Flat map (D153):**
   - Equal Earth from `d3-geo`, centred on 0°, no horizontal wrapping.
   - `setViewMode` morphs between globe and flat map using the cut mesh,
     with sphere and flat positions blended in the vertex shader.
   - Meshes swap at the start of the transition. Reduce motion uses a crossfade instead.
   - The cut mesh is lazy-loaded after the first question.
   - The chosen mode is remembered on the device (`SettingChanged`).
7. **Overlays:**
   - Markers, great-circle arcs, Bearing beams, highlights and the keyboard crosshair.
   - Arcs on the flat map are drawn as curves and split at the map edge.
8. **Labels:**
   - Drawn with troika-three-text.
   - Shown only for items in the visible set passed in by app-shell (D121).
     The globe never works out label rules itself.
   - Collision is resolved by item priority (fame), with at most 60 labels on
     screen (placeholder).
   - Sizes follow the device text size, clamped to 1–1.6× (06 §5.4).
9. **Colours:**
   - Only from design tokens, passed in as shader uniforms (D125).
   - Space background is always dark, in both themes (D157).
10. **Keyboard (D159):**
    - Arrow keys turn the globe, `+`/`-` zoom, and `Enter` taps at the centre crosshair.
    - These keys work only while the globe has focus.
11. **Accessibility:**
    - The canvas is hidden from screen readers (`aria-hidden`).
    - The list alternative belongs to FE10.
12. **Lost WebGL context:**
    - Handle `webglcontextlost` / `webglcontextrestored`, rebuild GPU resources and keep the round going.
    - If WebGL2 isn't available at start-up, show S20.
13. **Performance sampling:** frame times are sampled and written to diagnostics (FE04).

### Interfaces

```ts
export type ViewMode = 'globe' | 'flat';

export interface GlobeController {
  mount(canvas: HTMLCanvasElement, options: GlobeOptions): Result<void, GlobeError>;
  setViewMode(mode: ViewMode): Promise<void>;
  flyTo(target: CameraTarget): Promise<void>;
  setAtlas(snapshot: AtlasSnapshot): void;                 // FE08
  setVisibleLabels(items: ReadonlySet<ItemId>): void;      // D121, decided in app-shell
  setOverlays(overlays: readonly Overlay[]): void;
  setReduceMotion(on: boolean): void;
  screenToLngLat(x: number, y: number): LngLat | null;
  onCameraChange(listener: (camera: CameraState) => void): Unsubscribe; // used by FE19 (D133)
  dispose(): void;
}

export type Overlay =
  | { kind: 'marker'; at: LngLat; style: 'answer' | 'chosen' }
  | { kind: 'arc'; from: LngLat; to: LngLat }
  | { kind: 'beam'; from: LngLat; bearingDeg: number; widthDeg: number }
  | { kind: 'highlight'; item: ItemId; style: 'correct' | 'close' | 'incorrect' | 'neutral' }
  | { kind: 'crosshair' };

export type GlobeError = { kind: 'no-webgl2' } | { kind: 'context-failed' };
```

### Edge cases
- Taps exactly on the poles, on the 180° line, or on Fiji and Chukotka
  (which cross 180°) return correct coordinates in both modes.
- Tapping during the globe/flat morph: ignored until the morph ends.
- Pinch and tap together: treated as a gesture, never as an answer.
- Window resize or rotation mid-question: the camera keeps the question area
  clear of the card (06 §4).
- Very small items (Malta, Vatican): drawn at their real size. Tap zones
  are enlarged by the pipeline, not the renderer (D118).

### Acceptance criteria
- **AC-06.1** `screenToLngLat` round-trips with the projection to within
  0.01° for 10,000 random points in each mode (property test).
- **AC-06.2** The CI gate 6 screenshots match: poles, 180° line, Fiji, Malta,
  and flat Fiji, Chukotka and Antarctica.
- **AC-06.3** Galaxy A07 4G: 60 fps while spinning and zooming, never below
  30 fps. Redmi A5: at least 30 fps, no crashes (manual, logged).
- **AC-06.4** When idle, no frames are drawn (frame counter test).
- **AC-06.5** The globe → flat morph takes 700 ms. With reduce motion on, a crossfade is used instead.
- **AC-06.6** A forced context loss mid-round restores the globe without losing the round.
- **AC-06.7** No package other than `globe` imports Three.js (import-boundary rule).
- **AC-06.8** Globe keys do nothing unless the globe has focus (Playwright).
- **AC-06.9** With an empty visible-label set, no labels are drawn.
- **AC-06.10** The cut mesh isn't requested before the first question appears (network trace).

### Out of scope
Grading (FE11), atlas rules (FE08), park detection (FE19), street detail
(FE09, PK07), the 3D cross-section (PK12).

---

## FE07 Perspectives and borders

**Milestone:** M1 · **Packages:** domain, content, engine, globe, tools/content-pipeline ·
**Decisions:** D84, D85, D86, D90, D117, D146, D163 ·
**Depends on:** FE02, FE05, FE06

### Purpose
Show borders, country status and names according to the user's map
perspective. Teach disputed areas neutrally, and make sure no question ever
contradicts the perspective.

### Behaviour
1. **Perspective files** (`content/perspectives/*.toml`), one per perspective:
   - **Item status:** for example, sovereign state, observer state, territory,
     constituent country or disputed area.
   - **Border lines,** each tagged with a style: `agreed`, `disputed` or `claim`.
   - **Display names,** with optional en-GB / en-US variants.
   - **Fact overrides,** for facts that differ by perspective.
2. **MVP perspectives:**
   - `uk` and `us`, both from Natural Earth's ready-made perspectives (D84).
   - `default`: shows who controls the ground, with disputed lines dashed and claimed areas marked.
3. **Inheritance (D85):**
   - A perspective may `extend` another and list its changes.
   - Every change needs a reviewer and a source.
   - The pipeline flattens inheritance, so the app only ever sees complete perspectives.
4. **Selection:**

   | `deviceRegion` (FE05) | Perspective |
   |-----------------------|-------------|
   | GB | `uk` |
   | US | `us` |
   | Anything else or `null` | `default` |

   - The user can override this in Settings → Language and units.
   - The change is stored as `SettingChanged` and applied at the next pause (D163).
5. **Content view:**
   - The engine never reads raw content. It gets a `ContentView` filtered by
     the active perspective.
   - Question generation, wrong options and grading all use this view. This
     enforces the question rule: a wrong option is never something the
     perspective doesn't treat as that kind of item.
6. **Disputed areas:**
   - Each disputed area has `controlledBy` and `claimedBy` facts (multi-value, with roles).
   - Questions ask only "Who controls X?" and "Who claims X?".
   - Disputed areas are never used in "Which country is X in?" questions.
     The pipeline blocks it.
7. **Borders on the map:**
   - Line styles differ by pattern, not only by colour (D125):

     | Style | Line |
     |-------|------|
     | Agreed | Solid |
     | Disputed | Dashed |
     | Claim | Dotted |

   - Claimed areas get a light hatch. This works with pattern strength (06 §5.3).
8. **Progress when the perspective changes:**
   - **Only the active perspective is ever used for anything the user sees
     or does now:** the map, names, labels, atlas, new questions and grading.
     There is never a mix of perspectives on screen.
   - Progress is per item and facet, so it carries over.
   - An item that doesn't exist in the new perspective leaves scheduling and
     the atlas, but its events stay. Switching back restores it.
   - Which perspective applied to a past answer is worked out from the
     `SettingChanged` history. This is for record-keeping and metrics only.
     Past answers keep their original grades and are never regraded (D117).
   - View mode (globe or flat) has no effect on perspective, grading or progress.
9. **Credits:** the border notice and "Report a content issue" are part of FE24 (D146).

### Interfaces

```ts
export type PerspectiveId = 'uk' | 'us' | 'default';
export type BorderStyle = 'agreed' | 'disputed' | 'claim';

export function choosePerspective(
  deviceRegion: RegionCode | null, override: PerspectiveId | null,
): PerspectiveId;

export function buildContentView(pack: ContentPack, perspective: PerspectiveId): ContentView;

export interface ContentView {
  readonly perspective: PerspectiveId;
  item(id: ItemId): ContentItem | undefined;          // undefined if not in this perspective
  itemsOfKind(kind: ItemKind): readonly ContentItem[];
  displayName(id: ItemId, locale: Locale): string;
  borders(): readonly BorderLine[];
}

export function perspectiveAt(events: Iterable<DomainEvent>, at: number): PerspectiveId; // history only
```

### Edge cases
- Device region changes, for example after travel or a new SIM: the
  perspective only changes if the user hasn't overridden it, and only at the
  next pause.
- An imported history from a device with a different perspective: settings
  follow last-writer-wins (D164). Items that aren't in the active perspective
  stay out of scheduling.
- A content pack changes a perspective (for example, a renamed country):
  applied at a pause. Old names stay in history (04 §7).
- An item is a country in one perspective and a territory in another: it's a
  core item in the first and a curiosity item in the second (D90).
- A user switches perspective several times: the screen always shows the
  current one. Earlier answers keep the grades they were given at the time.

### Acceptance criteria
- **AC-07.1** `choosePerspective` matches the selection table for every row (unit test).
- **AC-07.2** No generated question uses a wrong option outside the active
  perspective's item kind. Property test over all three perspectives and
  10,000 generated questions.
- **AC-07.3** No disputed area appears in a membership question (pipeline check plus property test).
- **AC-07.4** Each border style draws with its own line pattern in both
  modes, and the colour-blind simulations still distinguish them (screenshots).
- **AC-07.5** A perspective override made mid-round applies at the next pause, not before.
- **AC-07.6** Switching perspective and back leaves scheduling state identical to before (property test).
- **AC-07.7** The pipeline rejects a perspective change that has no source or reviewer.
- **AC-07.8** The flattened `uk` and `us` perspectives match a reviewed golden fixture.
- **AC-07.9** After a perspective change takes effect, every name, border,
  label, atlas state and new question uses only the new perspective, and no
  earlier answer's rating changes (E2E plus property test).

### Out of scope
Perspectives for China, Russia and India (D86, PK04), other Europe
perspectives (built when those markets open), historic borders.


---

## FE08 Living Atlas

**Milestone:** M1 (the real recall model arrives in M3) ·
**Packages:** engine (`atlas/`), globe, ui, app-shell ·
**Decisions:** D24, D32, D121, D125, D157, D160, D162 ·
**Depends on:** FE06, FE07 (FE13 in M3)

### Purpose
Make the globe your progress bar. Places gain detail as you learn them and
fade gently as memory weakens. There is never fog, loss or pressure.

### Behaviour
1. **The atlas is a projection:** `atlasState` is a pure function of learner
   state, `ContentView` and `now`. It is never stored. It's rebuilt whenever
   it's needed.
2. **Item states** (visuals per 06 §5.3):

   | State | Rule (placeholders in `tuning.ts`) |
   |-------|-------------------------------------|
   | Undiscovered | No `ItemMet` event |
   | Discovered | Met, but the layer's facets aren't established |
   | Established | Correct on 2 separate local days, stability ≥ 3 days |
   | Fading | Established, but predicted recall now < 0.70 |
   | Restored | A correct review while fading. Shown once at the next pause, then Established |

   - An item never drops below Discovered.
   - A country's "established" fill also has faint shading. This is the "soft
     relief" in 06 §5.3, not the full terrain relief of layer L4.
3. **Detail layers:** each layer has its own state per item.

   | Layer | Turned on by | Map change |
   |-------|--------------|------------|
   | L1 Country | F03/F04 | Established fill and outline |
   | L2 Capital | F08/F10 | Capital lights up |
   | L3 Rivers | F13/F14 | River drawn in |
   | L4 Relief | F13/F16 | Full terrain relief |
   | L5 Regions | F19 | Internal borders appear (UK and US) |
   | L6 Biomes | F21 | Biome tint (post-MVP; layer exists, no content) |

4. **When the atlas changes:**
   - During a round, the atlas doesn't change, apart from feedback highlights.
   - At a pause, everything that changed since the last pause animates in
     turn (D32), using `motion.bloom` with reduce motion respected.
   - Each newly established or restored item plays A06 and haptic H03.
     There's at most one H03 per 300 ms (placeholder, D162).
5. **Labels (D121):**
   - App-shell passes in the items whose name facet is established, minus any
     item in the current question.
   - The atlas supplies the established set, and app-shell removes the current question's items.
6. **Milestone moments:**
   - For example, "Europe fully coloured" or "first river system complete".
   - They play as a camera move and a line of text at a pause. They're not badges and aren't stored as achievements.
7. **Atlas summary (S14, D160):**
   - A table by continent with discovered, established and fading counts, plus a list of fading items.
   - Built from the same `atlasState`. Fully usable with a screen reader and keyboard.
8. **Wording:** fading items are described as "could use a refresh", never "forgotten" (06 §9).
9. **Recall model:**
   - The atlas uses a `RecallPredictor` interface.
   - M1 uses a simple stand-in (exponential decay with fixed stability) so
     that the atlas can be built and tested.
   - FE13 replaces it in M3 without changes to the atlas.
10. **Rendering:**
    - Per-item state goes into a state texture indexed by feature ID (ADR).
    - Updating the atlas is one texture upload, not a rebuild of geometry.

### Interfaces

```ts
export type AtlasItemState = 'undiscovered' | 'discovered' | 'established' | 'fading' | 'restored';
export type AtlasLayer = 'country' | 'capital' | 'rivers' | 'relief' | 'regions' | 'biomes';

export interface RecallPredictor {
  recall(itemFacet: ItemFacetKey, at: number): number | null;  // null = never reviewed
}

export function atlasState(
  learner: LearnerState, view: ContentView, predictor: RecallPredictor, now: number,
): AtlasSnapshot;

export function atlasChanges(previous: AtlasSnapshot, next: AtlasSnapshot): readonly AtlasChange[];

export function atlasSummary(snapshot: AtlasSnapshot, view: ContentView): AtlasSummary; // S14
```

### Edge cases
- Back after a month: lots of items may be fading. They show as fading with
  the stipple and glow, never as lost. The pause animation is capped at 12
  items (placeholder). The rest change without animation.
- Import merge: the atlas is rebuilt from the merged log. Changes caused by the
  import are shown without animation.
- An item leaves the perspective (FE07): it disappears from the atlas without
  any "lost" effect.
- Reduce motion: blooms become static highlights and milestone camera moves become cuts.

### Acceptance criteria
- **AC-08.1** `atlasState` gives the same output for the same input on web
  and Android (reference replay).
- **AC-08.2** No item is ever below Discovered after `ItemMet` (property test over random logs).
- **AC-08.3** The atlas doesn't change on screen during a round, apart from
  feedback highlights (E2E with a forced state change mid-round).
- **AC-08.4** Each state is distinguishable under protan, deutan, tritan and
  achromat simulation, with ΔL\* ≥ 15 between neighbouring states (CI colour check).
- **AC-08.5** H03 only fires for newly established or restored items, at
  most one per 300 ms, and never for any other atlas change.
- **AC-08.6** Atlas summary counts match `atlasState` for golden fixtures.
- **AC-08.7** Atlas summary passes axe-core and works through the keyboard alone.
- **AC-08.8** Updating 200 items' states costs one texture upload and no geometry rebuild (globe test).
- **AC-08.9** Swapping the stand-in predictor for another implementation of
  `RecallPredictor` needs no change in `atlas/` (type test).

### Out of scope
The historic counties "old map" overlay (structure only; content later),
fog of war, the class atlas (post-MVP, D83).

---

## FE09 Map detail and zoom

**Milestone:** M1 · **Packages:** globe, content, apps/web (service worker), tools/content-pipeline ·
**Decisions:** D25, D26, D87, D105, D106, D122, D131 ·
**Depends on:** FE02, FE06

### Purpose
Let curious users zoom in to built-in, offline detail within the size
budgets, with an extension point for street-level detail later.

### Behaviour
1. **Detail levels:** all from Natural Earth, built by the pipeline.

   | Level | Source scale | Used for | Where it lives |
   |-------|--------------|----------|----------------|
   | L0 | 1:110m | Whole globe, first load | In the first web load and the Android app |
   | L1 | 1:50m | Continent and country zoom | Lazy-loaded after the first question |
   | L2 | 1:10m | Close zoom, small countries, UK and US regions | Chunked by region, loaded on zoom |

2. **Switching levels:**
   - The camera distance picks the level.
   - **Hysteresis (placeholder):** a detail level appears at its zoom threshold T
     and is removed only below T − 0.25 zoom levels (about 19% further out), so
     detail doesn't flicker at a boundary.
   - One zoom level is a doubling of camera distance.
   - The new level fades in over the old one. With reduce motion on, it switches straight away.
3. **Zoom limits:**
   - Minimum: the whole globe in view, or the whole flat map.
   - Maximum: the smallest core item fills about a third of the screen (placeholder).
   - There is no zoom beyond L2 in the MVP.
4. **Offline:**
   - Android: L0–L2 ship in the app (within the 40 MB budget).
   - Web: L0 comes with the first load (within the 3 MB budget, D131).
     After the first completed round, the service worker caches L1 and L2
     in the background. It respects data-saver signals and the Network setting.
   - Until a chunk is cached, zooming offline stays at the best cached level.
     No error is shown.
5. **Grading doesn't depend on detail:** tap zones come from the pipeline and
   are the same at every level (D118).
6. **Extension point:**
   - Detail comes through a `DetailSource` interface.
   - The MVP has only `BuiltInDetailSource`.
   - Post-MVP street detail (PK07) adds `StreamedDetailSource`. It must be
     self-hosted, never OSM's servers (D26), and must show attribution on the
     map when used. It must never feed learning content (D87).
7. **No map tiles or outside map hosts** in the MVP. The zero-outside-requests gate covers this.

### Interfaces

```ts
export type DetailLevel = 'L0' | 'L1' | 'L2';

export interface DetailSource {
  readonly maxLevel: DetailLevel;
  isAvailable(level: DetailLevel, region: RegionChunkId): boolean;   // cached or bundled
  load(level: DetailLevel, region: RegionChunkId): Promise<Result<DetailMesh, DetailError>>;
}

export type DetailError = { kind: 'not-cached' } | { kind: 'invalid' };
```

### Edge cases
- Zooming into an area whose L2 chunk isn't cached yet while offline: L1
  stays on screen, and the area updates when the chunk arrives later.
- A content pack updates L2 geometry: it's applied at a pause (D163), and
  only the changed chunks are downloaded (FE02).
- Low memory (Redmi A5): L2 chunks outside the view are unloaded first (least recently used).
- Region borders at L2 (UK and US): drawn only when layer L5 is on for that item (FE08).

### Acceptance criteria
- **AC-09.1** The web first load, including L0 and the font, is ≤ 3 MB (CI gate 8).
- **AC-09.2** The Android package with L0–L2 is ≤ 40 MB (CI gate 8).
- **AC-09.3** After one completed round online, the web app zooms to L2 for
  any region in airplane mode (Playwright).
- **AC-09.4** Level changes don't flicker when the camera sits on a boundary (hysteresis test).
- **AC-09.5** Grading the same tap gives the same result at L0, L1 and L2 (property test).
- **AC-09.6** No request goes to any host other than ours while zooming (zero-outside-requests gate).
- **AC-09.7** With data-saver on, background caching doesn't start.
- **AC-09.8** Redmi A5: zooming across all levels for 5 minutes causes no
  crash and stays within the memory limit (manual, logged).
- **AC-09.9** Zooming back and forth within 0.25 levels of a threshold changes the detail level at most once (unit test).

### Out of scope
Street-level detail and streamed tiles (PK07), region packs, satellite imagery.
