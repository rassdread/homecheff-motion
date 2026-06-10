# Editor Async Segmentation Job Report

**Date:** 2026-06-10

---

## Timeout Trace

Sync `/api/editor/segment/click` was capped at **28s** (`EDITOR_CLICK_ROUTE_DEADLINE_MS`) with Replicate at **20s**. Cold starts + mask fetch + blob upload often exceed this → **504 `replicate_timeout`**.

Logged phases ( `[editor-segmentation]` ):

| Phase | When |
|-------|------|
| `replicate_prediction_start` | Before Replicate poll |
| `replicate_prediction_complete` | After Replicate returns (+ `replicatePredictionMs`) |
| `finalize_ms` | Mask fetch + blob persist |
| `async_job_queued` / `async_job_start` / `async_job_ready` | Job lifecycle |

Async jobs use **75s** Replicate + **120s** total route deadline.

---

## Job Model

`src/types/editor-segment-click-job.ts` + in-memory store (`globalThis` Map, 2h TTL).

Fields: `jobId`, `sessionId`, `prompt`, `imageUrl`, `clickPoint`, `parentLayerId`, `editorObjectId`, `status` (`queued | running | ready | failed | timeout`), `result`, `errorCode`, `trace`, `createdAt`, `updatedAt`.

---

## Start Route

`POST /api/editor/segment/click/start` — validates body, creates job, `scheduleEditorSegmentClickJob` via `after()`, returns `{ jobId, status: "queued" }` in ~1s.

---

## Status Route

`GET /api/editor/segment/click/status?jobId=` — returns `queued` / `running` / `ready` + result / `failed` + `errorCode` + `retryable`.

---

## Client Polling

`runPromptSubLayerSegmentation` → `startEditorSegmentClickJob` → poll every **1.8s**, max **90s**. Applies child layer on `ready`.

---

## Compatibility

`POST /api/editor/segment/click` unchanged for auto-mask / precise-select / cutout sync paths.

---

## User Feedback

Canvas pill messages: running, cold start (after 6s), timeout via existing error keys + `editor.segmentJob.*` i18n.

---

## Globe Man Async E2E

Contract tests in `src/lib/editor-segment-click-job.test.ts` + updated globe trace tests.

---

## Tests / Build Status

See commit validation.
