# Editor Vision V3 Report

## ONNX Detection Integration

- Added `detectObjectsForEditor()` in `object-detector.ts` — runs ONNX without the animation safe-zone feature flag.
- Server route `POST /api/editor/detect` downloads the canvas image and returns real detector boxes.
- `runEditorVisionAndObjectDetection()` calls detection before seeding layers.
- ONNX layers use `source: onnx_detector` with `estimatedBounds: false`.

## Hybrid Detection Pipeline

- `buildEditorSemanticLayersFromHybrid()` merges ONNX boxes with OpenAI vision labels.
- Priority: ONNX bounds → vision human names → heuristic fallback.
- `humanizeDetectorLabel()` maps COCO classes to user-facing names (e.g. person+mascot → Mascot, sports ball+globe → Globe).
- IoU-based merge prevents duplicate layers; vision-only features without ONNX overlap still appear.

## SAM2 Production Wiring

- `editor-sam2-production.ts`: health probe, retry, queue serialization, image resize (max 2048px), latency tracking.
- `sam2-click-segment.ts` uses production helpers; records segmentation metrics.
- Status API exposes `sam2Health`: ONLINE | OFFLINE | DEGRADED.
- Admin dashboard card shows SAM2 health and latency.

## Contour Quality Upgrade

- `cleanupMaskAlpha()` removes noise and closes small holes.
- Douglas–Peucker simplification + moving-average smoothing in `refineContourPolygon()`.
- `extractMaskContourFromPng()` runs cleanup before boundary extraction.

## Mask First Architecture

- `editor-mask-first.ts` resolves geometry priority: mask → polygon → bbox.
- Picking (`editor-object-picking.ts`) already prioritizes mask hits.
- Transforms and hover use mask truth when `selectionShape.maskUrl` exists.

## Real Object Remove

- `POST /api/editor/edit/remove` — OpenAI masked inpaint via `executeEditorMaskedRemove()`.
- Inverted mask targets only the selected object region.
- Workspace triggers masked remove when layer has SAM2/rembg mask on delete.
- Async job state returned in `EditorMaskEditJob`.

## Real Object Replace

- `POST /api/editor/edit/replace` — masked OpenAI edit with user prompt.
- `buildOpenAiImageEditFormData()` now supports `maskBuffer`.
- Workspace triggers on replace when mask exists.

## Cutout Layer System

- `buildEditorCutoutAsset()` / `upsertEditorCutoutAsset()` store transparent PNG metadata on document.
- SAM2 cutout flow saves to `document.cutoutAssets[]` for library reuse.

## Motion Handoff V2

- `prepareEditorMotionForObject()` uses mask polygon for `animationRegion`, includes `maskUrl` and `polygon`.
- Motion readiness requires mask or polygon — not bbox-only.

## Editor Vision Metrics

- `editor-vision-metrics.ts` tracks detections, masks, segmentation rate/time, OpenAI edit success.
- Admin API: `GET /api/admin/editor/vision-metrics`.

## Tests / Build Status

- `src/lib/editor-vision-v3.test.ts` — 16 tests covering all V3 areas.
- Run: `npx prisma validate` → `npx prisma generate` → `npm run lint` → `npm run build` → `npm run test`.
