# Editor Start UX & Asset Fix Report

## Asset 404 Fix

- Added `public/brand/homecheff-logo.svg` and `public/brand/garden-chef-mascot.svg`.
- Updated `editor-v6-brand-kit.ts` to reference the SVG mascot path and filter items via `brandKitItemHasRenderablePreview()` / `resolveVisibleBrandKitItems()`.
- `EditorBrandKitPanel` only renders items with valid public previews — no broken image icons.

## Start Screen Simplification

- `EditorStartScreen` now shows only **Afbeelding uploaden** and **Kies uit Bibliotheek** as primary cards.
- Secondary link: **Ga verder met recente bewerking** (collapsible recent list).
- Removed `EditorIntentPicker` from the start screen (GIF, print, motion, combine no longer appear before image selection).

## Post Upload Mode Choice

- After upload or library pick, `EditorPostUploadModePicker` asks **Wat wil je doen met deze afbeelding?**
- Modes: Bewerken, Combineren, Motion voorbereiden, Exporteren.
- Optional AI Magic bar placeholder above mode cards (wired when `onMagicCommand` is passed).

## Workspace Gating

- `editorFlowMode` on `EditorCanvasDocument` drives `modeShows*` helpers in `editor-ux-v7-workspace.ts`.
- Edit: photo object panels, magic bar, canvas.
- Combine: dual composer, library drag, brand kit.
- Motion prepare: handoff score, motion preview.
- Export: social/print presets, alignment, export hub, GIF export.

## Button Functionality Rule

- Start screen buttons trigger upload, library fetch, recent session resume, or post-upload mode selection.
- Pre-image intents (`make_gif`, `export_print`, etc.) are hidden via `isPreImageStartIntentHidden()`.
- Brand kit items without renderable previews are omitted.

## First-Time User Flow

```
Open Editor → Upload or Library → Post-upload mode picker → Gated workspace tools
```

## Tests / Build Status

- `src/lib/editor-start-flow.test.ts` — start options, intent hiding, post-upload gating, brand assets.
- `src/lib/editor-ux-v7.test.ts` — updated for `editorFlowMode` document gating.
- Run `npm run lint`, `npm run build`, `npm run test` before commit.
