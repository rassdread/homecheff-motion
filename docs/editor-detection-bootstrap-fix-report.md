# Editor Detection Bootstrap Fix Report

Sprint date: 2026-06-10

## Upload Analysis Trace

```
Upload (editor-start-screen.handleUpload)
  → uploadEditorSourceImage → POST /api/uploads/images
  → createEditorDocumentFromUpload (background layer only)
  → EditorPostUploadModePicker
  → finishOpen → runEditorVisionAndObjectDetection
       → bootstrapEditorObjectDetection (NEW)
            1. detectEditorObjectsApi → POST /api/editor/detect (ONNX)
            2. analyzeAssetStyleDnaApi → POST /api/studio/asset-derivation/analyze (OpenAI vision)
            3. hybrid merge OR onnx-only OR brand-sheet fallback
            4. seed layers → detectedObjects → assetProfile
  → saveEditorCanvasDocument → EditorCanvasWorkspace
```

**Previous gap:** Vision API failure returned early with background-only document; ONNX never ran.

**Previous gap:** Background full-frame bbox won every canvas click (`pickTopEditorObjectAtPoint`).

## Detection Bootstrap

| Step | Behavior |
|------|----------|
| After upload / library open | `bootstrapEditorObjectDetection` always runs |
| Vision fails | ONNX + fallback vision stub still run |
| No ONNX/vision objects | Brand-sheet or heuristic grid regions |
| Zero objects after all | `detectionMeta.userMessageKey` → Dutch/EN message |
| Reopen background-only session | Workspace `useEffect` re-runs bootstrap once |

Files: `src/lib/editor-detection-bootstrap.ts`, `src/lib/editor-canvas-session.ts`

## Brand Sheet Detection

`src/lib/editor-brand-sheet-detection.ts`

Detects poster/brand-sheet via filename, vision `objectType`, feature count.

Creates regions: Logo, Globe Man, Tekst, Kleurenkaart, Icoon, Banner, Product, Afbeelding, Background.

## Click To Segment Fallback

Empty canvas click (no object hit) → `EditorClickSegmentPrompt`:

- **Selecteer dit object** — click-pick layer + SAM2/rembg auto-mask
- **Selecteer met prompt** — `POST /api/editor/segment/prompt` (Replicate SAM3) when configured
- **Zelf omlijnen** — lasso mode

Background excluded from hit-testing in `editor-object-picking.ts`.

## Provider Status

`GET /api/editor/segment/status` now returns:

- `replicateConfigured` / `replicateSam3Available`
- `autoMaskProviderAvailable`
- existing `sam2PreciseSelection`, `rembgAvailable`

Admin users see provider strip in workspace.

## Object Chips

`EditorHumanObjectList`:

- Shows bootstrap region labels (Logo, Tekst, …) from `metadata.bootstrapRegion`
- Includes **Achtergrond** chip at end

## Brand Sheet Real Test

| Action | Expected |
|--------|----------|
| Upload HomeCheff brand sheet | ≥8 object chips + Achtergrond |
| Click logo region | Logo layer selected |
| Click empty area | Click-to-segment prompt |
| Prompt `globe` via Replicate | Mask + selection when token set |

Manual verification with uploaded brand sheet asset.

## Tests / Build Status

- `src/lib/editor-detection-bootstrap.test.ts`
- Run: `npm run lint`, `npm run build`, `npm run test`
