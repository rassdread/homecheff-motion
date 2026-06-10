# Production Segmentation 503 Root Cause Report

**Date:** 2026-06-10  
**Scope:** Audit-only — why `/api/editor/segment/click` and `/api/editor/segment` return 503 in production when `REPLICATE_API_TOKEN` is set but `SAM2_SEGMENTATION_URL` and `REMBG_API_URL` are not.

---

## 503 Return Map

### `POST /api/editor/segment/click` (`src/app/api/editor/segment/click/route.ts`)

| # | Condition | Required env | Required providers | HTTP | Response payload |
|---|-----------|--------------|-------------------|------|------------------|
| 1 | `segmentByClick()` returns `ok: false` with `code === "SEGMENT_UNAVAILABLE"` | None for the HTTP mapping itself; failure means all providers in chain failed | Replicate attempt (if configured + `imageUrl`), then SAM2 (if `SAM2_SEGMENTATION_URL`), then REMBG (if `REMBG_API_URL`) all failed or were skipped | **503** | `{ error: "Could not generate a precise mask. Try manual outline or check provider configuration.", code: "SEGMENT_UNAVAILABLE", fallbacks: ["manual_lasso","rembg_foreground","approximate_box"] }` |
| 2 | Any other `segmentByClick` failure code | N/A today — `segmentByClick` only emits `SEGMENT_UNAVAILABLE` on failure | Same | **502** | `{ error, code, fallbacks }` — unreachable with current provider code |

**Auth/validation paths (not 503):** 400 invalid JSON; 400 missing `clickPoint`; 401/403 from `requireActiveUser`.

**Internal codes never returned as HTTP status:** `SAM2_UNAVAILABLE`, `REMBG_UNAVAILABLE`, `providerUnavailable` — these are provider-internal or UI i18n keys, not API response codes from this route.

---

### `POST /api/editor/segment` (`src/app/api/editor/segment/route.ts`)

| # | Condition | Required env | Required providers | HTTP | Response payload |
|---|-----------|--------------|-------------------|------|------------------|
| 1 | `mode !== "remove_background"` and `segmentByPrompt()` returns `ok: false` | `REPLICATE_API_TOKEN` for Replicate path; `REMBG_API_URL` for REMBG fallback | Replicate SAM3, then REMBG (no SAM2 in `segmentByPrompt`) | **503** | `{ error: "<provider error or 'No segmentation provider available.'>" }` |
| 2 | `mode === "remove_background"` | Replicate + `BLOB_READ_WRITE_TOKEN` for cutout persist; REMBG optional | Replicate SAM3, then REMBG/heuristic via `segmentEditorLayer` | **200** (even when cutout missing) | `{ maskUrl?, cutoutUrl?, polygon, boundingBox, confidence, segmentationSource, alphaMask, providerUsed }` — heuristic fallback has no `cutoutUrl` |
| 3 | Uncaught throw (e.g. image fetch failure in `segmentEditorLayer`) | `sourceUrl` must be fetchable server-side | Any | **500** | `{ error: "<message>" }` |

**Auth/validation paths:** 400 invalid JSON; 400 missing `sourceUrl`.

---

### `POST /api/editor/segment/prompt` (`src/app/api/editor/segment/prompt/route.ts`)

| # | Condition | HTTP | Response payload |
|---|-----------|------|------------------|
| 1 | `segmentByPrompt` error contains `"not configured"` | **503** | `{ ok: false, error }` |
| 2 | Other `segmentByPrompt` failures | **422** | `{ ok: false, error: "No segmentation provider available." }` etc. |

---

### Provider-internal failure codes (not direct HTTP 503)

| Code | Where | Becomes 503? |
|------|-------|--------------|
| `SEGMENT_UNAVAILABLE` | `editor-segmentation-provider.ts` → click route | **Yes** (503) |
| `SAM2_UNAVAILABLE` | `sam2-click-segment.ts` | **No** — `segmentByClick` ignores `sam2.ok === false` and continues to REMBG, then `SEGMENT_UNAVAILABLE` |
| `REMBG_UNAVAILABLE` | Not a dedicated code — REMBG skipped when env unset; `segmentEditorLayer` returns heuristic without `maskUrl` | Indirect → `SEGMENT_UNAVAILABLE` on click |
| `providerUnavailable` | UI i18n `editor.clickSegment.providerUnavailable` — client guard before API call when `!autoMaskProviderAvailable && !replicateAvailable` | **No HTTP call** |

---

## Provider Priority Audit

### `segmentByClick` (globe/logo/person/text chips, precise select, one-click cutout)

**Current runtime priority:**

1. **Replicate SAM3** — `isReplicateConfigured() && input.imageUrl`
2. **SAM2** — `isSam2SegmentationAvailable()` (`SAM2_SEGMENTATION_URL`)
3. **REMBG** — `segmentationProviderAvailable("rembg") && input.imageUrl`
4. **Failure** — `SEGMENT_UNAVAILABLE` (no heuristic/manual provider attempt)

