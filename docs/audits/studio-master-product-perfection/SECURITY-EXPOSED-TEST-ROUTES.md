# Security — exposed test routes

**Updated:** 2026-08-30 (P0 close)

## P0-1 — `/api/test-blob` — CLOSED

| Field | Value |
|---|---|
| Former file | `src/app/api/test-blob/route.ts` |
| Remediation | **REMOVED** (no Production dependency) |
| Closeout | `P0-TEST-BLOB-CLOSEOUT.md` |
| Regression | `src/lib/security/p0-test-blob-close.test.ts` |
| Audit blob cleanup | Known probe object **DELETED** |

## Related hygiene

- Trust full-studio cert from `FINAL-STUDIO-CERTIFICATION.md` (`STUDIO_FULL_PRODUCT_CERTIFIED`); stale JSON may still say BLOCKED — docs debt only.
- Bounded similar-route scan: no second unauthenticated public test-upload route found (admin debug routes auth-gated).
