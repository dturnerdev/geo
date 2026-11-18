# 04 — Content and data

**Status:** v1.0. Decisions: D84–D90, D101, D105–D107, D111–D120, D127, D146,
D153, D156, D161, D163, D166, D174.

## 1. Sources and licences (MVP)

| Layer | Source | Licence | Credit |
|-------|--------|---------|--------|
| Borders, coastlines, rivers, lakes, populated places, perspectives | Natural Earth | Public domain | Courtesy credit |
| Tectonic plates | PB2002 (Bird), converted by Nordpil | ODC-By | Required |
| UK boundaries (ceremonial, historic counties) | OS Boundary-Line | OGL | Required |
| US states | US Census cartographic boundaries | Public domain | Courtesy credit |
| Facts, IDs, alternative names | Wikidata | CC0 | Courtesy credit |
| Flags | lipis/flag-icons | MIT | Required. Every flag checked by a person |
| Typeface | Atkinson Hyperlegible Next | SIL OFL | Required |
| Icons | Lucide | ISC | Required |

**Post-MVP:** street detail from a self-hosted Protomaps basemap (ODbL tiles,
"© OpenStreetMap" visible on the map). Streamed only, never in the content
database (PK07). Deep stats from World Bank or similar (licence confirmed
before F23).

### Licence rules (D87)
- **No OpenStreetMap data in learning content.** It would force the whole
  database under ODbL.
- Content allowlist: public domain, CC0, OGL, MIT, ODC-By, CC-BY. No
  non-commercial or share-alike sources. App assets (fonts, icons) also allow OFL and ISC.
- `content/licences.toml` lists every source, licence, credit text and
  check date. Credits screen generated from it. CI fails if a source has no credit.

## 2. What counts as a country (D90)

Political status is a dated field on each item, not a fixed list.

| Status | Examples | Class |
|--------|----------|-------|
| UN member state | 193 | Core |
| UN observer state | Holy See, Palestine | Core |
| Partly recognised | Kosovo, Taiwan, Somaliland, Northern Cyprus | Curiosity + neutral status fact |
| Dependent territory | Greenland, Puerto Rico, Bermuda | Curiosity + link to governing country |
| Overseas part of a country | French Guiana, Réunion | Curiosity, taught as part of France |
| Constituent country | England, Scotland, Wales, Northern Ireland | Core for UK users |
| Special administrative region | Hong Kong, Macau | Curiosity |
| Special case | Antarctica | Core as continent, curiosity "claims" layer |

**Question rule:** answers and distractors only use items valid in the user's perspective.

## 3. Perspectives and disputed areas (D84, D85)

- Every user has a **map perspective** from their region: UK → UK, US → US, others →
  Natural Earth default (ground control, disputed lines dashed).
- A perspective file defines border lines, item status and names. It's built from
  Natural Earth's ready-made perspectives.
- Markets without a ready perspective: the nearest one plus a reviewed list of changes.
- Disputed areas are taught with two neutral facts: **who controls it** and **who claims it**.
  Never "which country is X in?".
- Borders and facts are tagged with the perspectives they apply to. Graders
  accept answers correct under the user's perspective.
- Credits notice: "Borders shown follow [perspective]. Their inclusion
  doesn't imply endorsement." (D146)

### Markets (D86)
UK and US in the MVP, Europe next. China, Russia and India excluded pending a perspective and legal review (D86, PK04, PK10).

## 4. UK and US regions (D70)

| Set | Class (home users) |
|-----|--------------------|
| UK nations | Core |
| England ceremonial counties (48) | Core |
| England historic counties | Curiosity, "old map" overlay |
| Administrative authorities | Not taught |
| Scotland, Wales, Northern Ireland sets | **Open content task:** choose sets before M2 content work |
| UK cities (population + city status) | Core |
| US 50 states + DC, state capitals | Core |
| US territories | Curiosity |

## 5. Knowledge graph

### IDs
- Our own permanent ID per item (`country.kaz`, `river.danube`), mapped to
  Wikidata QID, ISO code and Natural Earth ID.
- IDs are never reused or deleted.

### Fact fields
Value(s) · role (e.g. executive capital) · valid from / to · source · licence ·
last checked · perspectives.

### Relationships
`borders`, `flowsThrough` (ordered), `locatedIn`, `memberOf`, `partOf`,
`sitsOnPlate`, `capitalOf`, `lookalikeOf` (with reason: name, shape, flag,
flag-colour-vision), `familyOf`.

### Authoring format (D101)
TOML for facts, GeoJSON for shapes. Example:

