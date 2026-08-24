# Automatic Finalization — Verification

**Updated:** 2026-08-24T23:50Z  
**Project:** `cmt5hnj1s0003jh09hns3vu4v`

## Classification

`AUTOMATIC_FINAL_VIDEO_MERGE = WORKING` (not CERTIFIED)

## Historical failed evidence (preserved)

1. Pre-repair: GET `/status` left export `pending`/0 + worker `running` for ~7 min; direct worker then completed (contaminated; corrected).
2. Post-repair attempts (`auto-merge-cert-run-3`…`8`): eligibility/claim observed; several runs ended `Final video upload failed.` / GET timeouts; **rebuild** on same assets succeeded (`final-v4.mp4`, ~20s).

## Repairs shipped

| SHA | Change |
|-----|--------|
| `45a66190` | claim queued; after() attempt; ack-before-running; false-running detection |
| `f23e644f` | await dispatch + status `maxDuration=300` |
| `6bfe9849` | worker process client timeout 180s |
| `fd1b317f` | force merge on automatic path |
| `38b2d32e` | use rebuild `trigger_and_poll` primitive |
| `5ac94c7c` | `resetInstantRepairExportState` before poll |

## Why not CERTIFIED

Normal Production GET `/status` replay has **not** yet produced a playable `finalVideoUrl` without rebuild/direct-worker intervention after these repairs. Rebuild proves merge capability; automatic path still fails upload in observed runs.

## Provider

| Metric | Value |
|--------|-------|
| New Vidu | **0** |
| Credits | **0** |
| Forbidden rebuild during auto cert | used only as **diagnostic contrast**, not as CERTIFIED proof |
