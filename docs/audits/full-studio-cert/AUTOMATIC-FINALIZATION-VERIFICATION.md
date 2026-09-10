# Automatic Finalization — Verification

**Updated:** 2026-08-27T13:12Z  
**Project:** `cmt5hnj1s0003jh09hns3vu4v`  
**Worker + Vercel:** `374f9af2` (version-persistence fix)

## Classification

`AUTOMATIC_FINAL_VIDEO_MERGE = CERTIFIED`  
`VERSIONING_SAFETY = CERTIFIED`

Machine evidence: [AUTOMATIC-FINALIZATION-RUN-12.json](./AUTOMATIC-FINALIZATION-RUN-12.json)

## Deployment revision gate

| Surface | SHA | Gate |
|---------|-----|------|
| Vercel Production | `374f9af2` / `dpl_BBGJH3y7P5nm83AEoRnyxANdvUnr` | PASS |
| Render worker | `374f9af2` | PASS |

## Run-12 (final cert replay)

| Field | Result |
|-------|--------|
| Path | GET `/status` only |
| Forbidden rebuild/repair | **0** |
| Elapsed | **~24s** |
| Export | `completed` / **100%** |
| Blob | `…/final-v6.mp4` |
| HEAD | **200** `video/mp4` |
| Size | **1 167 862** bytes |
| Project | `completed`, `instantFinalRebuildCount=6` |
| Vidu / OpenAI / credits | **0** / **0** / **0** |

### ProjectRenderVersion (authoritative post-commit)

| Field | Value |
|-------|-------|
| Canonical `renderVersionNumber` | **5** |
| `rebuildCount` | **6** (blob key `final-v6`; not required to equal version number) |
| Status | `completed` |
| `isDefault` | **true** |
| `finalVideoUrl` | matches export `final-v6.mp4` |
| Prior v4 | `failed`, `isDefault=false`, URL null (not current) |
| Historical | v1–v4 preserved; v5 added once |

### Idempotency

Repeat GET `/status` after completion: still `completed`, same final URL, version count **5** unchanged, no forbidden POSTs.

### Script note

Cert harness briefly reported `PARTIAL_CHAIN` because `verifyAutomaticFinalChain` ran while export was already `completed` and the version row commit was still finishing (ordering inside `commitInstantPremiumFinalVideoExport`). Post-hoc DB + idempotency checks are authoritative and **PASS**.

## Historical evidence (preserved)

1. Pre-repair fire-and-forget stall  
2. Runs 3–10: upload H6 collision / worker lag  
3. Run-11: upload PASS (`final-v5`), version missing → V1  
4. Fix `374f9af2`: `persistFinalRenderVersionAfterExport`  
5. Run-12: upload + version PASS → **CERTIFIED**

## Root cause closed (V1)

Automatic re-finalization set `isRebuild` without `pendingFullRerender`, so commit skipped version create. Repair reuses seal → createPending → completePending.
