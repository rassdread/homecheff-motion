# HomeCheff Universe Globe Geo-Projection Report

## City Coordinate Model

All 13 ecosystem hubs use precise WGS84 lat/lon in `ECOSYSTEM_HUBS`:

- Tier 1: Rotterdam (51.9244, 4.4777), Paramaribo (5.852, -55.2038)
- Tier 2: Amsterdam, London, New York, São Paulo, Lagos, Mumbai, Singapore, Sydney
- Tier 3: Philipsburg, Willemstad, Oranjestad (Caribbean)

No manual x/y positioning — coordinates drive all rendering.

## Shared Globe Projection

New module: `src/lib/universe-globe-projection.ts`

`projectLatLonToGlobePoint({ lat, lon, rotationDeg, radius })` returns:

- `x`, `y` — viewBox position (center 50,50)
- `z` — depth (front hemisphere positive)
- `visible` — z > threshold (0.05)
- `scale`, `opacity` — edge fade for back-side transition

Orthographic projection with `rotationDeg` as central meridian. Used by nodes, labels, and routes via `projectHubToGlobe()`.

## Continent Node Alignment

**Option A chosen:** JS-driven rotation syncs continent map and nodes.

- `useUniverseGlobeRotation` — single `rotationDeg` via requestAnimationFrame
- Map layer: `translateX(resolveGlobeMapTranslatePercent(rotationDeg))`
- Nodes/routes: same `rotationDeg` in projection
- CSS map scroll animation removed from active path (deprecated in CSS)

Continents and cities rotate together on one coordinate system.

## Projected Route System

Routes connect projected endpoints via `buildGlobeRoutePath()` (quadratic arc toward globe center).

- Hidden when either endpoint is back-facing (`shouldDrawGlobeRoute`)
- Opacity scales with endpoint visibility
- Subtle blue/green pulse animation preserved

## Globe Rotation Speed

- Default: **24 seconds** per full rotation (`UNIVERSE_GLOBE_ROTATION_DURATION_MS`)
- Globe hover/focus: **30 seconds** (slightly slower for readability)
- `prefers-reduced-motion`: static at 10° (Europe-facing default)

## City Label Behavior

- Default: nodes only; tier-1 labels faintly visible (35% opacity max)
- Globe hover/focus: labels for visible front-facing nodes
- Backside: opacity 0, nodes hidden
- Tier 1 (Rotterdam, Paramaribo) slightly more prominent when focused

## Globe Projection Debug

Enable with `?globeProjectionDebug=1` or `=projection` on homepage.

Shows:

- Lat/lon grid on visible hemisphere
- Current `rotationDeg`
- Per-city z-depth labels
- Green/red markers for visible/backside state

## Visual Quality Check

At Americas rotation (~-74°): New York front-center, São Paulo south of Paramaribo, Caribbean cluster near Paramaribo.

At Europe rotation (~4°): Rotterdam, Amsterdam, London on western Europe.

At Asia-Pacific rotation (~104°): Singapore front, Sydney southeast.

Cities no longer float in ocean disconnected from continents.

## Tests / Build Status

New suite: `src/lib/universe-globe-projection.test.ts` (15 tests)

Coverage: coordinates, projection math, regional clustering, backside hiding, route paths, map sync, rotation timing, debug flag, component wiring.