**Expected priority:**

1. Replicate SAM3  
2. SAM2  
3. REMBG  
4. Manual fallback  

**Differences:**

- Order 1–3 matches expectation.
- **Manual fallback is not attempted** in the provider chain; only advertised in `fallbacks` array on 503.
- Replicate block **silently falls through** on partial success (prediction OK but post-processing fails) — treated as “provider failed” with no error surfaced.
- Replicate is **skipped entirely** when `imageUrl` is missing (even if `imageBase64` or `backgroundStorageKey` is present).

### `segmentByPrompt` (`/api/editor/segment` refine, `/api/editor/segment/prompt`)

1. Replicate SAM3  
2. REMBG  
3. Failure — **no SAM2, no manual**

### `removeBackground`

1. Replicate SAM3  
2. `segmentEditorLayer` (REMBG if configured, else **heuristic** polygon only — no mask/cutout)

**Difference from expectation:** Heuristic is a silent terminal fallback (HTTP 200, empty cutout) rather than a ranked provider with explicit availability.

---

## Replicate Usage Audit

### Can `/api/editor/segment/click` use Replicate today?

**Yes — when all gate conditions pass.**

| Step | File / function | Detail |
|------|-----------------|--------|
| Route entry | `click/route.ts` → `segmentByClick()` | Passes `imageUrl`, `objectHint`, `clickPoint`, layer hints |
| Prompt resolution | `resolveEditorSegmentPrompt({ objectHint: "globe", ... })` | `"globe"` → SAM3 prompt `"globe"` |
| Provider gate | `editor-segmentation-provider.ts:335` | `isReplicateConfigured() && input.imageUrl` |
| Replicate call | `segmentEditorImageWithReplicateSam3()` | `createReplicatePrediction` on `yodagg/sam3-image-seg`, `multimask_output: true`, `clickPoint` → `pickSam3MaskIndexAtClick` |
| Post-process | `loadSourceImageBuffer` → `maskBufferFromUrl(rep.result.maskUrl)` → `extractMaskContourFromPng` → `persistMaskAndCutout` → `uploadPublicBlob` |
| Success response | `click/route.ts:94-107` | `maskUrl`, `cutoutUrl`, `polygon`, `providerUsed: "replicate_sam3"`, etc. |

**Request payload (Globe Man → Selecteer: globe):**

```json
{
  "imageUrl": "<document.backgroundUrl>",
  "backgroundStorageKey": "<document.backgroundStorageKey>",
  "clickPoint": { "x": 0.5, "y": 0.18 },
  "objectHint": "globe",
  "targetBounds": { "x": 0.22, "y": 0.12, "width": 0.56, "height": 0.78 },
  "editorObjectId": "<childStub.id>",
  "sessionId": "<sessionId>",
  "createCutout": true
}
```

### Can `/api/editor/segment` use Replicate today?

| Mode | Replicate path | 503? |
|------|----------------|------|
| `refine` | `segmentByPrompt()` → same Replicate chain as above | **503** if Replicate + REMBG both fail |
| `remove_background` | `removeBackground()` → Replicate then `segmentEditorLayer` | **No 503** — returns 200; client fails if `!cutoutUrl` |

### Why Replicate may never “succeed” despite `REPLICATE_API_TOKEN`

Replicate is **reached** when token + `imageUrl` exist, but success requires **five post-Replicate steps**. Any failure falls through silently:

| Failure point | Function | Line (approx.) | Effect |
|---------------|----------|----------------|--------|
| Token unset at runtime | `isReplicateConfigured()` | `replicate-client.ts:31` | Skip Replicate block entirely |
| No `imageUrl` | `segmentByClick` gate | `editor-segmentation-provider.ts:335` | Skip Replicate block |
| Model / API / timeout | `segmentEditorImageWithReplicateSam3` | `replicate-sam3-editor-segment.ts:108-140` | `rep.ok === false`, fall through |
| `pred_masks[i]` not HTTP/data URL | `maskToUrl()` | `replicate-sam3-editor-segment.ts:19-24,169` | `rep.ok === true` but `maskUrl` null → skip success block |
| Source image not fetchable | `loadSourceImageBuffer` | `editor-segmentation-provider.ts:343` | throw → caught as `persist_failed` → fall through |
| Mask URL not fetchable | `maskBufferFromUrl` | `editor-segmentation-provider.ts:344-345` | silent fall through |
| Blob upload missing / denied | `persistMaskAndCutout` → `uploadPublicBlob` | `vercel-blob-config.ts:122-127` | throw → caught `persist_failed` → fall through |

