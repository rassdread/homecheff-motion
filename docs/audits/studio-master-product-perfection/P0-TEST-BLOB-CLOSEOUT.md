# P0 — `/api/test-blob` Security Closeout

**Date:** 2026-08-30  
**Status:** Remediation shipped locally; Production probe recorded after deploy  

## Root cause

`src/app/api/test-blob/route.ts` was a leftover blob smoke helper: unauthenticated `POST` called `uploadPublicBlob` and returned a public Vercel Blob URL. No session, admin, or environment gate.

## Route intent

Development / ops smoke only. Not part of Quick Video, Free Music, Studio, Motion, billing, or any product workflow.

## Reference scan

| Location | Result |
|---|---|
| App source (`src/`) | Only the route file itself (removed) |
| Tests / scripts / package.json | No callers |
| Docs | Audit mentions only |
| Deploy logs | Historical build listings of `/api/test-blob` |

**Conclusion:** Safe to **REMOVE** (preferred remediation).

## Remediation

**REMOVED** `src/app/api/test-blob/` entirely. No gated replacement.

## Similar-route scan (bounded)

| Path | Auth | Mutating upload? | Prod note |
|---|---|---|---|
| `/api/test-blob` | none | yes (public blob) | **CLOSED** (removed) |
| `/api/admin/.../playback-debug` | admin | no | OK |
| `/api/admin/.../assembly-diagnostics` | admin | no | OK |
| `/api/admin/.../brand-qa-diagnostics` | admin (POST → 401 anon) | no upload | OK |
| `/api/instant-premium/preview-text-mask` | admin or test/dev mode | yes | Auth gated — not equivalent P0 |
| `/api/uploads/images` | `requireActiveUser` | yes | OK |
| `/api/health`, `/api/meta/build` | public read | no | OK |

No second unauthenticated Production mutating test-upload route proven.

## Audit-created blob cleanup

| Field | Value |
|---|---|
| Identified URL | `https://it3xt8um5uqzpebe.public.blob.vercel-storage.com/test/homecheff-motion-1788096842045-UULs39UB42NciMifKCD2jkZKgmagRd.txt` |
| Action | `del()` via `BLOB_READ_WRITE_TOKEN` |
| Result | **DELETED** |
| Other blobs | Not bulk-scanned / not deleted |

`AUDIT_TEST_BLOB_CLEANUP = DONE` (single known probe object only)

## Files changed

- DELETE `src/app/api/test-blob/route.ts`
- ADD `src/lib/security/p0-test-blob-close.test.ts`
- UPDATE `package.json` (include regression test)
- UPDATE audit docs (this file + `SECURITY-EXPOSED-TEST-ROUTES.md`)

## Tests

- `npx tsx --test src/lib/security/p0-test-blob-close.test.ts` → **2/2 PASS**
- `npx next typegen` → regenerates validators without test-blob
- `npx tsc --noEmit` → **PASS**
- `npm run build` → (recorded below)

## Production verification

Filled after deploy:

| Field | Value |
|---|---|
| SHA | _pending_ |
| Deployment ID | _pending_ |
| POST `/api/test-blob` | _pending_ |
| Storage mutation | _pending_ |
