# HomeCheff Universe Rotating Orbit Fix Report

## Saturn Product Name Ring

Product names render on SVG `textPath` along the front Saturn arc (`EDITOR • EDITOR • EDITOR`, etc.). Visible in default state without hover. 3D CSS ring band retained; text no longer relies on fragile CSS label track alone.

## Rotating Capability Orbit

On hover/focus, capabilities orbit the active planet in a 25s revolution (`universe-capability-orbit-spin`). Labels counter-rotate (`universe-capability-orbit-label-upright`) to stay readable.

## Orbit Label Readability

Glass pills, HomeCheff accent border/glow, `clamp(13px,1.65vw,16px)` font, max 4 capabilities to avoid overlap.

## Orbit Layering

Capability orbit at `UNIVERSE_Z_CAPABILITY` (90), scales with active planet hover (130%). `overflow-visible` on cluster — not clipped.

## Static Label Removal

Fixed radial slot layout removed from `universe-planet-satellites.tsx`.

## Mobile Fallback

Mobile stack uses inline capability chips on expand — no rotating orbit.

## Visual Test Mode

`?universePlanetDebug=editor` (or studio/motion/publish/library) forces that planet active for ring + orbit inspection.

## Tests / Build Status

See `src/lib/universe-v6-orbit.test.ts` and commit validation.