```toml
[item."country.kaz"]
type = "country"
status = "un-member"
class = "core"
wikidata = "Q232"
iso = "KZ"
names.en-GB = "Kazakhstan"
names.en-US = "Kazakhstan"
fame = 0.62

[[item."country.kaz".fact]]
facet = "F08"
value = "city.astana"
validFrom = "2019-03-23"
source = "wikidata"
lastChecked = "2026-11-17"

[[item."country.kaz".fact]]
facet = "F08"
value = "city.nur-sultan"
validFrom = "1997-12-10"
validTo = "2022-09-17"
source = "wikidata"
note = "Former name of Astana, accepted as an answer"
```

(Example values are for illustration. The pipeline verifies them against sources.)

### Repository layout
```text
content/
  items/        TOML per item type
  shapes/       GeoJSON sources (may contain 180° splits)
  perspectives/ one file per perspective
  relations/    graph edges
  hooks/        memory hooks (reviewed)
  games/        game definitions (FE10)
  goals/        goal presets (D170)
  tuning/       population parameters (FE17)
  daily/        daily challenge pool and schedule (D174)
  audio/        manifest + clips (test/ internal builds only)
  legal/        privacy notice, tester consent text
  experiments/  definitions shipped in packs
  licences.toml
```

## 6. Pipeline (`tools/content-pipeline`)

1. **Import:** Wikidata, Natural Earth, OS, Census into staging.
2. **Review:** a person approves staging diffs via PR (D88). AI drafts are allowed, nothing
   ships unreviewed.
3. **Checks:**
   - Every country has a flag and capital.
   - Shape-derived neighbours match Wikidata.
   - No orphaned or reused IDs.
   - Coordinates ≤ 6 decimals (D114).
   - Every source in the licence register.
   - Perspective consistency.
   - Daily challenge items and placement probes are the same in all three
     perspectives (UK, US, default). No disputed areas.
   - Daily schedule covers at least 90 days ahead and never changes a date
     published in the previous pack (D174).
   - Every core item has a fame tier. Probe sets exist per continent and
     facet group (D166).
   - Topic names and descriptions exist in both locales.
4. **Build:**
   - Rejoin 180° splits and fix ring direction (D120).
   - Sphere mesh + outlines for the globe.
   - Cut mesh for the flat map (lazy-loaded, D153).
   - Tap zones, enlarged for small items (D118).
   - Simplified shapes per zoom level.
   - Published distances via geographiclib (D116).
   - Lookalike tagging, including colour-vision simulation of flags (D127).
   - Fame tiers, placement probe sets and the daily schedule.
   - Audio manifest.
   - Credits.
5. **Package:** versioned pack, data-format version declared, signed Ed25519 (D107).

### 6.1 M1 geometry and stable feature slots

The geometry outputs in the M1 setup task are logical records in the signed
pack. Their TypeScript contracts are in the FE09 Interfaces block in
`05-features/m1-map.md`; this section fixes the format invariants without
prescribing a transport encoding.

- A pack has one `FeatureSlotTable`; a `GeometryChunk.features` list is the
  subset of that table referenced by its vertices. A `GeometryChunk` has one
  detail level (`L0`, `L1` or `L2`), one optional
  `RegionChunkId`, a `DetailMesh`, feature-slot entries, outlines, tap zones and
  label anchors. L0 and L1 are whole-map chunks. L2 is split into
  `RegionChunk` records and each region record has level `L2`.
- `DetailMesh.spherePositions` and `flatPositions` are packed XYZ triples with
  equal vertex counts. `indices` are non-negative vertex indices and
  `featureSlots` has one entry per vertex. The sphere and flat arrays are the
  joined globe and flat cut positions; a morph changes positions, not slots.
- A `FeatureSlot` is a non-negative dense integer in one pack-wide slot
  namespace. `FeatureSlotEntry.featureId` is the pipeline's stable feature
  identity and `item` is its `ItemId`, or `null` for geometry with no atlas
  item. A slot is assigned once to a feature identity and is reused by every
  L0–L2 mesh and L2 region chunk containing that feature. Slots are not raw
  Natural Earth IDs. An item with multiple geometry features has one entry per
  feature, and all those slots receive the item's atlas state.
- A retired feature keeps its slot as a `null` entry in later compatible pack
  data; slots are never renumbered or reassigned to another feature identity.
  New feature identities append to the slot table, preserving a dense
  zero-based namespace while keeping existing slots stable.
- The pipeline rejects duplicate slot or feature identities, a slot outside the
  pack slot table, mismatched position lengths, invalid indices, and a mesh
  vertex whose slot is not in the chunk's entries. It also rejects a region
  record that is not L2. Coordinates in tap zones and label anchors are
  validated as branded `LngLat` values (07 §8).
- Geometry, tap zones and label anchors are immutable pack data. Atlas updates
  modify only the state texture; they never rewrite geometry or slot
  assignments (FE08 and ADR-0002).

