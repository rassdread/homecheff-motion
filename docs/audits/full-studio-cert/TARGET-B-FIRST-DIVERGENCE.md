# Target B — First Divergence Forensic

**Date:** 2026-08-26  
**Project:** `cmt5hnj1s0003jh09hns3vu4v` (Rode loper cert)  
**Scope:** Post-merge upload/finalize chain only (0 Vidu, 0 OpenAI)

## Verdict

```
FIRST_MEANINGFUL_DIVERGENCE = automatic upload targeted legacy blob key
  motion/final/{projectId}/final.mp4 with allowOverwrite=false on a project
  with instantFinalRebuildCount=4 and an existing final.mp4 object; rebuild
  upload targeted versioned key motion/final/{projectId}/final-v{N}.mp4 via
  replaceFinalVideoBlobSafely with allowOverwrite=true.

PRIMARY_ROOT_CAUSE = H6 STORAGE_KEY_COLLISION
SECONDARY = H3 STORAGE_REQUEST_REJECTED (Vercel Blob put rejected without overwrite)

FIX_SHA = 32abbba208666a8c37a0aa543c0210e7d4987935
CERT_STATUS = TARGET_B_AUTOMATIC_FINALIZATION_BLOCKED (worker source parity pending redeploy)
```

---

## 1. Call graphs (committed source)

### A. Automatic finalization

| Step | File | Function | Lines | Runtime |
|------|------|----------|-------|---------|
| HTTP | `src/app/api/instant-premium/projects/[id]/status/route.ts` | `GET` | 34–94 | Vercel |
| Status | `src/server/instant-premium/status-service.ts` | `getInstantPremiumStatus` | 208–277 | Vercel |
| Orchestrate | `src/server/instant-premium/finalize-repair.ts` | `orchestrateFinalMerge` | 370–411 | Vercel |
| Poll | `src/server/instant-premium/wait-for-final-export.ts` | `runFinalExportToCompletion` | 59–144 | Vercel |
| Trigger | `src/lib/video-worker-client.ts` | `triggerWorkerInstantPremiumProcess` | 120–135 | Vercel (fire-and-forget POST, 180s trigger timeout only) |
| Worker HTTP | `worker/video-worker.ts` | `POST /jobs/instant-premium/:id/process` | 116–144 | Render worker |
| Worker job | `src/server/instant-premium/worker-job.ts` | `runInstantPremiumWorkerProcess` | 35–129 | Render worker |
| Merge+upload | `src/server/instant-premium/merge-instant-project.ts` | `executeInstantPremiumMerge` → `uploadMergedVideoToBlob` | 464–1413, 169–214, 1269–1286 | **Render worker** |
| Persist | `src/server/instant-premium/final-video-export-commit.ts` | `commitInstantPremiumFinalVideoExport` | — | Render worker |

Automatic path does **not** set `instantFinalRebuildStatus: "running"`.

### B. Rebuild finalization

| Step | File | Function | Lines | Runtime |
|------|------|----------|-------|---------|
| HTTP | `src/app/api/instant-premium/projects/[id]/rebuild-final-video/route.ts` | `POST` | — | Vercel |
| Rebuild | `src/server/instant-premium/rebuild-final-video.ts` | `rebuildInstantPremiumFinalVideo` | 101–324 | Vercel |
| Sets flag | same | `instantFinalRebuildStatus: "running"` | 306–317 | Vercel |
| Poll | `wait-for-final-export.ts` | `runFinalExportToCompletion({ force: true })` | 59–144 | Vercel |
| Trigger → Worker | same chain as automatic | — | — | Vercel → Render |
| Merge+upload | `merge-instant-project.ts` | `isTextRebuild=true` → versioned blob | 1006–1011, 1269–1272 | Render worker |

Both paths converge on **`executeInstantPremiumMerge` + `uploadMergedVideoToBlob`** on the Render worker.

---

## 2. Production source parity

