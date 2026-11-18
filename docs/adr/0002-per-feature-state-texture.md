# ADR-0002: Per-feature styling through a state texture indexed by feature ID

- **Status:** Proposed
- **Date:** 2026-11-18
- **Feature:** FE08 (related FE06, FE07)
- **Decisions:** D24, D32, D121, D125, D157, D160, D162

## Context

FE08 makes the atlas a projection of learner state. Each item has an atlas state
(`undiscovered`, `discovered`, `established`, `fading`, `restored`) and each
detail layer (L1–L6) has its own state per item. The map must show those states
without ever showing fog, loss or pressure (D24), and the atlas may change only
at a pause (D32), apart from feedback highlights.

The spec fixes the rendering mechanism but not its details:

- Per-item state goes into a state texture indexed by feature ID (FE08
  Behaviour 10).
- Updating the atlas is one texture upload, not a rebuild of geometry.
- AC-08.8 requires updating 200 items' states to cost one texture upload and no
  geometry rebuild.
- States must differ by lightness (ΔL\* ≥ 15) and outline style, never by hue
  alone (06 §5.3, D125). Pattern strength scales textures.
- Established shows a light fill with soft relief; fading shows a mid fill,
  dashed outline and fine stipple; restored adds an 800 ms glow, replaced by a
  static highlight under reduce motion.
- Colours come only from design tokens, passed as shader uniforms (D125).
- The globe always sits on dark space (D157). The state texture must work in
  globe mode, flat mode and the morph.

Only `packages/globe` may import Three.js, and it may not import `content` or
read raw content (07 §4). Atlas state is computed by the pure
`engine/atlas/` projection and reaches the globe through
`GlobeController.setAtlas(snapshot: AtlasSnapshot)` (FE06, FE08). The import
rules therefore make the texture a globe-owned GPU resource, fed by a snapshot
that app-shell supplies.

## Decision

### 1. One state texture per body

- `globe` owns exactly one state texture for the active `CelestialBody`. It is
  created in `GlobeController.mount` and disposed in `dispose`.
- The texture is indexed by a dense per-feature slot. The slot is assigned by
  the content pipeline from the feature ID and is stable across detail levels
  L0–L2, the globe/flat meshes and L2 region chunks. It is not the raw Natural
  Earth ID, which is sparse and may be large.
- One texel holds every atlas layer's state for one feature. The format is a
  single-channel unsigned integer texture (`R32UI`, `RedIntegerFormat`,
  `UnsignedIntType`), sampled with `usampler2D` and `texelFetch`.
- Up to six layers use four bits each (24 of 32 bits), leaving eight bits
  unused. Four bits hold the five defined states with room to append. Layers
  are packed in the FE08 order: country, capital, rivers, relief, regions,
  biomes.
- A feature with no atlas-capable item still has a slot and reads
  `undiscovered`. The texture is never sparse, so the shader needs no lookup
  table.

Texture dimensions are `width = max(1, min(slotCount, maxTextureSize))` and
`height = ceil(slotCount / width)`. The shader receives the width as an integer
uniform and computes `x = slot % width`, `y = slot / width`. This keeps the
texture valid on devices whose maximum texture size is smaller than the slot
count. Filtering is nearest, mipmaps are off and wrapping is clamp-to-edge.
`texelFetch` avoids sampling bleed between neighbouring features. The globe's
materials use GLSL ES 3.00 (`glslVersion: GLSL3`), because integer textures,
`usampler2D` and `texelFetch` are not available in GLSL ES 1.00.

### 2. Encoding

| Value | Atlas state |
|-------|-------------|
| 0 | `undiscovered` |
| 1 | `discovered` |
| 2 | `established` |
| 3 | `fading` |
| 4 | `restored` |
| 5–15 | Reserved; treat as `undiscovered` |

The mapping is append-only. A future state gets the next value and the shader
is updated with the pack's data-format version; existing values never move, so
a stored or replayed snapshot cannot silently change meaning. An unknown value
is rendered as `undiscovered` and logged to diagnostics (FE04); it never
becomes a user-facing error.

