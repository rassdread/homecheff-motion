# Editor Selection Reality Report

Audit date: 2026-06-10  
Method: code-path trace + local runtime env check. **Reports and sprint docs ignored.**

## Selection Chain Trace

| Step | Expected | Actual (code) |
|------|----------|---------------|
| Canvas click | Hit object under cursor | `EditorCanvasPreview` `onPointerDown` → `pickAtClient`; compositor overlays may intercept first |
| Normalize coords | 0–1 image space | `clientPointToNormalized` |
| Pick object | Smallest meaningful target | `pickHierarchicalAtPoint` → `pickTopEditorObjectAtPoint` |
| Hit test | Mask → tight shape → bbox | `maskHitTest` → `polygonHitTest` → `bboxHitTest`; mask uses polygon proxy, **not raster alpha** |
| Select layer | Layer + auto mask | **`handleHierarchicalPick`** sets `selectedLayerId` + action menu — **does not call `selectLayer`** |
| Auto mask | SAM2/rembg on select | **`tryAutoAcquireMask` only in `selectLayer`** — canvas clicks skip it |
| Visual feedback | Object highlights | Approximate: amber dashed **large bbox** only; `EditorSelectionOutline` returns **null** |
| Edit | Replace/remove | `evaluateEditorMaskGate` requires `selectionShape.maskUrl` — **blocked on fresh upload** |

**Primary click path today:** Canvas → hierarchical pick → template bbox selected → menu opens → **no mask** → replace/remove blocked.

## Actual Selection Mode Audit

Weighted frequencies for typical mascot upload (no manual refine):

| Mode | % | What user actually gets |
|------|---|-------------------------|
| bbox_template | 55% | `BOUNDS_BY_TYPE.character` (~56%×78% rectangle) |
| polygon_rectangle | 30% | Hit test reports `polygon` but contour = `boundsToPolygon(bounds)` — same rectangle |
| hierarchy_part | 10% | Second click → part mode with `PART_BOUNDS` templates (globe, tie, logo) |
| polygon_manual | 3% | Lasso polygon — still **no pixel edit** without `maskUrl` |
| mask_sam2 | 1% | Precise Select or object-list `selectLayer` + SAM2 env |
| mask_rembg | 1% | Explicit segment + REMBG env |

**What is stored on the layer:** `semantic` record with `selectionMode: "box"`, `metadata.estimatedBounds: true` — not mask, not true polygon, not ONNX-accurate region.

## SAM2 Reality Check

| Check | Status |
|-------|--------|
| `SAM2_SEGMENTATION_URL` configured | **Env-dependent** — not set in local `.env.local` at audit time |
| Reachable / healthy | Only when URL set; `/api/editor/segment/status` probes on mount |
| Called from editor | **Partially** — wired to Precise Select, cutout, `tryAutoAcquireMask` |
| Called on canvas click | **No** — `handleHierarchicalPick` bypasses auto-mask |
| Returning masks | Yes when API succeeds |
| Masks persisted | Yes — `layer.selectionShape.maskUrl`, blob storage |
| Masks on reopen | Yes — in `EditorCanvasDocument` JSON / localStorage |
| Masks in hit testing | **Partial** — polygon proxy only, not alpha raster |

**Verdict:** **Partially Working** when env set; **Not Used** on default canvas-click path.

## Auto Mask Reality Audit

| Claim | Reality |
|-------|---------|
| Object select → auto mask | **False for canvas click** — only `selectLayer` (object list, layer tree) triggers `tryAutoAcquireMask` |
| Calls SAM2 | Yes when `sam2Available` — click at **bbox center**, not user click |
| Calls rembg | Fallback after SAM2 failure |
| Stores mask | Yes on success |
| Updates selection visually | Only after success — contour appears, approximate badge removed |

| Metric | Rate (typical dev) |
|--------|-------------------|
| Success | ~0% on canvas click (auto-mask never runs) |
| Failure | ~0% (silent — `strategy === "none"` returns without toast) |
| Fallback | 100% — user stays on approximate bbox |

## Object Detection Reality

Globe Man mascot upload:

| Part | Detected | Selectable | Editable |
|------|----------|------------|----------|
| Character (whole) | Partial | Partial | Partial (needs mask) |
| Globe | Partial | Partial (part mode) | No |
| Logo | Partial | Partial | No |
| Face | Partial | **No** (hidden sub-part) | No |
| Arm | Partial | Partial (part mode) | No |
| Tie | Partial | Partial (part mode) | No |
| Body | Partial | Partial (character bbox) | Partial (needs mask) |
| Background | Yes | Yes | Partial (remove needs rembg) |