## 7. Content changes without losing progress

| Change | Rule |
|--------|------|
| Rename | Same ID. Old name end-dated and still accepted |
| Answer changes (capital moves) | Partial memory reset for that facet + "This has changed" mini-Meet |
| Border change / new country | New ID, old one end-dated. Progress mapped where meaning is unchanged |
| Item retired | Removed from scheduling. Never deleted from the log |
| Pack versions | Each pack declares its data-format version. The server sends each app version a pack it can read, for 5 years (D137) |

## 8. Content packs and delivery

- Immutable, fingerprinted files. Changes-only downloads (D105).
- Checks: Android at most twice a day on unmetered and battery not low. Web on open (D111).
- Signature verified before use. Invalid packs are discarded.
- Applied at a pause, never mid-round (D163). The previous pack is kept for rollback.
- Packs also carry feature flags, experiment definitions, tuning and the daily
  schedule (FE03, FE21).
- Urgent content fixes ship as a pack within 48 hours (D146).

### 8.1 M1 perspective and detail records

- The existing `ContentPack` envelope remains the signed pack boundary. Its
  payload contains perspective records, geometry chunk records and the
  existing flags, experiments, tuning and daily records; `ContentPack` is not
  redefined by M1.
- A perspective record contains the existing `PerspectiveId`, optional parent,
  provenance (`source` and `reviewer`), perspective item records, border-line
  records and fact overrides. Item records carry the existing `ItemId`, an
  opaque item kind and status, locale-keyed names, and the authored fame value.
  The FE07 contract deliberately does not enumerate statuses, names, disputed
  areas or perspective IDs beyond the existing interface.
- A perspective must have non-empty provenance and every inherited or changed
  record must retain its source and reviewer. The pipeline flattens inheritance
  before a pack is used. `ContentView` exposes only the active flattened
  perspective; raw pack records never enter the engine.
- Geometry chunks are referenced by their detail level and region ID and are
  content-addressed by the existing lower-case SHA-256 `PackChunk` hash. L0 is
  bundled; L1 and L2 may be separate immutable chunks. A chunk reference does
  not create a new host or request type.

### 8.2 Service-worker detail cache

- The service worker may cache only same-origin immutable pack-chunk URLs made
  by the existing `/packs/chunks/{sha256}` layout (FE02). The cache key is the
  complete URL, including the data-format pack host path; the SHA-256 in the
  URL and manifest descriptor identifies the bytes.
- A cached chunk is usable only after its bytes have passed the existing hash
  check and the assembled signed pack has passed validation. Incomplete,
  mismatched or invalid chunks are not promoted to usable cache entries.
- Cache state is per `(dataFormat, sha256)`, with the bundled L0 chunks always
  available and L1/L2 chunks either absent or usable. The best usable level
  remains on screen when a requested L2 region is absent; absence is not a
  user-facing error.
- After the first completed round, background caching may request only the
  L1/L2 chunk references for the active pack. It must not start when data saver
  is enabled or the Network setting disallows it, and it must not request any
  host other than the configured static pack host (FE09, AC-09.6–AC-09.7).
- A newly applied pack has its own content-addressed cache entries. Old entries
  may remain for reuse, but a chunk is never overwritten in place. Applying a
  pack and changing geometry remain pause-bound (D163).

## 9. Audio

- AAC-LC `.m4a`, mono for voice and effects (D156).
- Place-name clips per item in en-GB and en-US accents, stored by item ID.
  Pronunciation stored as IPA. Loudness −16 LUFS.
- Text-to-speech provider chosen only after checking its terms allow distributing the audio
  (voice model licences vary).
- Non-commercial test audio only in internal builds. Release builds block it via
  licence tags (D89).
- A person checks a list of hard-to-pronounce names.
- **Music:** none in the MVP. The channel is off by default (D161).
- Captions always shown for voice (D57).

## 10. Size budgets (D106)

| Item | Budget |
|------|--------|
| Web first load (incl. font) | ≤ 3 MB |
| Android download | ≤ 40 MB |
| Flat-map cut mesh | Lazy-loaded, excluded from first load |
| Audio | Per accent, only the user's accent downloaded |
| Event history | about 6–25 MB per year |

## 11. Open content tasks

| Task | When |
|------|------|
| Scotland, Wales and NI region sets | Before M2 content |
| Fame score formula and weights | M2 |
| TTS provider and licence check | M4 |
| Daily challenge pool and schedule for year 1 (D174) | M4 |
| Placement probe sets per continent and facet group (D166) | M4 |
| Topic names and descriptions, both locales | M4 |
| Deep stats source licence | Before F23 content |