| Surface | SHA / ID | Parity |
|---------|----------|--------|
| Local `main` | `32abbba2` | — |
| `origin/main` | `32abbba2` | **CLEAN** (matches local for finalization files) |
| Vercel Production | `dpl_5WtWB9jwthvY3ZcCSd7LGPXV4geZ` (deploy ~02:02 UTC+3) | **CLEAN** (deployed after fix commit) |
| Render video worker | `https://homecheff-motion.onrender.com` | **GAP** — `/health/video` lacks `sourceCommitSha`; blob evidence shows pre-fix upload keys still used post-Vercel deploy |

Finalization-related files diff vs `origin/main`: **0 lines** (no local-only upload fix).

---

## 3. Automatic failure evidence (captured)

Evidence: `TARGET-B-FIRST-DIVERGENCE-CAPTURE.json`, cert runs 3–10.

| Field | Value |
|-------|-------|
| projectId | `cmt5hnj1s0003jh09hns3vu4v` |
| exportId | latest export row (see JSON) |
| instantFinalRebuildCount | **4** |
| export.status | `failed` |
| export.progress | **70** |
| export.errorMessage | **`Final video upload failed.`** |
| project.failureReason | `merge_failed` |
| project.instantWorkerJobStatus | `failed` |
| finalVideoUrl written | **false** |
| version completed | **false** (v4 row `failed`) |
| local merged output | **proven indirectly** — `clean.mp4` / `clean-v4.mp4` exist (200 HEAD); FFmpeg phase reached progress 70 |
| upload helper called | **yes** — error class `ExportBlobUploadError` → generic upload failure message |
| storage client | Vercel Blob (`@vercel/blob` via `uploadPublicBlob`) |
| destination key (pre-fix automatic) | `motion/final/cmt5hnj1s0003jh09hns3vu4v/final.mp4` |
| existing object at key | **200 HEAD** (collision) |
| allowOverwrite (pre-fix automatic) | **false** |
| post-fix automatic target | `motion/final/.../final-v5.mp4` |
| post-fix target exists | **404** (upload never succeeded under fix — worker not on fix SHA) |

---

## 4. Rebuild success comparison (forensic only — not certification)

Evidence: `INSTANT-MERGE-PRODUCTION-CERT.json` (2026-08-23).

| Field | Rebuild |
|-------|---------|
| elapsedMs | ~20635 |
| finalVideoUrl | present (`final-v4.mp4` era) |
| export.status | `completed` |
| progress | 100 |
| instantFinalRebuildStatus during merge | `running` → `isTextRebuild=true` |
| upload key | `motion/final/{id}/final-v{N}.mp4` |
| allowOverwrite | **true** |
| provider calls | 0 |

---

## 5. First-divergence table (chronological)

| Row | Automatic (pre-fix) | Rebuild | Mark |
|-----|---------------------|---------|------|
| Entry point | GET `/status` → `orchestrateFinalMerge` | POST `rebuild-final-video` | DIFFERENT |
| Orchestration runtime | Vercel | Vercel | SAME |
| Worker dispatch | `triggerWorkerInstantPremiumProcess` | same | SAME |
| Worker merge fn | `executeInstantPremiumMerge` | same | SAME |
| `instantFinalRebuildStatus` | not `running` | `running` | **DIFFERENT** |
| `isMergeOnlyTextRebuild` | false | true | **DIFFERENT** |
| `resolveFinalBlobVersionForUpload` | **0** (pre-fix) | **N** (rebuild count) | **DIFFERENT ← first upload-relevant divergence** |
| Object key | `final.mp4` | `final-v{N}.mp4` | **DIFFERENT** |
| allowOverwrite | false | true | **DIFFERENT** |
| Upload helper branch | `uploadPublicBlob` direct | `replaceFinalVideoBlobSafely` | DIFFERENT (same primitive family) |
| Local output | exists (merge reached 70%+) | exists | SAME |
| Upload body | `fs.readFile` → Buffer | same | SAME |
| Storage SDK | Vercel Blob | same | SAME |
| Auth/env | worker `BLOB_READ_WRITE_TOKEN` | same | SAME |
| AbortSignal on upload | none | none | SAME |
| Cleanup vs upload | upload awaited before `finally` rm | same | SAME |
| Upload result (observed) | rejected / failed | success | DIFFERENT |
| DB persist | not reached | completed | DIFFERENT |