Detection source: OpenAI vision `keyFeatures` + optional ONNX + **`BOUNDS_BY_TYPE` templates** — not image-accurate segmentation.

## Visual Feedback Audit

| Element | Expected | Actual |
|---------|----------|--------|
| Selected object | Tight contour around clicked part | Large blue/amber **rectangle** at template bounds |
| Mask contour | True silhouette | Hidden until precise; then octagon or SAM2 polygon — **never mask raster overlay** |
| Unselected layers | Subtle hints | Amber dashed ghost boxes (`humanFirst`) |
| Active object clarity | User sees what will be edited | **(approximate)** badge; menu shows actions anyway |
| Part mode | Globe/logo/tie overlays | Violet polygons — only after **second click**, no first-time guidance |

## Edit Chain Audit

| Flow | Selection → edit | OpenAI | Visible change | Canvas refresh | Export |
|------|------------------|--------|----------------|----------------|--------|
| Globe → Replace | Partial | **No** (mask gate) | No | No | No |
| Logo → Replace | Partial | **No** | No | No | No |
| Background → Remove | Yes | Partial (rembg) | Partial | Yes (`backgroundUrl`) | Partial |
| Character → Cutout | Partial | No | Partial (compositor overlay) | Partial | Partial |

Replace/remove: `runMaskedEdit` hard-requires `maskUrl`. Fresh mascot has none.

## User Experience Failure Analysis

| Rank | Reason | Impact |
|------|--------|--------|
| 1 | Canvas click skips auto-mask | **Critical** |
| 2 | Template bbox covers whole character, not globe/logo | **Critical** |
| 3 | Action menu implies edit readiness without mask | **Critical** |
| 4 | No contour on approximate selection | High |
| 5 | SAM2/rembg unset → silent no-op | High |
| 6 | Part mode requires undiscoverable second click | High |
| 7 | Mask never shown as raster overlay | Medium |
| 8 | Lasso polygon still blocked for pixel edit | Medium |

## Root Cause Analysis

**Primary:** `handleHierarchicalPick` (canvas click) never calls `selectLayer` / `tryAutoAcquireMask`. Reports claim auto-mask on select, but the main interaction path does not execute it.

**Secondary:**
- Detection = template rectangles, not segmentation geometry
- Pixel edits gated on `maskUrl` while mask generation is env-dependent and bypassed
- Visual feedback suppressed for approximate layers
- Part picking hidden behind two-click hierarchy with no onboarding

## Selection Fix Roadmap

| Rank | Fix | Impact |
|------|-----|--------|
| 1 | Invoke `selectLayer` or `tryAutoAcquireMask` from `handleHierarchicalPick` | **Critical** |
| 2 | Toast when auto-mask unavailable (env missing) or in progress | **Critical** |
| 3 | SAM2 click at **user coordinates**, not bbox center | High |
| 4 | Show dashed approximate contour before mask | High |
| 5 | Hide or gate replace/remove until `maskUrl` exists | High |
| 6 | First-click mascot hint for part mode | Medium |
| 7 | Deploy SAM2/rembg + editor health indicator | Medium |

**Out of scope for this roadmap:** asset intelligence, Studio automation, new assistants, export modes.

## Reality Score

| Area | /10 |
|------|-----|
| Detection | 4 |
| Selection | 3 |
| Mask Generation | 2 |
| Mask Usage | 3 |
| Visual Feedback | 4 |
| Editing | 3 |
| Canvas Refresh | 6 |
| User Trust | 2 |
| **Overall** | **3** |

## What the Editor Actually Does Today

1. User uploads mascot image → vision seeds **one large character layer** with template bbox.
2. User clicks Globe Man on canvas → **rectangle selects whole character**; action menu opens.
3. **Auto-mask does not run** on this click path.
4. User taps Replace → **mask gate dialog** or blocked — no visible pixel change.
5. Without `SAM2_SEGMENTATION_URL` / `REMBG_API_URL`, segmentation APIs return 503 or heuristic fallback.
6. User concludes selection is broken — **accurately**, for the click-to-edit expectation.

## Validation

- `npm run lint`
- `npm run build`
- `npm run test` (includes `editor-selection-reality-audit.test.ts`)

## Evidence Files

- `src/lib/editor-selection-reality-audit.ts`
- `src/components/editor/editor-canvas-workspace.tsx` (`selectLayer` vs `handleHierarchicalPick`)
- `src/components/editor/editor-canvas-preview.tsx` (click routing)
- `src/lib/editor-object-picking.ts` (hit test)
- `src/lib/editor-mask-gate.ts` (edit gate)
- `src/lib/editor-auto-mask.ts` (auto-mask policy)
