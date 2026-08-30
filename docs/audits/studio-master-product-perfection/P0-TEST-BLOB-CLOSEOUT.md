# P0 — `/api/test-blob` Security Closeout

**Date:** 2026-08-30  
**Verdict:** `P0_1_TEST_BLOB = CLOSED`

## Root cause

`src/app/api/test-blob/route.ts` was a leftover blob smoke helper: unauthenticated `POST` called `uploadPublicBlob` and returned a public Vercel Blob URL. No session, admin, or environment gate.

## Route intent

Development / ops smoke only. Not part of Quick Video, Free Music, Studio, Motion, billing, or any product workflow.

## Reference scan

| Location | Result |
|---|---|
| App source (`src/`) | Only the route file itself (removed) |
| Tests / scripts | No callers |
| Docs | Audit mentions only |

**Conclusion:** Safe to **REMOVE**.

## Remediation

**REMOVED** `src/app/api/test-blob/` entirely. No gated replacement.

## Similar-route scan (bounded)

| Path | Auth | Mutating upload? | Prod note |
|---|---|---|---|
| `/api/test-blob` | none | yes (public blob) | **CLOSED** |
| `/api/admin/.../playback-debug` | admin | no | OK |
| `/api/admin/.../assembly-diagnostics` | admin | no | OK |
| `/api/admin/.../brand-qa-diagnostics` | admin (anon POST 401) | no | OK |
| `/api/instant-premium/preview-text-mask` | admin or test/dev | yes | Auth gated — not P0 |
| `/api/uploads/images` | `requireActiveUser` | yes | OK |
| `/api/health`, `/api/meta/build` | public read | no | OK |

No second equivalent unauthenticated Production mutating test-upload route proven.

## Audit-created blob cleanup

| Field | Value |
|---|---|
| Identified URL | `…/test/homecheff-motion-1788096842045-UULs39UB42NciMifKCD2jkZKgmagRd.txt` |
| Action | `del()` with `BLOB_READ_WRITE_TOKEN` |
| Result | **DELETED** |

`AUDIT_TEST_BLOB_CLEANUP = DONE` (only the known probe object).

## Files changed

- DELETE `src/app/api/test-blob/route.ts`
- ADD `src/lib/security/p0-test-blob-close.test.ts`
- UPDATE `package.json`
- UPDATE this closeout + `SECURITY-EXPOSED-TEST-ROUTES.md`

## Tests / quality

| Gate | Result |
|---|---|
| `p0-test-blob-close.test.ts` | 2/2 PASS |
| `npx next typegen` | PASS (no test-blob validators) |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |

## Production verification

| Field | Value |
|---|---|
| SHA | `989bd0935d6a6c6607a0f9ec4324b7372957d40c` |
| Deployment ID | `dpl_A7fkyLxvxJ21gtaZckihRHsizPtw` |
| POST `/api/test-blob` | **404** |
| GET `/api/test-blob` | **404** |
| Storage mutation | **None** (no 200, no blob URL) |

## Remaining P0 security issues

None proven in the bounded similar-route scan.

## Commercial-freeze blocker

**P0-1 CLOSED.** Broader Product Perfection Sprint is still required for P1 IA/commercial items — not started here.
