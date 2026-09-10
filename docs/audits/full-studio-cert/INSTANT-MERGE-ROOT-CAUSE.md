# Instant Merge — Root Cause Analysis

## Observed symptom

Project `cmt5hnj1s0003jh09hns3vu4v` (Rode loper cert):

- Vidu segment **completed**
- Status: `finalizing` / `merging_clips` / **70%**
- `isRestoringFinalVideo: true` for **30+ minutes**
- Manual `POST rebuild-final-video` → **200** → `final-v1.mp4` in ~23s

## Classification

**Primary:** `MERGE_DISPATCH_NOT_AWAITED`

Automatic path (`orchestrateFinalMerge` in worker mode) dispatched the video worker via `triggerInstantPremiumWorkerMerge` and **returned without polling** for export completion.

**Contributing:**

- `REPAIR_RECONCILE_NO_POLL` — repair with `awaitWorker: true` returned early when dispatch reported `running`
- `MERGE_WORKER_TIMEOUT` — HTTP dispatch to worker uses 30s client timeout (worker may continue)
- Progress **70%** is written at concat **start** (`merge-instant-project.ts`), not completion — UI looked “stuck mid-merge”

## Why rebuild succeeded

`rebuildInstantPremiumFinalVideo` always calls:

```typescript
await runFinalExportToCompletion(projectId, { force: true });
```

which polls DB until export completes (up to export timeout).

## Fix (commit `90926699`)

`finalize-repair.ts` — `orchestrateFinalMerge`:

1. **awaitWorker:** dispatch worker → **always** `await runFinalExportToCompletion`
2. **Fire-and-forget:** dispatch worker → `void runFinalExportToCompletion()` in background

`reconcile-video-repair.ts` — redispatch when worker `running` + export stuck (not only `queued`).

## Idempotency

- No Vidu re-run on merge/rebuild
- `withMergeLock` / completed export short-circuit
- Provider-free composition from existing segment URLs

## Stall type summary

| Type | Rode loper? |
|------|-------------|
| MERGE_NOT_TRIGGERED | No (reached 70%) |
| MERGE_WORKER_TIMEOUT | Possible contributor |
| MERGE_DISPATCH_NOT_AWAITED | **Yes (primary)** |
| MERGE_COMPLETED_STATUS_STALE | Symptom, not root |
| JOB_LOCK_STALE | Possible contributor |