### 3. Geometry carries only the slot

- Each map vertex gets one integer-ish attribute, the feature slot. The
  pipeline writes it once per mesh and never rewrites it for atlas changes.
- The vertex shader projects the position and passes the slot to the fragment
  shader with a `flat` interpolation qualifier, so the slot is sampled per
  feature rather than blended across a border.
- The state texture therefore decouples styling from geometry: a state change
  touches bytes in the texture, never positions, indices, normals or UVs.
- The slot attribute also replaces per-feature branching in the shader. There
  is no per-state draw call, material or mesh.

### 4. Styling from one fetch

The fragment shader performs one `texelFetch` for the fragment's slot, extracts
the nibble for the layer being drawn, and derives:

- the fill lightness step, from the token palette;
- the outline style (none, solid or dashed);
- the stipple mask for `fading`;
- the soft-relief shading for established country fill;
- whether a restored glow is active.

Static pattern and relief masks are small, shared textures or procedural masks
loaded once at mount. They are not per-feature state and are not re-uploaded
when the atlas changes. Pattern strength is a uniform that scales the mask, so
the setting changes no texture bytes. Colours are uniforms sourced from
`packages/ui/tokens.ts`; the globe never hard-codes a colour (D125).

The soft relief is deliberately faint shading, not the full terrain relief of
layer L4. The L4 state only enables the full relief path for that layer.

### 5. Updating the atlas

- app-shell computes a new `AtlasSnapshot` at a pause (or a feedback highlight
  inside a round), compares it with the previous snapshot using
  `atlasChanges`, and passes the snapshot to `setAtlas`.
- `globe` keeps a CPU-side `Uint32Array` mirror, writes only the changed
  nibbles and uploads the texture once per `setAtlas` call.
- The preferred path is one `texSubImage2D` over the contiguous dirty range.
  If the changes are scattered, the whole texture is uploaded in one call. Both
  are one upload and neither rebuilds geometry, which satisfies AC-08.8. The
  full texture is at most four bytes per feature, so a whole-texture upload at
  a pause is acceptable and simpler than tracking many ranges.
- The snapshot is applied atomically: the texture is updated before the next
  frame is requested, and no partially applied atlas can be drawn.
- `setAtlas` requests a frame. A round with no atlas change continues to draw
  nothing while idle (AC-06.4).

### 6. Restored and pause animation

- `restored` is written as state 4 and shown at the next pause. After the
  pause's restored presentation, app-shell sends the next snapshot with the
  item as `established`, which is one further texture update.
- The FE08 pause animation runs in turn (D32), capped at 12 items by the
  placeholder in `placeholders.md`. The globe receives the ordered changed
  slots for that pause and drives their bloom from a small uniform array of
  slot and start-time pairs. The cap is read from `engine/tuning.ts`; it is
  not duplicated in the renderer.
- With reduce motion on, the globe writes the final state and draws a static
  highlight instead of a timed glow (06 §7). No animation state is stored.
- H03 haptics are fired by the UI layer for newly established or restored
  items, not by the renderer. The 300 ms gap (D162) stays in one owner.

### 7. Detail levels, chunks and mode changes

- L0–L2 meshes and L2 region chunks share the same `FeatureSlot` namespace
  defined by FE09's `GeometryChunk`/`RegionChunk` contract and 04 §6.1, and
  the same state texture. Loading a chunk uploads geometry only; its atlas
  states are already present.
- The cut mesh used for the flat map reuses the same slot attribute, so the
  globe/flat morph changes positions, not styling. State survives the morph.
- On `webglcontextlost`, the texture and its CPU mirror are retained logically
  and rebuilt from the last snapshot after `webglcontextrestored`, alongside
  the other GPU resources (AC-06.6). The round is not restarted.
- Switching perspective may remove items from the atlas. The snapshot is
  authoritative; the globe never derives state from geometry or content.

### 8. Determinism and failure

