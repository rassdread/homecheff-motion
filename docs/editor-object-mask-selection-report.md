# Editor Object Mask Selection Report

## Current Detection Audit

- Editor uses **OpenAI Vision text features** → taxonomy → **heuristic `BOUNDS_BY_TYPE` templates** (`editor-semantic-layers-from-vision.ts`).
- Layers store **`bounds` only** (normalized rectangles); no masks or polygons persisted before this change.
- Vision JSON (`AssetVisionAnalysis`) is used once to seed layers, then discarded — **no geometry** from vision.
- **rembg** exists for Instant Premium (`segment-foreground.ts`) with `maskUrl` but bbox-from-alpha was stubbed.
- **SAM2** env gate exists; no editor call site.
- **ONNX/MediaPipe** bboxes exist in animation export only.
- Human-first mode hid boxes until hover; selection was rect hit-testing on div overlays.

## Object Mask Model

Extended `EditorCanvasLayer` with optional `selectionShape: EditorObjectShape`:

- `selectionMode`: `mask` | `polygon` | `box` | `manual`
- `boundingBox`, `polygon`, `maskUrl`, `maskData`, `alphaMask`, `segmentationSource`, `confidence`, `editableShape`, `cutoutUrl`
- Metadata: `approximateSelection`, `selectionMode`

Utilities: `src/lib/editor-object-mask.ts`

## Mask Selection UI

- `EditorSelectionOutline` — SVG contour for polygon/mask layers on full canvas
- Approximate selections — dashed amber bbox + “globaal / approx.” badge
- Hover highlights via contour or box
- Transform handles unchanged (move/scale on layer transform)

## Refine Selection Tool

- **Preciezer selecteren** — `POST /api/editor/segment` mode `refine` (rembg when `REMBG_API_URL` set, else heuristic polygon)
- **Zelf omlijnen** — `EditorRefineLassoOverlay` lasso → manual polygon
- `EditorSelectionToolsPanel` + suggestion chips

## Background Object Separation

- **Achtergrond verwijderen** / **Object losmaken** — segment API mode `remove_background`
- rembg: alpha mask + transparent PNG cutout upload
- Without mask: approximate warning + refine prompts

## Mask Aware Actions

`src/lib/editor-mask-actions.ts` — delete/replace/move/scale/rotate respect shape when `selectionShape` present; UI feedback via `editor.mask.actionUsesShape`.

## Provider Strategy

| Provider | Editor use |
|----------|------------|
| OpenAI Vision | Semantic labels only (unchanged) |
| rembg (`REMBG_API_URL`) | Mask + cutout when configured |
| Heuristic | Tighter octagon polygon inside bbox fallback |
| SAM2 | Not wired (no new cost) |
| Manual lasso | Always available |

Server: `src/server/editor/segment-editor-layer.ts` with real `bboxFromAlphaMask` via sharp.

## Human First Mask UX

NL/EN keys under `editor.mask.*` — no “mask/segmentation” in visual tools panel; advanced properties show technical fields.

## Tests / Build Status

See Riedel run after commit (`editor-object-mask.test.ts`).
