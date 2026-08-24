# Merge 70% Root Cause — Updated

**Updated:** 2026-08-24T23:05Z  
**Project:** `cmt5hnj1s0003jh09hns3vu4v`

## Taxonomy (proven)

**L. OTHER_PROVEN_CAUSE** — `STATUS_ORCHESTRATE_FIRE_AND_FORGET_DIES_ON_SERVERLESS`

Contributing:

| Class | Proven? | Detail |
|-------|---------|--------|
| J. PROGRESS_DISPLAY_STALE | yes (secondary) | UI `Math.max(70, export.progress)` while export stays `pending`/0 under `isRestoringFinalVideo` |
| K. IDEMPOTENCY_LOCK | yes (secondary) | `running` written before worker ack → `mergeInProgress` blocks re-dispatch for the lease window |
| E. MERGE_WORKER_TIMEOUT | no | Direct worker completed ~23s |
| F–I | no | Direct worker / rebuild succeed |

Not A–D: eligibility fired; orchestrate entered; segments ready.

## Call chain (code evidence)

```
GET /api/instant-premium/projects/:id/status
  → getInstantPremiumStatus
    → transitionsCompleted && status !== completed
      → detectFinalizationStuck
      → else if !mergeInProgress → await orchestrateFinalMerge(projectId)
           [worker mode, non-awaitWorker — PRE-FIX]
           → DB write instantWorkerJobStatus=queued
           → triggerInstantPremiumWorkerMerge  // void fire-and-forget
                → dispatchInstantPremiumWorkerMerge
                     → DB write status=running   // BEFORE worker HTTP
                     → await requestWorkerInstantPremiumProcess  // often never finishes
           → void runFinalExportToCompletion   // also fire-and-forget
           → return
  → NextResponse.json(status)  // isolate ends; detached work dies
```

## False running

| Question | Answer |
|----------|--------|
| Where is running persisted? | `dispatchInstantPremiumWorkerMerge` → `animationProject.instantWorkerJobStatus` |
| Before worker invocation? | **Yes (pre-fix)** — written before `requestWorkerInstantPremiumProcess` |
| Can dispatch fail after running stored? | **Yes** — Vercel freezes detached promises after response |
| Does next GET refuse retry? | **Yes** — `mergeInProgress` while age < stale threshold |
| Lease/heartbeat? | `instantWorkerJobStartedAt` only; no heartbeat |
| Stale recovery? | `detectFinalizationStuck` + status-auto repair (also was `void`'d pre-fix) |

## Automatic vs direct worker

| | Automatic (broken) | Direct diagnostic (works) |
|--|-------------------|---------------------------|
| Target | `VIDEO_WORKER_BASE_URL/jobs/instant-premium/:id/process` | same |
| Method | POST JSON `{force?}` | POST `{force:true}` |
| Auth | `Bearer VIDEO_WORKER_SECRET` | same |
| Await | fire-and-forget on status isolate | awaited ~23s |
| Runtime | Vercel serverless request | local curl → Render worker |

Same URL/auth/payload class. Difference: **awaiting + surviving the request lifecycle**.

## Repair (this closeout)

1. Claim lease as `queued` (not `running`) via `claimFinalMergeQueued`
2. Schedule dispatch with Next.js `after()` so work survives GET `/status`
3. Write `running`/`completed` only after worker acknowledgement
4. `markFinalMergeDispatchFailed` on failed handoff (no immortal running)
5. Detect `false_running_export_idle` (running + export pending/0 past 90s)
6. Await `startInstantVideoRepair` acceptance on status-auto so `after()` registers
7. Stale threshold **90s** (materially above ~23s merge)

Root-cause class remains **L** with **J** + **K** as contributing display/lease effects.
