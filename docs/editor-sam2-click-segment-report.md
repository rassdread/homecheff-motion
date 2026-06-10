# Editor SAM2 Click-to-Segment Report

## SAM2 Availability Audit

**Already existed:**
- `SAM2_SEGMENTATION_URL` env gate in `premium-foreground-segmentation.ts`
- `EditorSegmentationSource: "sam2"` in types
- `segmentationProviderAvailable("sam2")` / `resolveSegmentationProvider`
- Editor mask model (`maskUrl`, `polygon`, `segmentationSource`)
- `POST /api/editor/segment` (rembg/heuristic only)
- `uploadPublicBlob` + sharp mask bbox in `segment-editor-layer.ts`

**Was missing:**
- SAM2 HTTP client
- Click-segment API route
- Mask contour extraction from alpha PNG
- User-scoped mask storage paths
- Image ownership validation for editor segment
- Human-first precise select UX
- Positive/negative refinement points

**Expected SAM2 request** (`POST SAM2_SEGMENTATION_URL`):

```json
{
  "imageUrl": "https://...",
  "imageBase64": "...",
  "width": 1920,
  "height": 1080,
  "points": [{ "x": 0.52, "y": 0.41, "label": 1 }, { "x": 0.7, "y": 0.8, "label": 0 }],
  "targetBounds": { "x": 0.2, "y": 0.1, "width": 0.6, "height": 0.8 },
  "objectHint": "Globe"
}
```

**Expected SAM2 response:**

```json
{
  "maskBase64": "<png>",
  "polygon": [{ "x": 0.5, "y": 0.4 }],
  "boundingBox": { "x": 0.4, "y": 0.3, "width": 0.2, "height": 0.25 },
  "confidence": 0.92
}
```

**Local vs production:** set `SAM2_SEGMENTATION_URL` to your GPU SAM2 service. Without it, `/api/editor/segment/status` returns `unavailable` and click API returns 503 with explicit fallback list.

## SAM2 Click Segment API

`POST /api/editor/segment/click` — auth via `requireActiveUser`, validates normalized click point, ownership, calls SAM2, uploads mask/cutout to `studio/{userId}/editor-masks|cutouts/{sessionId}/{objectId}.png`, returns `EditorObjectShape` fields.

`GET /api/editor/segment/status` — SAM2/rembg availability for UI.

## Precise Select UX

Human-first **“Preciezer selecteren”** activates crosshair click mode. Success: “Object nauwkeurig geselecteerd”. Unavailable: clear NL/EN message with **Zelf omlijnen** and **Globale selectie gebruiken**.

## Selection Refinement Points

After first SAM2 mask: **+ toevoegen**, **− verwijderen**, **Reset selectie**, **Accepteren**. Points accumulate and are sent on each refine call.

## Mask Contour Extraction

`editor-mask-contour.ts`: `maskToBoundingBox`, `maskToPolygon`, `extractMaskContourFromPng` via sharp alpha scan.

## Mask Aware Action Wiring

`editor-mask-actions.ts`: `resolveEditorMaskActionExecutionState`, `editorMaskActionRequiresAiBackend` — replace/delete with SAM2 mask show “Deze actie maakt een AI-variant.”

## Mask Storage

`editor-mask-storage.ts` — user-scoped paths; ownership in `editor-image-ownership.ts`. Cleanup: session-scoped blobs; document in code comment (align with retention policy).

## Local Fallback State

Workspace shows dev status when `SAM2_SEGMENTATION_URL` missing. No silent fake octagon on SAM2 failure — 503 + user message.

## Tests / Build Status

`src/lib/editor-sam2-segmentation.test.ts` — availability, route contract, points, contour, mask actions, ownership, human-first terminology.
