# HomeCheff Universe Brand Globe & Orbit Label Fix Report

## HomeCheff Globe Color Pass

- Ocean base: `#0067B1` radial gradient (no pale cyan wash)
- Land: Natural Earth SVG tinted to `#006D52` via stronger multiply + sepia/saturate/hue filter
- Atmosphere rim: blue-green border `rgba(0,109,82,0.35)`
- Grid: subtle HomeCheff blue/green strokes
- Haze/cloud layer reduced from 22% screen blend to 7% soft-light

## Upright Orbiting Labels

Replaced spinner + rotate + counter-rotate with **Option B**:

- `useCapabilityOrbitAngle` drives shared travel angle via rAF
- Each label positioned with `translate(calc(-50% + x), calc(-50% + y))` only
- **No rotation** on label elements — text always horizontal

## Orbit Depth Behavior

`resolveCapabilityLabelDepthStyle(depth)`:

- Back/top (depth < 0.38): opacity 22–35%, scale 0.86–0.92, optional blur
- Front/bottom: full opacity, scale 1, higher z-index

## Capability Orbit Path

Elliptical path: xRadius 168px, yRadius 98px. Labels travel bottom → right → top → left smoothly.

## Ring vs Capability Separation

Saturn product name ring (`UniversePlanetIdentityRing`) unchanged. Capability orbit (`UniversePlanetSatellites`) only on hover/focus, outside planet.

## Tests / Build Status

- `src/lib/universe-v7-brand-orbit.test.ts` (7 tests)
- **2523/2523** pass, build OK

Debug: `?universePlanetDebug=editor` + `?universeOrbitDebug=1`
