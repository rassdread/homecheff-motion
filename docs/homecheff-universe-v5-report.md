# HomeCheff Universe V5 Report

## Portal Removal

Hover portal cards are fully removed from desktop and mobile universe interactions.

- `UniversePlanetPreview` is no longer imported or rendered in `universe-planet.tsx`, `universe-mobile-stack.tsx`, or `universe-home-page.tsx`.
- Portal positioning, hover bridges, z-index stacking, metric placeholders, and CTA glass cards are gone from the interaction layer.
- Product metadata (`resolveUniversePlanetPreviewContent`) remains for aria labels, mobile chips, and tests only.

## Planet Button Interaction

Each planet is the primary clickable entry point.

- `<button type="button">` with `cursor-pointer`, `aria-label`, and keyboard focus ring.
- Enter/Space activate via native button semantics.
- Signed-in routes: Editor → `/editor`, Studio → `/studio`, Motion → `/animate/instant`, Publish → `/publish`, Library → `/library`.
- Signed-out routes: `/login?next=…` via `resolveUniversePlanetHref`.
- Click triggers tunnel transition then navigation.

## Hover Expansion Only

On hover/focus (no card):

- Planet scales to **130%** (`UNIVERSE_PLANET_HOVER_SCALE = 1.3`).
- Planet moves forward (`translateZ(12px)`) with premium easing (`cubic-bezier(0.34, 1.25, 0.64, 1)`, 350ms).
- Saturn ring brightens via `active` prop on identity ring.
- Capability labels appear in fixed radial slots.
- Pipeline route highlights via `resolveUniversePipelineHighlight`.
- Hovered planet z-index rises above siblings in orbit system.

## Saturn Ring Refinement

Product names appear only on the Saturn-style ring — no separate fixed planet title.

- Ring angled with 3D CSS (`rotateX(-68deg)`), front/back clip paths.
- Rear ring dimmed behind planet; front ring readable.
- Repeating label pattern: `EDITOR • EDITOR • EDITOR`, etc.

## Capability Label Layout

Capability pills use **fixed radial slots** (`resolveCapabilityRadialSlot`) instead of orbiting animation.

- 8 slots distributed around the planet (top, top-right, right, bottom-right, bottom, bottom-left, left, top-left).
- 4–5 capabilities per planet from `planet.capabilityKeys`.
- Labels render at `UNIVERSE_Z_CAPABILITY` (90) — above planet and globe.
- Mobile: capability chips in expanded inline card below planet.

## Route Highlight Interaction

Pipeline highlight unchanged and portal-independent.

- Editor: Editor node only.
- Studio: Editor → Studio.
- Motion: Editor → Studio → Motion.
- Publish: full chain through Publish.
- Library: library hub connection only.

## Globe Layer Fix

Layer order (bottom → top):

1. Background
2. Globe wrapper (`UNIVERSE_Z_GLOBE_WRAPPER = 5`)
3. Globe nodes/routes (inside globe)
4. Orbit planets (`UNIVERSE_Z_ORBIT_PLANETS = 50`)
5. Planet rings (`UNIVERSE_Z_RING = 70`)
6. Planets (`UNIVERSE_Z_PLANET = 80`, active 85)
7. Capability labels (`UNIVERSE_Z_CAPABILITY = 90`)

No portal layer. Planets and labels always above globe.

## Real Earth Continent Pass

Continent silhouettes rebuilt in `universe-globe-earth.ts`:

- North America, Greenland, South America, Europe, British Isles, Africa, Asia, India, SE Asia, Japan, Australia, New Zealand, Antarctica, Arctic.
- Equirectangular 360×180 projection with duplicated wrap for seamless rotation.
- Asset path reserved: `/universe/world-equirectangular.svg` for future SVG mask upgrade.

## Ecosystem Hub Visibility

13 ecosystem hubs with tier-based visibility:

- Tier 1: Rotterdam, Paramaribo.
- Tier 2: Amsterdam, London, New York, São Paulo, Lagos, Mumbai, Singapore, Sydney.
- Tier 3: Philipsburg, Willemstad, Oranjestad.

Default: small glowing dots. Globe hover/focus: labels appear. Routes: subtle animated pulses.

## Mobile Clean Planet Interaction

- Tap planet card → inline expand.
- Capability chips + gradient CTA button appear below.
- Tap CTA → tunnel transition → navigate.
- No portal overlay blocking the universe view.

## Tests / Build Status

New test suite: `src/lib/universe-v5.test.ts`

Coverage:

- Portal cards not rendered
- Planet clickable with auth-aware routing
- Ring-only labels (no duplicate titles)
- Capability radial slots (no orbit animation)
- Layer order without portal
- Pipeline highlight module
- Globe continent layer
- Ecosystem nodes
- Mobile inline CTA

Updated: `universe-planet-ux.test.ts`, `universe-v4.test.ts`, `universe-globe-render.test.ts`
