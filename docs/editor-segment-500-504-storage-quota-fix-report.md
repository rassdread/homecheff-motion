# Editor Segment 500/504 + Storage Quota Fix Report

**Date:** 2026-06-10

---

## Click 500 Root Cause

Production **500** on `/api/editor/segment/click` was caused by **unhandled throws** escaping the route (no top-level `try/catch`) and by **silent Replicate post-processing failures** that previously fell through without actionable codes.

**Primary failure chain (Replicate configured):**

1. Replicate prediction succeeds (`provider: replicate_sam3` in UI).
2. Post-process fails at one of:
   - `maskBufferFromUrl` — **data-URI masks were not decoded** (only HTTP `fetch` was used).
   - `persistMaskAndCutout` → `uploadPublicBlob` — missing/invalid `BLOB_READ_WRITE_TOKEN`.
   - `loadSourceImageBuffer` — server cannot fetch `imageUrl`.
3. Failure was swallowed → `SEGMENT_UNAVAILABLE` or uncaught throw → **500**.

**Fix:** Explicit error codes returned at each phase; route wrapped in `try/catch`; data-URI mask support in `maskBufferFromMaskRef`.

| Code | HTTP | When |
|------|------|------|
| `image_fetch_failed` | 502 | Source image not fetchable |
| `replicate_timeout` | 504 | Replicate poll exceeds 55s (click) |
| `replicate_prediction_failed` | 502 | Replicate API/model failure |
| `replicate_mask_format_unsupported` | 502 | `pred_masks[i]` not URL/data-URI |
| `mask_fetch_failed` | 502 | Mask download/decode failed |
| `blob_upload_failed` | 502 | Vercel Blob token/upload failure |
| `cutout_generation_failed` | 502 | Sharp composite/persist error |
| `response_payload_too_large` | 502 | JSON > 512KB |
| `SEGMENT_UNAVAILABLE` | 503 | No provider available |
| `segmentation_internal_error` | 500 | Uncaught server error |

Server trace logging: `[editor-segmentation]` with phases `click_start`, `replicate_click_start`, `replicate_click_completed`, `click_finalize_failed`, etc.

---

## Segment 504 Fix

**Cause:** `tryAutoAcquireMask` called `/api/editor/segment/click` (Replicate, up to 55s), then on failure immediately called `/api/editor/segment` **refine** (second Replicate wait, 50s) → total **>60s Vercel gateway** → **504**.

**Fixes:**

1. **Removed refine fallback** after replicate/sam2 click attempt — refine only when `strategy === "rembg"`.
2. **Shortened Replicate timeouts:** click 55s, refine 50s (was 120s).
3. **Refine route** returns `segmentErrorHttpStatus(code)` including **504** for `replicate_timeout`.

---

## Storage Quota Audit

| Key | Location | Contents | Risk |
|-----|----------|----------|------|
| `hc-editor-canvas-sessions-v1` | `editor-canvas-session.ts` | **All editor sessions** + full undo history (15 snapshots × full document JSON) | **Critical** — primary quota offender |
| `hc-editor-saved-parts-v1` | `editor-library-persist.ts` | Saved part metadata | Low |
| `hc-editor-recent-placements` | `editor-placement-canvas.ts` | Placement IDs | Low |
| `editor-motion-bootstrap` | `use-editor-motion-bootstrap.ts` | sessionStorage bootstrap | Low |

**Bloat sources in session store:**

- `history.past[]` — full document snapshots (was 50, now 15).
- Multiple sessions retained (was unbounded, now max 5).
- `selectionShape.maskData` — base64 mask payloads (now stripped on save).
- URLs only for masks/cutouts — no binary in API responses.

---

## Storage Quota Fix

**New:** `src/lib/editor-local-storage.ts`

- `safeSetLocalStorage()` — catches `QuotaExceededError`, never throws.
- `stripDocumentForStorage()` — removes `maskData`, trims polygons/history.
- `pruneEditorSessionStore()` — keeps 5 most recent sessions (+ active).
- `saveEditorCanvasDocumentWithStatus()` — returns `storageWarning: "quota_exceeded"`.

**UI message (NL):** `editor.storage.quotaPartialSave` — *"Concept kon lokaal niet volledig worden opgeslagen, maar je bewerking blijft zichtbaar."*

---

## Response Size Check

Segment routes return only:

- `maskUrl`, `cutoutUrl`, `polygon` (≤64 points), `boundingBox`, `confidence`, metadata.

No base64 mask/cutout/image in JSON. Responses >512KB rejected with `response_payload_too_large`.

---

## Failure UI Recovery

- `runPromptSubLayerSegmentation` — `setRefiningSelection(true/false)` in `try/finally`.
- Click/prompt errors mapped via `editorSegmentErrorMessageKey(code)`.
- `tryAutoAcquireMask` — clears loading in `finally`; no second blocking refine call.
- Storage quota — edit remains visible; partial-save warning only.

---

## Live Verification

**Local contracts:** 23 targeted tests pass.

**Production checklist:**

1. Confirm `BLOB_READ_WRITE_TOKEN` on Vercel Production.
2. Upload Globe Man → click globe → Selecteer: globe.
3. Expect: no 500/504; `maskUrl` + child layer; or explicit error e.g. `blob_upload_failed`.
4. DevTools Application → Local Storage — `hc-editor-canvas-sessions-v1` should not contain `maskData`.

---

## Tests / Build Status

See commit validation output.
