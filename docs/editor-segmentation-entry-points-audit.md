# Editor Segmentation Entry Points Audit

Audit date: 2026-06-10  
Post-integration: Replicate production provider layer (`editor-segmentation-provider.ts`).

---

## Provider priority (production)

```
Replicate SAM3 → SAM2 → REMBG → heuristic (refine/remove only; click returns error if all fail)
```

---

## Entry point matrix

| Capability | Client handler | API route | Server function | Provider order |
|------------|----------------|-----------|-----------------|----------------|
| **Object click (layer select)** | `selectLayer` → `tryAutoAcquireMask` | `POST /api/editor/segment/click` | `segmentByClick` | Replicate → SAM2 → REMBG |
| **Object click (empty canvas)** | `handleClickSegmentObject` | same | same | same |
| **Prompt click (globe/logo/text chips)** | `handleClickSegmentPrompt` | `POST /api/editor/segment/prompt` | `segmentByPrompt` | Replicate → REMBG |
| **Refine selection** | `handleStartPreciseSelect` → `runSam2ClickSegment` | `POST /api/editor/segment/click` | `segmentByClick` | Replicate → SAM2 → REMBG |
| **One-click cutout** | `handleOneClickCutout` | `POST /api/editor/segment/click` | `segmentByClick` | same |
| **Background removal** | `handleRemoveBackground` | `POST /api/editor/segment` (`remove_background`) | `removeBackground` | Replicate → REMBG |
| **Auto-mask on select** | `tryAutoAcquireMask` | click or `/segment` refine | provider layer | Replicate/SAM2 click first |
| **Logo selection** | `selectLayer` on logo layer | click with `category: logo` | prompt `"logo"` | Replicate |
| **Globe selection** | `selectLayer` on globe layer | click with `category: globe` | prompt `"globe"` | Replicate |
| **Text selection** | `selectLayer` on text layer | click with category/label | prompt `"text"` | Replicate |
| **Manual lasso** | `handleLassoComplete` | — (client only) | — | `manual` |
| **Status probe** | `useEffect` on mount | `GET /api/editor/segment/status` | `getEditorSegmentationProviderStatus` | — |

---

## Approximate → precise transition

When `segmentByClick` / `segmentByPrompt` returns a mask:

- `applyEditorSegmentApiShape` sets `metadata.approximateSelection: false`, `estimatedBounds: false`
- `selectionShape.selectionMode` = `"mask"` when `maskUrl` present
- `EditorSelectionOutline` shows solid emerald contour (not dashed amber bbox)
- `evaluateEditorMaskGate` allows pixel replace/delete

---

## Admin verification

- **Panel:** `EditorSelectionVerificationPanel` (admin-only in Editor workspace)
- **Fields:** layer, mode, provider, mask source, polygon count, confidence, mask persisted, prediction ID

---

## Globe Man validation checklist

With `REPLICATE_API_TOKEN` set on Vercel/local:

1. Upload Globe Man image → detection bootstrap creates layers
2. Click **Globe** layer → auto-mask → Replicate prompt `"globe"` → green contour
3. Click **Logo** layer → prompt `"logo"` → precise mask
4. Click **Character** → prompt `"person"` → precise mask
5. **Remove background** → Replicate subject matting → cutout URL
6. **Cutout export** → `createCutout: true` on click path → `cutoutUrl` on layer
7. **Replace** → mask gate passes → `POST /api/editor/edit/replace`

---

## Key files

| File | Role |
|------|------|
| `src/server/editor/editor-segmentation-provider.ts` | Unified provider |
| `src/lib/editor-segmentation-prompt.ts` | Layer → Replicate prompt |
| `src/lib/editor-apply-segment-result.ts` | Client shape application |
| `src/lib/editor-auto-mask.ts` | Strategy: replicate first |
| `src/components/editor/editor-canvas-workspace.tsx` | Orchestration |
