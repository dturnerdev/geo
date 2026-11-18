# ADR-0001: Label collision and priority for globe labels

- **Status:** Proposed
- **Date:** 2026-11-18
- **Feature:** FE06 (related FE08)
- **Decisions:** D121, D125, D130, D153

## Context

FE06 draws map labels with `troika-three-text`, in both globe and flat mode.
The label set is decided in app-shell (D121): only items whose name facet is
established, minus any item in the current question. The globe receives that
set and must not add label rules of its own.

Collision is resolved by item priority (fame), with at most 60 labels on screen
(placeholder). Label size follows the device text size, clamped to 1–1.6×
(06 §5.4), and the map must stay smooth on low-cost phones.

Troika renders signed-distance-field text. It does not provide a label manager:
no collision detection, priority, decluttering, screen-space bounds management
or label pooling. Those concerns must live in `globe`, because only it knows the
camera, the projected positions and the rendered text metrics. Under the import
rules in 07 §4, `globe` may import Three.js, troika, d3-geo, `domain` and
`engine/geo`, but not `content`, React or storage.

The map is drawn on demand. Labels are part of a rendered frame; when the globe
is idle no frame is drawn (AC-06.4).

## Decision

### 1. Ownership

- Collision and priority are owned by `packages/globe` in a small label-layout
  module. It consumes a label snapshot and returns which labels are visible,
  with their screen positions.
- App-shell remains the only owner of eligibility: the established name facet
  and the current-question exclusions. An empty visible set hides every label
  and draws none (AC-06.9).
- Troika is used only as the text renderer. No second text or label library is
  added.

### 2. Inputs

For each candidate label, the layout needs:

- a stable `ItemId`;
- the display text for the active perspective and locale;
- an anchor (`LngLat` or the pipeline's projected anchor) and the current screen
  position;
- a fame/priority value;
- the current device text scale, already clamped to 1–1.6.

The spec currently defines `setVisibleLabels(items: ReadonlySet<ItemId>)` and
does not say where display text and fame are carried. The globe must not read
raw content to fill that gap (07 §4). This ADR therefore requires app-shell to
supply the label data with the visible set; the layout itself is independent of
how that data arrives. See the open question below.

### 3. Priority order

1. Candidates are ordered by descending fame.
2. Equal fame is broken by ascending `ItemId`, so the result is deterministic.
3. A candidate with no fame value is treated as the lowest priority, so a
   malformed pack cannot displace valid labels.

The layout then greedily scans that order and accepts a label only if its padded
screen rectangle does not intersect any rectangle already accepted. It stops
after 60 accepted labels. The 60 cap is the FE06 placeholder; it is passed to
the layout rather than duplicated as a second setting.

### 4. Collision test

- Project each anchor to CSS pixels using the active camera and view mode.
- Exclude anchors behind the globe, outside the viewport or outside the drawn
  map area before they enter the priority sort.
- Use troika's measured text bounds after `sync()`, transformed to screen
  space. Cache bounds per item, display text, font and text scale.
- Keep a label hidden until its text has measured bounds. This avoids popping
  in a label at an estimated size and then resizing it.
- Expand each rectangle by a small padding so labels do not touch. The padding
  is visual spacing, not a learning placeholder.
- Accept or drop whole labels. Do not move a label away from its anchor in the
  MVP. A label that does not fit is hidden; drawing it elsewhere would misstate
  the place and cause jitter.

The layout is recalculated when the camera changes, the viewport or text scale
changes, the view mode morphs, the perspective or content changes, or the
visible-label set changes. It is not recalculated while the globe is idle.

### 5. Rendering

- Each visible label is a troika `Text` object in a labels-only overlay group
  rendered after the opaque map. Front/back culling is done by the layout, not
  by depth testing against the terrain.
- Reuse a pool of at most 60 `Text` instances. Update text only when the item,
  name, locale or text scale changes; call `sync()` after an update and hide
  unused instances.
- Use design-token colours only (D125). The canvas stays `aria-hidden`; the
  screen-reader alternative belongs to FE10.
- Dispose the label pool with `GlobeController.dispose()`.

### 6. Size and modes

- Font size is the UI label size multiplied by the device text scale, clamped
  to 1–1.6×. It is applied as an on-screen size, so zooming does not change it.
- The same priority, cap and collision rules apply in globe and flat mode.
  The projection changes only anchor positions, not priority (06 §11).

### 7. Determinism

Given the same candidates, fame values, viewport, camera and text scale, the
layout result is identical. The layout uses no `Math.random`, clock or
animation-dependent sampling. Ordering and rectangle acceptance are pure
functions and can be tested without WebGL.

### 8. Failure and limits

- If text measurement fails, hide that label and write the technical detail to
  diagnostics (FE04). Do not show a user-facing error.
- If performance work is needed on a low-end device, reduce the FE06 placeholder
  cap; do not add a hidden device-specific label rule.

## Consequences

**Positive**

- The approach is simple, deterministic and allocation-light, with no new
  runtime dependency.
- The highest-fame labels always win, labels never move from their anchors, and
  there are no misleading leader-line placements.
- The same rules work in globe mode, flat mode and the morph.

**Negative**

- Greedy acceptance can leave space where a lower-priority label could have
  fitted; it does not find a globally optimal set. This is accepted for
  readability and priority clarity.
- Dense areas will hide many labels. The MVP has no offsets, leader lines or
  multi-column layout.
- Labels can pop when panning or when a higher-priority label enters or leaves.
  The spec does not define label hysteresis, so none is added.
- The current FE06 interface does not carry the display text or fame needed by
  the layout (see below).

## Alternatives considered

- **Troika built-in collision:** none exists.
- **DOM labels or `CSS2DRenderer`:** rejected. It adds one DOM node per label,
  mixes two rendering paths, risks duplicate screen-reader output and is slower
  on low-end devices.
- **Third-party collision or decluttering library:** rejected. It would add a
  runtime dependency without spec authority, and 60 labels do not need one.
- **Fixed screen-grid occupancy:** rejected. It is simpler, but drops labels
  that could fit and is sensitive to the chosen cell size.
- **Global optimisation (for example maximum independent set):** rejected. It
  is expensive or non-deterministic and unnecessary at this scale.
- **Anchor offsets and leader lines:** rejected for the MVP. They can misplace
  names or add clutter; revisit if label density complaints appear.
- **Priority by screen area or camera distance instead of fame:** rejected. It
  contradicts FE06.
- **App-shell priority-only prefilter without collision:** rejected. It does not
  resolve overlaps.

## Open question

**Label input contract.** FE06's interface exposes only
`setVisibleLabels(items: ReadonlySet<ItemId>)`, while the layout needs display
text and fame for each item. `globe` may not import `content` or read raw
content (07 §4), and perspective display names come from `ContentView` (FE07).
This ADR does not change the spec. Before FE06 implementation, the spec must
state how app-shell supplies `{ itemId, text, fame }`, for example through an
extended label snapshot or a `GlobeOptions` resolver. Until that is resolved,
this ADR remains Proposed.

## References

- FE06 Behaviour 8 and 11; AC-06.4 and AC-06.9
- FE08 Behaviour 5
- 06 §5.4 and §11
- `placeholders.md`, "Labels on screen"
- D121, D125, D130, D153
- 07 §4, §7 and §11