After fall-through: SAM2 and REMBG unavailable → **`SEGMENT_UNAVAILABLE` → HTTP 503**.

**Most likely production root cause (ranked):**

1. **`BLOB_READ_WRITE_TOKEN` missing** — Replicate prediction succeeds; `persistMaskAndCutout` throws `EXPORT_UPLOAD_AUTH_FAILED`; caught and ignored; 503.
2. **Replicate runtime error** (billing, model, timeout, bad image URL) — `rep.ok === false`; 503.
3. **`maskUrl` null after succeeded prediction** — mask format not a fetchable URL; 503.
4. **Server-side `imageUrl` fetch failure** — private or expired blob URL; 503.
5. **`REPLICATE_API_TOKEN` not present in production serverless runtime** (set locally only) — status may still show configured if probed from a different context; skip Replicate → 503.

---

## Environment Audit

| Variable | Name in code | Runtime access | Server route access | Status reporting |
|----------|--------------|----------------|---------------------|------------------|
| Replicate | `REPLICATE_API_TOKEN` | `process.env.REPLICATE_API_TOKEN` | `isReplicateConfigured()` in all segment providers | `replicateConfigured`, `replicateSam3Available` (= same boolean) |
| SAM2 | `SAM2_SEGMENTATION_URL` | `segmentationProviderAvailable("sam2")` | `isSam2SegmentationAvailable()` | `sam2PreciseSelection`, `endpointConfigured` |
| REMBG | `REMBG_API_URL` | `segmentationProviderAvailable("rembg")` | `tryRembgMask` / `segmentEditorLayer` | `rembgAvailable` |
| Blob persist (required for Replicate cutout/mask persist) | `BLOB_READ_WRITE_TOKEN` | `getBlobReadWriteToken()` | `uploadPublicBlob` | **Not reported** on `/api/editor/segment/status` |

**Production with only `REPLICATE_API_TOKEN`:**

| Flag | Value |
|------|-------|
| `replicateConfigured` | `true` |
| `replicateAvailable` / `replicateSam3Available` | `true` (env-only; **not** live API probe) |
| `sam2Available` | `false` |
| `rembgAvailable` | `false` |
| `autoMaskProviderAvailable` | `true` (`primary !== "none"` → `replicate_sam3`) |

**Gap:** `replicateAvailable` means “token string exists”, not “SAM3 prediction + mask persist succeeded”.

---

## Status Endpoint Audit

**Route:** `GET /api/editor/segment/status` (`src/app/api/editor/segment/status/route.ts`)

| Field | Reported correctly? | Notes |
|-------|---------------------|-------|
| `replicateConfigured` | Partial | Correct for env presence |
| `replicateAvailable` / `replicateSam3Available` | **Mismatch** | Identical to `replicateConfigured`; no health check, no blob dependency |
| `sam2Available` | Yes | Via `getSam2ServiceStatus()` |
| `rembgAvailable` | Yes | `REMBG_API_URL` presence |
| `autoMaskProviderAvailable` | Partial | `true` when Replicate token set, even if every Replicate call fails at runtime |
| `providerPriority` | Static | `["replicate_sam3","sam2","rembg","heuristic"]` — accurate as documented intent, not runtime probe order |
| Blob / persist readiness | **Missing** | Not exposed; critical for Replicate success |

---

## Globe Selection Failure Trace

**User flow:** Upload Globe Man → click globe → **Selecteer: globe**

| Step | Component | Result |
|------|-----------|--------|
| 1 | Canvas click | `openClickSegmentPrompt(point)` |
| 2 | Chip `globe` | `handleClickSegmentPrompt("globe")` → `runPromptSubLayerSegmentation` |
| 3 | Client guard | Passes if `autoMaskProviderAvailable \|\| replicateAvailable` (true when token set) |
| 4 | HTTP request | `POST /api/editor/segment/click` with `objectHint: "globe"`, `imageUrl: document.backgroundUrl` |
| 5 | Auth | `requireActiveUser()` |
| 6 | Provider | `segmentByClick` → `resolveEditorSegmentPrompt` → `"globe"` |
| 7 | Replicate attempt | `segmentEditorImageWithReplicateSam3({ imageUrl, prompt: "globe", clickPoint })` |
| 8 | **Failure point (503 scenario)** | Replicate chain does not return persisted `maskUrl` (see table above) |
| 9 | SAM2 | Skipped — `SAM2_SEGMENTATION_URL` unset |
| 10 | REMBG | Skipped — `REMBG_API_URL` unset |
| 11 | Terminal | `editor-segmentation-provider.ts:471-476` → `code: "SEGMENT_UNAVAILABLE"` |
| 12 | HTTP | `click/route.ts:82-89` → **503** |
| 13 | UI | `runPromptSubLayerSegmentation` → `editor.clickSegment.failed` (not 503-specific message) |

