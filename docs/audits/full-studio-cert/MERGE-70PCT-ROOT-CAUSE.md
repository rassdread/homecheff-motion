# Merge 70% Root Cause — Updated

**Updated:** 2026-08-24T23:50Z  
**Project:** `cmt5hnj1s0003jh09hns3vu4v`  
**Repair SHAs:** `45a66190` → `f23e644f` → `6bfe9849` → `fd1b317f` → `38b2d32e` → `5ac94c7c`

## Taxonomy (proven)

### Primary (original stall)

**L. OTHER_PROVEN_CAUSE** — `STATUS_ORCHESTRATE_FIRE_AND_FORGET_DIES_ON_SERVERLESS`

- `running` written before worker ack
- fire-and-forget dispatch died when GET `/status` returned
- UI 70% via `isRestoringFinalVideo` while export stayed `pending`/0 (**J**)
- lease blocked retries (**K**)

### Secondary (after orchestration repair)

**H. FINAL_UPLOAD_FAILURE** — automatic GET `/status` path still ends with export `Final video upload failed.` / worker HTTP 500 in several Production replays, while **manual `rebuild-final-video` succeeds** (~20s, playable `final-v4.mp4`) on the same project/segments.

## Call chain (current code intent)

```
GET /status (maxDuration=300)
  → getInstantPremiumStatus
    → segments ready && !completed
      → claimFinalMergeQueued (queued lease)
      → resetInstantRepairExportState
      → runFinalExportToCompletion({ force: true })  // same primitive as rebuild
           → triggerWorkerInstantPremiumProcess (180s client timeout)
           → poll DB until completed/failed
```

## Automatic vs rebuild (still diverging on Production)

| | Automatic GET `/status` | Rebuild POST |
|--|-------------------------|--------------|
| Shared merge primitive | `runFinalExportToCompletion` | same |
| Force | true | true |
| Observed | upload failed / long poll timeout | completed ~20s, final URL |

So orchestration handoff is aligned with rebuild in code; a remaining Production gap still prevents CERTIFIED automatic closure.

## Progress display

UI ~70% with DB progress 0: `isRestoringFinalVideo` → `Math.max(70, progress)`.

## Classification

`AUTOMATIC_FINAL_VIDEO_MERGE = WORKING` (not CERTIFIED)
