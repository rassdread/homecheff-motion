# Editor Real User Selection Blocker Report

**Date:** 2026-06-10  
**Commit scope:** Fix 504/timeouts, canvas feedback, vision summary, mode buttons, action truth, state machine, Globe Man E2E contracts.

---

## Segment Click 504 Fix

- Replicate click timeout reduced **55s → 20s** (`EDITOR_CLICK_REPLICATE_TIMEOUT_MS`).
- Hard route deadline **28s** (`EDITOR_CLICK_ROUTE_DEADLINE_MS`) with post-Replicate finalize guard.
- Route `maxDuration` **120 → 30** — handler returns explicit `replicate_timeout` (504) instead of gateway generic 504.
- Image/mask fetch bounded to **8s** via `fetchWithEditorSegmentTimeout`.
- Client `postEditorSegmentClick` aborts at **28s** with synthetic `replicate_timeout` body.
- Request id (`crypto.randomUUID`) passed to provider; logs under `[editor-segmentation]`.

---

## Canvas Interaction Feedback

- Help overlay: **"Klik op een onderdeel om het te selecteren"** when idle.
- Pointer cursor on interactive canvas.
- Hover label tooltip on layer bounds.
- Click feedback dot at last click point.
- Loading pill: **"Selectie maken…"** during segmentation.
- Prompt title unchanged: **"Wil je dit onderdeel selecteren?"**

---

## Vision Summary Panel

- `EditorVisionSummaryPanel` on visual workspace (before asset recommendations).
- Lists detected types (personage, wereldbol, achtergrond, logo) from layers.
- Suggested actions list with low-confidence hint when selections are approximate.

---

## Mode Button Feedback

- Contextual bar highlights active workspace mode (filled blue).
- Re-clicking active mode scrolls to panel + message **"Je bent al in Foto bewerken"** (per mode).
- Panel refs for photo_edit, compose, quick_motion, export scroll targets.

---

## Action Button Truth

- `EditorSelectionToolsPanel`: refine enabled when **Replicate OR SAM2** available (not SAM2-only).
- Remove background disabled with provider-unavailable message when no backend.
- UX V7 object actions still gated by `evaluateEditorMaskGate` (replace/remove hidden until mask).
- Cutout/segment failures use code-specific i18n via `reportSegmentFailure`.

---

## Segmentation State Machine

- `deriveSegmentationUiState` in `editor-segmentation-state.ts`.
- States: idle, clicked, prompt_visible, segmenting, mask_ready, failed_retryable, failed_provider, failed_timeout.
- Status banner in workspace with retry when allowed.

---

## Real Globe Man E2E Test

- `src/lib/editor-globe-man-selection-e2e.test.ts` — simulated Globe Man document, globe click, child mask layer, vision summary, timeout budgets, client abort contract.

---

## Production Logging

`[editor-segmentation]` fields: `requestId`, `phase`, `provider`, `prompt`, `image_fetch_ms`, `replicatePredictionMs`, `mask_fetch_ms`, `blob_upload_ms`, `totalMs`, `failureCode`.

---

## Tests / Build Status

See commit validation output.
