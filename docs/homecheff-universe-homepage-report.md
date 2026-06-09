# HomeCheff Universe Homepage Report

## Universe Architecture

- **`UniverseHomePage`** — full-screen creative universe at `/maak` when suite navigation is enabled
- **`universe-home-config.ts`** — planet definitions, pipeline graph, quick actions, orbit math
- Subcomponents: background, globe, orbit system, pipeline SVG, planets, tunnel overlay, quick actions, mobile stack
- Replaces card-grid `SuiteHomePage` via `MaakOrSuiteStartPage`

## HomeCheff Globe

- Glass-like layered sphere with HomeCheff green/blue gradients
- Slow 3D-style rotation, soft glow rings, ambient pulse
- Represents the HomeCheff ecosystem at orbit center

## Orbiting Product Planets

Five planets orbit the globe: Editor, Studio, Motion, Publish, Library.

Each has unique accent color, theme label, description tooltip, and branded iconography.

Hover enlarges planet and shows preview panel with action hint.

## Capability Stars

On hover/focus, micro-stars orbit each planet representing top capabilities (photo editing, storyboards, lip sync, etc.).

Mobile cards show capability chips inline.

## Pipeline Visualization

SVG curved paths connect Editor → Studio → Motion → Publish.

Hovering a pipeline planet illuminates upstream segments with HomeCheff gradient glow.

Library sits outside the main flow.

## Tunnel Navigation

Selecting a planet triggers a 680ms tunnel zoom overlay (stars streak, planet expands) before route navigation.

Skipped when `prefers-reduced-motion` is set — instant navigation instead.

## Quick Actions

Glass command panels below the universe: Create Character, Create Story, Animate Images, Publish Video, Open Library.

## Mobile Experience

Below `md` breakpoint: stacked orbital cards with globe header, depth offsets, capability chips — not a plain list.

## Accessibility

- Keyboard focus rings on all interactive planets and quick actions
- Screen reader labels on planets and tunnel status
- `prefers-reduced-motion` disables animations
- Sufficient contrast on dark universe background

## Performance

- CSS transforms and keyframes only (no WebGL)
- ~36 lightweight particles
- GPU-friendly `will-change: transform`
- No Framer Motion dependency

## Tests / Build Status

See final validation run after implementation.

Commit message: **Add HomeCheff Universe Homepage Experience**
