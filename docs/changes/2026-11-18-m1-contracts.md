# M1 contracts report

## Base commit

`origin/main` at run start: `1bda6ef6c116e42fb36e6a905279306f7d1c90e3`.
`HEAD`, `origin/main` and `git merge-base HEAD origin/main` matched before
editing.

## Done

- **Geometry chunks and stable feature slots:** added `FeatureSlot`,
  `FeatureSlotEntry`, `FeatureSlotTable`, `DetailMesh`, `GeometryChunk`,
  `RegionChunkId` and `RegionChunk` to the FE09 Interfaces block at
  `docs/spec/05-features/m1-map.md:557-604`. Added the pack invariants,
  tombstones, shared L0–L2/L2-region slot namespace and validation rules at
  `docs/spec/04-content-and-data.md:177-211`.
- **Perspective schema:** added opaque `ItemKind` and status types,
  `ContentItem`, `BorderLine`, `PerspectiveFactOverride`, provenance and
  `PerspectivePack` to the FE07 Interfaces block at
  `docs/spec/05-features/m1-map.md:244-287`. The existing `ContentPack`,
  `PerspectiveId`, `ItemId`, `Locale` and `RegionCode` definitions are
  referenced, not redefined. Pack record rules are at
  `docs/spec/04-content-and-data.md:228-247`.
- **Service-worker chunk/cache contract:** documented immutable SHA-256 chunk
  references, usable-cache promotion, bundled L0, background L1/L2 caching,
  data-saver/Network gating and the existing static host boundary at
  `docs/spec/04-content-and-data.md:249-268`. No source or runtime dependency
  was added.
- **Label text and fame:** added `LabelData`, `GlobeOptions.labelFor` and the
  `Unsubscribe` contract at `docs/spec/05-features/m1-map.md:106-130`, keeping
  `setVisibleLabels(items: ReadonlySet<ItemId>)` unchanged. Updated
  ADR-0001's status and input contract at
  `docs/adr/0001-label-collision-and-priority.md:3,42-58,165-174`; status is
  `Proposed`.
- **Camera and coordinates:** added branded `LngLat`, `CameraTarget` and
  `CameraState`, with boundary validation rules and no learner-facing camera
  defaults, at `docs/spec/05-features/m1-map.md:85-104`.
- **AtlasSnapshot and atlas support types:** added per-item and per-feature
  layer state, `AtlasSnapshot`, `AtlasChange` and summary contracts at
  `docs/spec/05-features/m1-map.md:408-472`.
- **ADR-0002:** updated the status to `Proposed`, connected the technical
  decision to the final FE09 geometry/slot and FE08 snapshot contracts, and
  retained the unresolved perspective-removal question at
  `docs/adr/0002-per-feature-state-texture.md:3,150-162,228-245`.

## Blocked

- No code or automated tests were added: this queue item defines internal
  contracts only. FE06–FE09 implementation, pack fixtures and device/network
  checks remain for the M1 build.
- `LearnerState` remains M3-owned and is not safely definable in this M1
  contract without deciding learning-state shape; the existing FE08 signature
  remains unchanged at `docs/spec/05-features/m1-map.md:466-468`.

## Spec questions

The following learner-visible choices were deliberately not invented:

1. **Perspective statuses and which perspectives exist.** The feature still
   says: “**Item status:** for example, sovereign state, observer state,
   territory, constituent country or disputed area.” and “**MVP perspectives:**
   `uk` and `us` ... `default` ...” at
   `docs/spec/05-features/m1-map.md:187-195`. The contract uses opaque status
   values and the existing `PerspectiveId` union; the approved status
   vocabulary and future perspective set remain a spec question.
2. **Perspective names and missing-locale fallback.** The feature says:
   “**Display names,** with optional en-GB / en-US variants.” at
   `docs/spec/05-features/m1-map.md:190-192`, while `displayName` must return a
   string at `docs/spec/05-features/m1-map.md:289-303`. The learner-visible
   fallback when a requested locale is absent is not selected.
3. **Disputed-area treatment and perspective content.** The feature says:
   “Each disputed area has `controlledBy` and `claimedBy` facts (multi-value,
   with roles).” and “Questions ask only \"Who controls X?\" and \"Who claims
   X?\".” at `docs/spec/05-features/m1-map.md:216-220`. The pack contract carries
   opaque fact overrides and does not choose additional statuses, names,
   claims or controls.
4. **Perspective removal rendering.** The feature says: “An item leaves the
   perspective (FE07): it disappears from the atlas without any \"lost\" effect.”
   at `docs/spec/05-features/m1-map.md:481-482`; whether its geometry is omitted,
   undiscovered or hidden remains open, as also recorded in ADR-0002 at
   `docs/adr/0002-per-feature-state-texture.md:228-236`.

## New dependencies

None.

## Carry forward

- Implement FE06–FE09 against these contracts, then add pack schemas,
  fixtures and AC-named tests in the M1 build.
- Define `LearnerState` with the M3 learning-engine contract before relying on
  the FE08 `atlasState` implementation outside a type boundary.
- Resolve the four perspective questions above before authoring learner-visible
  perspective data or changing the existing FE07 behaviour.

## Review these

- Review the `FeatureSlotTable` stability and tombstone rule against the
  pipeline's eventual feature identity source.
- Review the opaque perspective records and locale fallback before creating
  `content/perspectives/*.toml`.
- Review ADR-0001 and ADR-0002 as Proposed records; no ADR was accepted here.

## Final checks

| Command | Result |
|---|---|
| `git diff --check` | Pass |
| `git status --porcelain` | Pass (clean after commits) |
| `git diff --name-only origin/main...HEAD` | Pass — five intended paths: the two ADRs, `docs/spec/04-content-and-data.md`, `docs/spec/05-features/m1-map.md` and this report |
| `pnpm lint` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm test` | Pass — 138 passed, 16 skipped |
| `pnpm format:check` | Pass |
| `pnpm gates` | Pass — gates 1, 2, 7, 8, 9 and 11 |
