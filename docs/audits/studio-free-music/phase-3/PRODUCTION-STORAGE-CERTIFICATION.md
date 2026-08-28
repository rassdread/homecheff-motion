# Production Storage Certification

**Status:** PARTIAL — local masters verified; Vercel Blob upload not executed this session.

## Architecture

- Master path: `music/master/{trackId}.{ext}`
- Preview path: `music/preview/{trackId}.{ext}` (same bytes Phase 3; separate key for ACL evolution)
- Evidence: `src/data/free-music/evidence/` (private, not served via catalog API)
- Upload tooling: `scripts/free-music-phase3-upload.ts` (idempotent via `blob-upload.ts`)

## Local verification (2026-08-28)

- 55/55 local masters in `tmp/free-music-masters`
- 55/55 SHA-256 match registry `sourceFileHash` and `storedMasterHash`
- 0 hash mismatches, 0 orphans, 0 duplicates

## Production gate (pending)

Run with `BLOB_READ_WRITE_TOKEN`:

```bash
npx tsx scripts/free-music-phase3-upload.ts --pilot-only
npx tsx scripts/free-music-phase3-upload.ts --all
```

Expected idempotent counts: `created | reused | failed`.

## Verdict

**SELF_HOSTING_CERTIFICATION: PARTIAL**