**FIRST_MEANINGFUL_DIVERGENCE:** `resolveFinalBlobVersionForUpload` returned **0** for automatic re-finalization on a project with `instantFinalRebuildCount > 0`, causing upload to **`final.mp4` with `allowOverwrite: false`** while an object already existed at that key. Rebuild returned **N>0** and uploaded to **`final-v{N}.mp4` with overwrite allowed**.

---

## 6. Root cause classification

**Primary:** `H6 STORAGE_KEY_COLLISION`

**Secondary:** `H3 STORAGE_REQUEST_REJECTED` (blob store rejects put when key exists and overwrite disallowed)

Not applicable: H1, H2, H4, H5, H7, I, L (for this proven slice).

---

## 7. Request lifetime / AbortSignal

| Question | Answer |
|----------|--------|
| Automatic upload receives AbortSignal? | **No** — upload runs on Render worker inside `executeInstantPremiumMerge` |
| Signal owner | N/A |
| Rebuild same? | **Yes** |
| Worker trigger timeout cancels upload? | **No** — 180s timeout applies only to Vercel→worker POST ack; merge+upload continues on worker |
| GET `/status` completion cleans workDir? | **No** — workDir is on worker filesystem |
| Vercel isolate termination interrupts upload? | **No** — upload not on Vercel |

Prior fire-and-forget orchestration fix (38b2d32e) addressed dispatch; upload failure is a **separate proven divergence**.

---

## 8. Cleanup order

Both paths: `await uploadMergedVideoToBlob` → `await commitInstantPremiumFinalVideoExport` → `finally { fs.rm(workDir) }`.

**Invariant holds in source.** No evidence of file removed before upload read.

---

## 9. Storage environment

| Variable / surface | Automatic | Rebuild |
|--------------------|-----------|---------|
| Worker host | Render | Render |
| Blob token source | `BLOB_READ_WRITE_TOKEN` | same |
| Provider | Vercel Blob | same |
| Region/endpoint | same store | same |

**PRESENT_SAME** (no credential mismatch proven).

---

## 10. Object key

| Check | Automatic pre-fix | Rebuild |
|-------|-------------------|---------|
| Key | `final.mp4` | `final-v4.mp4` (when count=4) |
| Existing object | yes (200) | v4 created fresh |
| Overwrite | disallowed | allowed |
| Storage error surfaced | `Final video upload failed.` | — |

---

## 11. File stream vs buffer

Both paths: `const body = await fs.readFile(mergedPath)` → Buffer upload.

**SAME**

---

## 12. Fix (minimal, proven)

Commit **`32abbba2`**:

1. `resolveFinalBlobVersionForUpload` — bump version when `existingRebuildCount > 0`
2. Automatic re-finalization uses `replaceFinalVideoBlobSafely` when version > 0
3. Legacy `final.mp4` path sets `allowOverwrite: true`

Tests: `final-upload-persist.test.ts` (13/13), `render-version-service.test.ts` (4/4).

**Deployment note:** merge+upload executes on **Render worker** (`Dockerfile.worker`). Vercel-only deploy is insufficient; worker must rebuild from `main` ≥ `32abbba2`.

---

## 13–17. Certification status

Post-fix automatic replay (run 10): still **`Final video upload failed.`** at progress 70 — worker parity gap (no `final-v5.mp4` object, `clean-v5` 404, `final.mp4` collision path consistent with pre-fix worker image).

**Normal-path Production certification:** **NOT PASSED**

```
TARGET_B_AUTOMATIC_FINALIZATION_BLOCKED
```

Rebuild success does **not** upgrade verdict (addendum B/E).

---

## Artifacts

- `TARGET-B-FIRST-DIVERGENCE-CAPTURE.json`
- `AUTOMATIC-FINALIZATION-VERIFICATION.json`
- `auto-merge-cert-run-3.log` … `auto-merge-cert-run-10.log`
- `INSTANT-MERGE-PRODUCTION-CERT.json` (rebuild forensic contrast)
