# Automatic Finalization — Verification

**Updated:** 2026-08-24T23:05Z  
**Project:** `cmt5hnj1s0003jh09hns3vu4v`

## Historical failed replay (preserved)

Pre-repair Production replay:

- export reset → `pending` / 0
- GET `/status` only, 0 Vidu
- ~7 min: UI ~70%, worker=`running`, export stayed `pending`/0
- diagnostic direct worker then completed ~23s (**not** CERTIFIED)

JSON: prior `AUTOMATIC-FINALIZATION-VERIFICATION.json` classification **WORKING**

## Root cause

`STATUS_ORCHESTRATE_FIRE_AND_FORGET_DIES_ON_SERVERLESS` — see `MERGE-70PCT-ROOT-CAUSE.md`

Progress quirk: UI 70% from `isRestoringFinalVideo` → `Math.max(70, progress)` while DB progress = 0.

## Repair shipped (pending Production deploy verification)

Code:

- `finalize-repair.ts` — `after()` dispatch, claim queued, ack-before-running, dispatch-failed clear
- `status-service.ts` — await status-auto repair acceptance
- `reconcile-video-repair.ts` — redispatch running+idle export
- tests: `finalize-repair.test.ts`, `repair-worker-dispatch.test.ts`, `automatic-finalization-orchestration.test.ts`

## Post-deploy certification requirement

Existing-asset replay only:

1. segments ready
2. final absent (`pending`)
3. GET `/status` only (no rebuild, no direct worker)
4. observe automatic complete + playable `finalVideoUrl`

Until that Production replay passes:

`AUTOMATIC_FINAL_VIDEO_MERGE = WORKING`

CERTIFIED only after normal path success on Production.
