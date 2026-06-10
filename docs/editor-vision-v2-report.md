# Editor Vision V2 Report

## Multi Object Detection

- Added `EditorObject` type with `id`, `label`, `confidence`, `mask`, `polygon`, `bbox`, `category`, `zIndex`, `parentId`, `layerId`, `visible`, `locked`.
- `buildEditorObjectsFromLayers()` converts every canvas layer into a stored object — not only the selected one.
- Categories: person, face, mascot, logo, text, product, clothing, animal, food, vehicle, screen, foreground, background, prop, unknown.
- Vision bootstrap (`runEditorVisionAndObjectDetection`) populates `document.detectedObjects[]` alongside semantic layers.

## Object Picking Engine

- `pickTopEditorObjectAtPoint()` — mask → polygon → bbox priority, then highest `zIndex`.
- `maskHitTest`, `polygonHitTest`, `bboxHitTest`, `pointInPolygon` in `editor-object-picking.ts`.
- Canvas preview uses single click-anywhere picking in visual mode with hover outlines.

## Semantic Layer Tree

- `buildEditorSemanticLayerTree()` — Image → Background / nested mascot children.
- Layer panel: select, hide, lock, rename (inline), reorder (↑↓).
- Human-first labels — no technical IDs in the tree UI.

## Non Destructive Editing

- `EditorNonDestructiveState` stores `backgroundOriginalUrl`, per-layer `originalPreviewUrl`, `maskUrl`, `cutoutUrl`, `transform`, `actions[]`.
- `EditorHistoryState` with `past`, `future`, `timeline`.
- Undo / Redo in workspace toolbar via `undoEditorDocument` / `redoEditorDocument`.

## Smart Replace

- `planEditorSmartReplace()` — mask-constrained replace plan with `constrainedToMask`, `boundingBox`, prompt/upload slots.
- Workspace surfaces plan message on replace action.

## Smart Remove

- `planEditorSmartRemove()` — inpaint only masked area, `preserveSurrounding: true`.
- Non-destructive layer delete tracked in history as `remove`.

## Text Layer System

- `EditorTextLayer` with `content`, `bbox`, `mask`, `language`, `confidence`.
- `extractEditorTextLayers()` from semantic text-category layers.
- Actions: edit, translate, replace_font, animate (`editorTextLayerActions`).

## Motion Preparation Pipeline

- `EditorMotionPreparation` per object: `cutoutUrl`, `depthHint`, `motionRegion`, `safeAnimationBounds`, `ready`.
- `buildEditorMotionPreparations()` runs on document save and vision bootstrap.

## Production Segmentation Strategy

- `auditEditorSegmentationProviders()` ranks heuristic, vision_estimate, rembg, sam2, manual, onnx_detector, openai_vision.
- Recommended path: vision labels → heuristic bboxes → rembg on refine (when `REMBG_API_URL`) → manual lasso fallback.
- SAM2 typed but not editor-wired; no expensive provider enabled blindly.

## Final Human First UX

- Default flow: upload → auto detection → hover outline → click select → toolbar (Edit, Replace, Remove, Animate, Background, Duplicate).
- Visual mode hides mask terminology (`editorHumanUiHidesMaskTerminology`).
- Advanced mode exposes mask, polygon, confidence, provider in selection tools panel.

## Tests / Build Status

- `src/lib/editor-vision-v2.test.ts` — object picking, mask hit testing, semantic layers, smart replace/remove, text layers, motion prep, undo/redo, segmentation audit.
- Run: `npx prisma validate`, `npx prisma generate`, `npm run lint`, `npm run build`, `npm run test`.
