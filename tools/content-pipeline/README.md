# Content pipeline

Builds authored content into signed, content-addressed packs (04 §6, FE02).

## M1 geometry

`src/geometry.ts` turns projected source features into the pack records defined
in FE09. It owns the pack-wide stable feature-slot namespace, L0/L1 whole-map
chunks and L2 `RegionChunk` records. The source adapter supplies sphere and flat
vertex positions; the pipeline assigns slots, joins meshes, offsets indices and
checks every invariant in 04 §6.1 before a chunk can be published.

Run the deterministic pipeline tests with:

```sh
pnpm exec vitest run tools/content-pipeline
```
