# Analyze Method Mismatch Report

## Route Methods

`src/app/api/studio/asset-derivation/analyze/route.ts` exports:

| Method | Exported |
|--------|----------|
| **POST** | Yes — main handler |
| GET | No |
| PUT | No |
| DELETE | No |
| PATCH | No |

Undeclared methods (including GET from browser address bar) receive **405 Method Not Allowed** from Next.js App Router.

## Callers

All application callers use `analyzeAssetStyleDnaApi()` in `src/lib/studio-asset-derivation-client.ts` with **`POST`** and JSON body `{ imageUrl, sourceKind, sourceName, derivationJobId }`.

| File | HTTP method | Payload | Non-200 handling |
|------|-------------|---------|------------------|
| `src/lib/editor-detection-bootstrap.ts` | POST | imageUrl, sourceKind, sourceName, derivationJobId | `resolveEditorBootstrapVision` → heuristic fallback; bootstrap continues |
| `src/lib/studio-asset-vision-trigger.ts` | POST | same | Returns `{ ok: false, patch, error }` |
| `src/lib/studio-asset-wizard-reference-generation.ts` | POST | same (2 call sites) | Returns null fidelity / skips style DNA |

`fetchSameOriginJson` never throws on 405 — returns `{ ok: false, status: 405, data }`.

## Root Cause

**No application caller uses GET** on `/api/studio/asset-derivation/analyze`.

The 405 in the local browser console is expected when:

- Opening `http://localhost:…/api/studio/asset-derivation/analyze` directly (browser sends GET)
- DevTools “Open in new tab” on the route URL
- External probes or bookmarks

Normal Editor upload/select flows send **POST** via `analyzeAssetStyleDnaApi`.

## Fix

**No method-mismatch code change required** — callers already use POST.

Hardening added:

- `ANALYZE_ASSET_DERIVATION_HTTP_METHOD = "POST"` constant in client
- `resolveEditorBootstrapVision()` documents and tests 405 → fallback path
- Tests in `src/lib/editor-analyze-method-mismatch.test.ts`

## Editor Fallback Verification

`bootstrapEditorObjectDetection`:

1. Calls ONNX `/api/editor/detect` (independent)
2. Calls analyze POST (optional)
3. On **any** analyze failure (405, 4xx, network): `createFallbackVision` + brand-sheet/heuristic layers
4. Editor opens with layers; user can run **Replicate** `/api/editor/segment/click` without analyze success

`editor-canvas-workspace.tsx` `runPromptSubLayerSegmentation` does **not** call analyze.

## Tests

`src/lib/editor-analyze-method-mismatch.test.ts` — **7 tests**:

- Route POST-only
- Client POST + JSON body
- Callers use `analyzeAssetStyleDnaApi` only
- 405 → fallback vision
- Bootstrap still produces layers on 405
- Replicate segmentation independent of analyze
- `analyzeAssetStyleDnaApi` returns `{ ok: false, status: 405 }` safely
