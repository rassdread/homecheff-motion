# Universe Real World Globe Asset Fix Report

## Source Map Asset

**File:** `public/universe/world-map-natural-earth-110m.svg` (~2 MB)

**Origin:** Wikimedia Commons — [NED_worldmap_110m.svg](https://commons.wikimedia.org/wiki/File:NED_worldmap_110m.svg)

**Data:** Natural Earth 1:110m cultural vectors, exported via QGIS

**Format:** Equirectangular SVG, 800×400 (lon −180…180, lat 90…−90)

Hand-drawn continent blobs in `universe-globe-earth.ts` were removed. The globe now uses this real map layer via `WorldMapTexture`.

## License Safety

- **License:** Public domain (author Gringer / Goran tek-en)
- **Attribution:** documented in `public/universe/README.md` and `WORLD_MAP_SOURCE` in code
- No stock images, no unknown licenses

## Globe Texture Implementation

- Ocean: HomeCheff blue radial gradient (underlay)
- Land: Natural Earth SVG with CSS tint (`sepia/saturate/hue-rotate` + `multiply` blend) → HomeCheff green
- Circular mask, atmosphere rim, terminator shadow, meridian grid preserved
- Rotation: JS-driven `rotationDeg` synced with city projection (24s/revolution)

## City Node Alignment

City hubs use real lat/lon in `ECOSYSTEM_HUBS`. Nodes and routes use `projectLatLonToGlobePoint({ rotationDeg })` — same rotation as map `translateX`. Not manually positioned.

## Rotation

24 seconds per full rotation (`UNIVERSE_GLOBE_ROTATION_DURATION_MS`). Reduced motion: static Europe-facing view.

## Visual Debug Mode

- `?universeDebug=ocean|continents|nodes|full` — layer visibility
- `?globeProjectionDebug=1` — lat/lon grid, z-depth, rotation angle

## Tests / Build Status

See commit validation output.
