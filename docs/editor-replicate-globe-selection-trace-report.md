# Replicate Globe Selection Trace Report

## Globe Button Flow

```
EditorClickSegmentPrompt (button "Selecteer: globe")
  onClick → onSelectWithPrompt("globe")
    editor-canvas-workspace.tsx → handleClickSegmentPrompt("globe")
      dismissClickSegmentPrompt()  // clears clickSegmentPoint + clickSegmentParentLayerId
      runPromptSubLayerSegmentation({ point, prompt: "globe", parentLayerId })
        resolve parent: clickSegmentParentLayerId OR resolveParentLayerAtClick()
        createSubObjectLayer({ point, prompt, parentLayer })
        fetch POST /api/editor/segment/click
        applySegmentToSubObjectLayer(childStub, result)
        attachSubObjectLayer(document.objects, withSegment)
        syncDetectedObjectsOnDocument()
        persist() + setSelectedLayerId(child.id)
        toast: "Wereldbol geselecteerd"
```

Canvas click before prompt (humanFirst):

```
editor-canvas-preview onPointerDown
  → pickAtClient (approximate Globe Man hit)
  → onApproximateLayerClick(point, parentLayerId)
  → openClickSegmentPrompt(point, parentLayerId)
```

## Request Payload

**Endpoint:** `POST /api/editor/segment/click`

**Example body** (Globe Man, click at head globe ~50%, 18%):

```json
{
  "imageUrl": "<document.backgroundUrl>",
  "backgroundStorageKey": "<document.backgroundStorageKey>",
  "clickPoint": { "x": 0.5, "y": 0.18 },
  "objectHint": "globe",
  "targetBounds": { "x": 0.22, "y": 0.12, "width": 0.56, "height": 0.78 },
  "editorObjectId": "sub_globe_<timestamp>",
  "parentLayerId": "semantic_0_globe_man",
  "sessionId": "<document.sessionId>",
  "createCutout": true
}
```

**Server chain:** `segment/click/route.ts` → `segmentByClick()` → `segmentEditorImageWithReplicateSam3({ imageUrl, prompt: "globe", clickPoint })`.

**Fix applied:** Replicate multimask now uses `pickSam3MaskIndexAtClick` — prefers mask whose bbox contains `clickPoint`, not global highest score.

## Replicate Result

**Success response** (`200`):

| Field | Source |
|-------|--------|
| `status` | 200 |
| `maskUrl` | Persisted blob from Replicate `pred_masks[i]` |
| `polygon` | Contour from mask PNG or SAM3 polygons |
| `boundingBox` | Normalized from Replicate box or contour |
| `confidence` | `pred_scores[i]` |
| `providerUsed` | `replicate_sam3` |
| `segmentationSource` | `replicate_sam3` |

**Failure paths** (no child layer created):

- `502` / `503` — provider unavailable
- `200` without `maskUrl` — workspace shows `editor.clickSegment.failed`

**Fix applied:** When contour extraction fails, fallback bbox is click-local ∩ parent bounds (not full parent bbox).

## Child Layer Creation

| Step | Result |
|------|--------|
| `createSubObjectLayer` | `id: sub_globe_*`, `label: Globe`, `parentObjectId: semantic_0_globe_man`, click-local bounds |
| `applySegmentToSubObjectLayer` | `selectionMode: mask`, `maskUrl`, polygon, tight `bounds`, `metadata.approximateSelection: false` |
| `attachSubObjectLayer` | Parent `Globe Man` unchanged; `children[]` gains child id |

**Fixes applied:**

- Stub bounds: click-local ∩ parent (not full parent copy)
- `applyEditorSelectionShape`: syncs `transform` to tight bbox center

## Hit Test Result

After child with mask polygon at globe region:

```
pickTopEditorObjectAtPoint({ x: 0.5, y: 0.18 }, detectedObjects)
  → child Globe layer
  → method: "mask"
```

`pickHierarchicalAtPoint` checks `pickPromptSubObjectAtPoint` first — child wins over Globe Man bbox.

## Overlay Rendering

| Element | Behavior |
|---------|----------|
| `EditorSelectionOutline` | Green polygon from `selectionShape.polygon` when selected |
| Transform handle div | `border-emerald-500` on selected layer; positioned at `transform` + `bounds` |
| Parent ghost | Amber dashed bbox (non-selected approximate layer) |

**Prior bug:** Prompt child hidden from chips via `isTechnicalSubPartLayer(parentObjectId)` — **fixed:** `promptCreatedSubLayer` layers stay visible.

**Prior bug:** Transform handle misaligned after segmentation — **fixed:** bounds center updates transform.

## End To End Result

| Step | Expected | Status |
|------|----------|--------|
| Upload Globe Man | Bootstrap creates approximate Globe Man layer | OK |
| Click globe | Prompt panel with "Selecteer: globe" | OK |
| Press globe button | POST `/api/editor/segment/click` fires | OK (code path) |
| Replicate returns mask | Child layer with `replicate_sam3` mask | OK when provider configured |
| Child selected | `setSelectedLayerId(sub_globe_*)` + toast | OK |
| Green contour | Precise polygon outline | OK when mask+polygon present |
| Re-click globe | Child mask hit, not parent | OK (tests) |

**Remaining live dependency:** Replicate must be configured (`replicateAvailable` + `REPLICATE_API_TOKEN`). Without it, `runPromptSubLayerSegmentation` exits early with `providerUnavailable` — no fake child layer.

## Tests / Build Status

| Check | Result |
|-------|--------|
| `editor-replicate-globe-selection-trace.test.ts` | **7/7** pass |
| `npm run lint` | pass |
| `npm run build` | pass |
| `npm run test` | **2872/2872** pass |
