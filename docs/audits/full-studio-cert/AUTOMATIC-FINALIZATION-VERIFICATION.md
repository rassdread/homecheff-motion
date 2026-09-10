# Automatic Finalization — Verification

**Updated:** 2026-08-26  
**Project:** `cmt5hnj1s0003jh09hns3vu4v`  
**Forensic:** [TARGET-B-FIRST-DIVERGENCE.md](./TARGET-B-FIRST-DIVERGENCE.md)

## Classification

`AUTOMATIC_FINAL_VIDEO_MERGE = WORKING` (not CERTIFIED)

## First divergence (proven 2026-08-26)

**H6 STORAGE_KEY_COLLISION** — automatic re-finalization on cert project (`instantFinalRebuildCount=4`) targeted legacy `final.mp4` with `allowOverwrite=false` while object existed; rebuild used `final-v{N}.mp4` with overwrite allowed.

**Fix:** `32abbba2` — version automatic upload after prior rebuilds.

**Blocker after Vercel deploy:** Render video worker must run same SHA (merge+upload executes on worker, not Vercel).

## Historical failed evidence (preserved)

1. Pre-repair: GET `/status` left export `pending`/0 + worker `running` for ~7 min.
2. Post-orchestration repair (`auto-merge-cert-run-3`…`9`): `Final video upload failed.` at progress 70; rebuild succeeded (~20s, `final-v4.mp4`).
3. Post-fix Vercel deploy (`32abbba2`, run-10): same upload failure — worker source parity gap.

## Repairs shipped

| SHA | Change |
|-----|--------|
| `45a66190` | claim queued; after() attempt; ack-before-running |
| `f23e644f` | await dispatch + status `maxDuration=300` |
| `6bfe9849` | worker process client timeout 180s |
| `fd1b317f` | force merge on automatic path |
| `38b2d32e` | use rebuild `trigger_and_poll` primitive |
| `5ac94c7c` | `resetInstantRepairExportState` before poll |
| **`32abbba2`** | **versioned blob + allowOverwrite for automatic re-finalization** |

## Why not CERTIFIED

Normal Production GET `/status` replay has **not** produced playable persisted `finalVideoUrl` + completed version after fix deploy on **both** Vercel and Render worker.

## Provider

| Metric | Value |
|--------|-------|
| New Vidu | **0** |
| Credits | **0** |
| Rebuild during cert | forensic contrast only |
