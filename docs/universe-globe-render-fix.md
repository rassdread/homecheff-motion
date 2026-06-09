# Universe Globe Render Fix

## Root cause

Globe wrapper was `z-[10]` while orbit planets were `z-[3]`, causing the globe to paint **on top of** planets, rings, and portals.

## Fixes

### Layer hierarchy (orbit system)

| Layer | z-index |
|-------|---------|
| Pipeline | 1 |
| Globe wrapper | 5 |
| Orbit planets (rings/portals/satellites inside) | 50 |
| Planet ring | 70 |
| Planet sphere | 80 |
| Portal | 90 |
| Satellites | 100 |

Globe atmosphere glow contained to 102% (was 114%).

### Globe size

Hero globe reduced to `min(34vw, 320px)` so orbit planets are not physically covered.

### Earth continents

Replaced abstract blobs with **geographic polygon coastlines** (Natural Earth–style lat/lon points) in 360×180 equirectangular projection:

- North America, South America, Europe, Africa, Asia, Australia
- Greenland, India, Japan, Antarctica, Arctic

### Ecosystem network

Separate `GlobeEcosystemOverlay` with orthographic projection on the sphere:

- **13 hubs** always visible (glow + node)
- **11 routes** with animated dash pulse + light packets
- **Labels** on globe hover/focus

### Debug QA

Add `?universeDebug=ocean|continents|nodes|full` to isolate layers.

## Validation

- `src/lib/universe-globe-render.test.ts`
- 2478/2478 tests pass
