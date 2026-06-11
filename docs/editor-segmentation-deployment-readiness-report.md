# Editor Segmentation — Deployment Readiness Report

**Date:** 2026-06-10  
**Scope:** Async click segmentation job flow (prompt sub-layer path)

## Routes verified

| Route | File | Status |
|-------|------|--------|
| `POST /api/editor/segment/click/start` | `src/app/api/editor/segment/click/start/route.ts` | Wired — creates job, logs `[editor-segment-job]`, schedules `after()` runner |
| `GET /api/editor/segment/click/status?jobId=` | `src/app/api/editor/segment/click/status/route.ts` | Wired — stale-job watchdog, terminal logging |
| `POST /api/editor/segment/click` (sync) | `src/app/api/editor/segment/click/route.ts` | Retained for auto-mask, SAM2, cutout — not used by prompt flow |

## Client wiring verified

- `runPromptSubLayerSegmentation` → `startEditorSegmentClickJob` + `pollEditorSegmentClickJob` (async only).
- Sync `postEditorSegmentClick` remains in `tryAutoAcquireMask`, `runSam2ClickSegment`, `handleOneClickCutout` only.

## Polling verified

- Poll interval: 1.8s (`EDITOR_SEGMENT_JOB_POLL_MS`).
- Client max wait: 90s (`EDITOR_SEGMENT_JOB_MAX_WAIT_MS`).
- Uses `await sleep` (no `setInterval` — nothing to clear on unmount).
- Server stale watchdog: jobs stuck `queued`/`running` > 135s marked `timeout` on status poll.

## Loading cleanup verified

- `clearSegmentJobUi()` resets `activeSegmentJobId` and `segmentCanvasMessageKey` in `finally`.
- `setRefiningSelection(false)` in same `finally` block.
- Canvas pill keys: `editor.segmentJob.running` → `editor.segmentJob.coldStart` after 6s cold start.

## Terminal job states

Every job ends in one of:

| State | Server path |
|-------|-------------|
| `ready` | Runner success → `markEditorSegmentClickJobReady` |
| `failed` | Provider error / runner catch |
| `timeout` | Provider timeout, stale watchdog, runner orphan guard |

## Production logging

Structured `console.info("[editor-segment-job]", …)` with:

- `jobId`, `status`, `provider`, `elapsedMs`, `finalResult`

Emitted on: queue (start route), running (runner), ready/failed/timeout (store + status route).

## Automated checks

`src/lib/editor-segment-click-job.test.ts` — route contracts, stale resolution, logging, workspace `finally` cleanup.

## Commit hash

`47e0368497b686e98fd998f26df979b5f85af7a3`