**Exact 503 emission line:** `src/app/api/editor/segment/click/route.ts:82` (`status = 503` when `result.code === "SEGMENT_UNAVAILABLE"`).

**Exact failure origin line:** `src/server/editor/editor-segmentation-provider.ts:471-476` (all providers exhausted).

---

## Background Removal Failure Trace

**User flow:** Upload image → **Remove background**

| Step | Detail |
|------|--------|
| 1 | `handleRemoveBackground()` → `POST /api/editor/segment` `mode: "remove_background"` |
| 2 | `removeBackground()` tries Replicate SAM3 with prompt `"person"` (default) |
| 3 | Same silent fall-through risks as click (mask fetch, blob persist) |
| 4 | Falls back to `segmentEditorLayer` — without `REMBG_API_URL`, `tryRembgMask` returns null |
| 5 | Returns **HTTP 200** heuristic: `segmentationSource: "heuristic"`, polygon from `targetBounds`, **no `maskUrl`, no `cutoutUrl`** |
| 6 | Client `handleRemoveBackground` line 1187: `if (!result.cutoutUrl)` → `editor.backgroundRemove.failed` |

**503?** Background remove does **not** return 503 in normal code path — user-visible failure is **200 + empty cutout**. If user sees 503 on `/api/editor/segment`, likely **`mode: "refine"`** (auto-mask fallback at `editor-canvas-workspace.tsx:415`) not background remove.

---

## Required Fixes

*Audit only — not implemented in this change.*

### Critical

1. **Stop swallowing Replicate post-processing errors** — propagate `rep.error`, blob upload failures, and image-fetch errors in API response instead of generic `SEGMENT_UNAVAILABLE` 503.
2. **Document and enforce `BLOB_READ_WRITE_TOKEN` for Replicate-only Editor** — mask/cutout persist always calls `uploadPublicBlob`; without blob token, Replicate-only deployments always 503 on click/cutout.
3. **Harden `maskToUrl` / mask ingestion** — handle non-URL `pred_masks` payloads (or fail with explicit Replicate output error).

### High

4. **Split `replicateConfigured` vs `replicateAvailable`** on status endpoint — optional live probe (model fetch or lightweight prediction).
5. **Expose `blobStorageConfigured` on `/api/editor/segment/status`** so production misconfig is visible before user clicks.
6. **`removeBackground` should not return 200 without cutout** when Replicate was expected — return 503/422 with actionable error.

### Medium

7. **Allow Replicate path with `imageBase64` / validated `backgroundStorageKey`** when `imageUrl` absent (parity with SAM2 validation path).
8. **Add SAM2 to `segmentByPrompt` chain** for parity with click (optional if Replicate-only is the target).
9. **Unify 503 semantics** across `/api/editor/segment/prompt` (422 vs 503) and `/api/editor/segment` refine.

### Low

10. **Client messaging** — distinguish Replicate failure vs missing providers vs blob misconfig (today globe flow shows generic `clickSegment.failed` on any non-OK).

### Minimum code changes for Replicate-only production

1. Surface real failure reason from Replicate + persist chain in `segmentByClick` / `removeBackground` (≈ `editor-segmentation-provider.ts`, route handlers).
2. Status endpoint: add `blobStorageConfigured: isBlobTokenConfigured()`.
3. Fix or bypass mask persist when blob unavailable (use transient Replicate mask URL for selection-only, or fail fast with clear error).
4. Ensure `imageUrl` is server-fetchable (public blob URLs or signed URL helper).

---

## Replicate-Only Deployment Matrix

With **only** `REPLICATE_API_TOKEN` (no `SAM2_SEGMENTATION_URL`, no `REMBG_API_URL`):

| Capability | Works today? | Condition |
|------------|--------------|-----------|
| Selecteer: globe | **NO** (503) | Unless Replicate + blob + image fetch all succeed end-to-end |
| Selecteer: logo | **NO** (503) | Same |
| Selecteer: person | **NO** (503) | Same |
| Selecteer: text | **NO** (503) | Same |
| Remove background | **NO** (client fail) | HTTP 200 heuristic without `cutoutUrl` |
| Create cutout | **NO** (503) | Uses `/api/editor/segment/click` + `createCutout: true` + blob persist |
| Child layer creation | **NO** | Depends on click segment `maskUrl` |

**With `REPLICATE_API_TOKEN` + `BLOB_READ_WRITE_TOKEN` + fetchable `backgroundUrl` + healthy Replicate API:**

| Capability | Works today? |
|------------|--------------|
| Selecteer: globe/logo/person/text | **YES** (intended path) |
| Remove background | **YES** (Replicate path) |
| Create cutout | **YES** |
| Child layer creation | **YES** |

---

## Tests / Build Status

See CI output from audit commit — contract tests in `src/lib/editor-production-segmentation-503-audit.test.ts`.
