# Instant Merge — Production Certification

## Deploy

Commit `90926699` on Production (Vercel).

## Provider-free rebuild test

Script: `scripts/_full-studio-cert-merge-prod.ts`  
Evidence: `INSTANT-MERGE-PRODUCTION-CERT.json`

| Check | Result |
|-------|--------|
| Project | `cmt5hnj1s0003jh09hns3vu4v` (existing Rode loper clips) |
| `rebuild-final-video` HTTP | 200 |
| Elapsed | ~23s |
| Final URL | Present |
| Status after | `completed` / 100% |
| Vidu calls | 0 |
| Credit capture | 0 (rebuild only) |

## Automatic path

Fix ensures status-triggered `orchestrateFinalMerge` polls like rebuild. **End-to-end automatic path** (fresh Vidu → merge without manual rebuild) was **not re-run** on Production in this slice (provider budget). Rebuild path proves worker merge + completion polling at deploy SHA.

Per [CERTIFICATION-EVIDENCE-POLICY.md](./CERTIFICATION-EVIDENCE-POLICY.md) addendum B/E: rebuild success is **recovery evidence only** and does **not** satisfy Target B certification. Certification requires GET `/status` → full chain (upload + persisted `finalVideoUrl` + completed version + playable).

## Classifications

| Gate | Status |
|------|--------|
| INSTANT_MERGE_TRIGGER | WORKING |
| INSTANT_MERGE_RECOVERY | WORKING |
| INSTANT_MERGE_IDEMPOTENCY | WORKING |
| RODE_LOPER_FINALIZATION | PARTIAL |

PARTIAL: automatic first-time finalization not re-proven with a new Vidu run; rebuild + fix address the observed stall class.