- The texture is a pure function of the snapshot: same snapshot, same bytes.
  No clock, random source or frame timing influences the state values.
- If the snapshot contains a slot outside the allocated range, that feature is
  ignored and the mismatch is written to diagnostics (FE04). The globe does not
  show an error.
- If the required texture cannot be allocated, mount fails with
  `GlobeError` rather than silently rendering a wrong atlas. The user-facing
  path then follows FE06's S20/S21 handling.

## Consequences

**Positive**

- One texture upload per atlas change and no geometry rebuild (AC-08.8).
- One draw path for every state, layer and detail level; no state-specific
  materials, meshes or draw calls.
- The state texture is tiny: four bytes per feature, with all six layers in one
  texel.
- Pattern strength, reduced motion and theme changes cost uniforms, not
  texture uploads.
- No new runtime dependency; the design uses WebGL2 integer textures and
  Three.js features already required by D130.

**Negative**

- The pipeline must assign and preserve a dense, globally stable slot per
  feature. That is new pack data and a new invariant to test.
- The shader must unpack nibbles and handle the texture's 2D tiling arithmetic.
  This is simple but must be covered by the reference-replay and screenshot
  tests.
- Integer textures cannot be filtered or mipped, so features cannot blend
  states at their edges. A future soft transition needs a separate mechanism;
  none is added now.
- A full-texture fallback upload is larger than a per-item update would be.
  It is still one upload and bounded by four bytes per feature.

## Alternatives considered

- **Per-vertex colour attributes:** rejected. Every atlas change would rewrite
  and re-upload geometry, which violates AC-08.8 and the one-upload rule.
- **One mesh, material or draw call per state:** rejected. It multiplies draw
  calls, makes a state change re-bucket geometry, and is worse on the Redmi A5.
- **A uniform array of states indexed by feature:** rejected. Uniform limits
  are far below the number of atlas features, and array indexing plus updates
  would be fragile across devices.
- **A JavaScript map lookup per feature at render time:** rejected. It moves
  per-fragment work to the CPU, needs a texture or buffer upload anyway, and
  cannot drive per-fragment pattern and outline styling.
- **Hashing `ItemId` in the shader:** rejected. Hashes collide, are not dense,
  and would make state allocation opaque to the pipeline and tests.
- **One texture per layer:** rejected. A change spanning layers would become
  several uploads, and it multiplies texture bindings.
- **RGBA8 with two bits per state:** rejected. Five states need three bits, so
  this either loses a state or needs a second texture. `R32UI` holds all six
  layers in one texel without compression.
- **Normalised 8-bit texture with linear filtering:** rejected. Filtering
  blends adjacent features at borders and cannot represent integer states
  exactly.
- **Rebuilding the atlas texture from `atlasState` on every frame:** rejected.
  It is wasteful, breaks render-on-demand, and is unnecessary because the
  snapshot changes only at a pause.

## Open question

The internal geometry and snapshot contracts are now defined by FE09/FE08 and
04 §6.1/§8.1. One learner-visible perspective question remains deliberately
open: FE08 says an item that leaves the perspective disappears from the atlas
without a "lost" effect, but does not say whether its geometry is omitted,
drawn as undiscovered, or hidden by another mechanism. This ADR does not
choose one; the globe follows whatever the approved perspective pack and
snapshot provide.

## References

- FE08 Behaviour 2–4, 9–10; AC-08.1, AC-08.2, AC-08.4, AC-08.5, AC-08.8
- FE06 Behaviour 1, 6, 9, 12; AC-06.4, AC-06.6
- FE07 Behaviour 7–8
- 04 §6; 06 §5.3, §5.4, §7; 07 §4, §6, §7
- FE06/FE08/FE09 Interfaces: `FeatureSlot`, `GeometryChunk`, `RegionChunk`,
  `AtlasSnapshot`
- `placeholders.md`, "Map and atlas" (pause animation cap, 12 items)
- D24, D32, D121, D125, D157, D160, D162
- ADR-0001 (label collision), for the same import-boundary problem
