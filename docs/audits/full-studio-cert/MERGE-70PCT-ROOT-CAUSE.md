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

**H6 STORAGE_KEY_COLLISION / H3 STORAGE_REQUEST_REJECTED** — automatic GET `/status` path targeted legacy `final.mp4` with `allowOverwrite=false` on project with `instantFinalRebuildCount=4` and existing blob object; rebuild used versioned `final-v{N}.mp4` with overwrite allowed. Surfaced as export `Final video upload failed.` / progress 70.

**Fix:** `32abbba2`. **Worker deploy required** — upload runs on Render worker (`homecheff-motion.onrender.com`), not Vercel alone.

See [TARGET-B-FIRST-DIVERGENCE.md](./TARGET-B-FIRST-DIVERGENCE.md).

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
