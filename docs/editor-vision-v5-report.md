# Editor V5 Report

## Editor Modes

Four workspace modes: **Edit photo**, **Combine images**, **Make GIF**, and **Export**. Users pick an intent on the start screen; the mode switcher in the workspace allows switching anytime.

## Dual Image Composer

Left panel shows the source image (upload or Library). Right panel shows the target composition. Users upload a source, extract/drop objects, and build layered compositions.

## Cutout Drag And Drop

Imported layers store `sourceAssetId`, `maskUrl`, `cutoutUrl`, `transform`, `zIndex`, `blendMode`, `shadow`, and visibility flags. Cutouts with masks use transparent PNG semantics.

## Compositing Tools

Move, resize, rotate, duplicate, remove, flip, opacity, shadow, soft edge, match lighting/color, and z-order via `editor-compositing-tools.ts`.

## Quick GIF Maker

Nine presets (Float, Pulse, Rotate, Bounce, Reveal, Orbit, Wiggle, Logo pop, Globe spin). Outputs GIF, WebP, and MP4 via `/api/editor/export/quick-motion`.

## Motion Ready Export

Bundle includes cutouts, masks, hierarchy, motion preparations, and Studio handoff. Route: `/api/editor/export/motion-ready`.

## Production Ready Export

PNG, JPG, WebP with retina scale, quality, and canvas size. Route: `/api/editor/export/production`.

## Print Ready Export

DPI (150/300/600), bleed, safe margin, A-series presets. Print PDF and high-res raster. Route: `/api/editor/export/print`. EPS limitation documented; PDF/SVG recommended.

## Poster Upscaling

`assessPosterUpscaleNeeds` compares source vs required pixels. Status: good, acceptable, needs upscale, or unavailable when no provider is configured.

## Library Integration

Categories: Edited images, Compositions, Cutouts, GIFs, Motion-ready, Print-ready. `appendLibraryExport` records metadata on the document.

## Human First UX

Intent picker on start screen. Export labels hide DPI/bleed unless advanced panel is open.

## Tests / Build Status

See `src/lib/editor-vision-v5.test.ts` — dual composer, cutout drop, transforms, GIF config, export bundles, print DPI, library metadata, human-first labels.
