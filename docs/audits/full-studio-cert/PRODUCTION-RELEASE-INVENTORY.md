# PRODUCTION RELEASE INVENTORY — FULL_STUDIO_CERT_CLOSEOUT

**Date:** 2026-08-21  
**Base HEAD:** `b9eaf7df` (Slice 1B / PX.4A.7 era)  
**Schema:** NO Prisma migration (verified)

## Classification

### A — REQUIRED S2 CERTIFICATION STACK (include)

| Layer | Paths (summary) | Schema | Provider | Billing |
|-------|-----------------|--------|----------|---------|
| S2A UPC | `studio-unified-production-context*`, fingerprint, spine-trace, prompt-orchestrator | No | No | No |
| S2B.1–4 | `studio-image-transformation*`, clothing/location/product-logo runtimes, scene-rerender, transform-qa, reference-budget, openai-provider edits, scene-image-service, fusion execute | No | Yes (image routes) | No |
| S2C | preset lifecycle/materialization, continue-in-studio, preset-materialize API | No | No | No |
| S2E + P1 | audio timeline/mix/ffmpeg/ducking/assets, apply-studio-voice-export, confidence | No | Mix only | No |
| S2F | production-stages, stage-nav, workspace-shell/tool-strip/href/place | No | No | No |
| S2G | finish types/resolve/adapters/hub | No | No | No |
| S2H | project-status, project-library, `/api/studio/projects`, my-projects UI, projects page + packages | No | No | No |
| i18n | en.ts / nl.ts (finish/projects/stage keys) | No | No | No |
| Tests | `studio-s2*.test.ts`, package.json test list | No | No | No |
| Cert docs | `docs/audits/full-studio-cert/**` | No | No | No |

### B — RELATED CERT INFRASTRUCTURE (include)

- `docs/audits/full-studio-cert/*` closeout prep

### C — UNRELATED — MUST EXCLUDE

| Path | Why |
|------|-----|
| `src/app/account/wallet/**` | HC wallet UI |
| `src/app/api/me/hc-wallet/**` | HC wallet API |
| `src/components/hc/**` | HC wallet pill |
| `src/lib/hc-studio-flags.ts` | HC billing flags |
| `src/server/studio-account/hc-*` | HC central adapter / reconciliation |
| `src/server/studio-account/studio-hc-billing-foundation.test.ts` | HC billing tests |
| Modified `studio-wallet-service`, `studio-credit-authorization`, billing banners, account dashboard/nav | Unrelated HC wallet work |
| `src/server/animation-jobs/motion-credit-settlement.ts` | Billing settlement |
| `docs/audits/px4a*`, `slice1b-cert` binary dumps, probe scripts | Prior cert artifacts / noise |
| `scripts/_px4a*` probes | Not required for S2 release |

### D — UNKNOWN / review before include

- Touches to `animations/projects` routes / `create-and-generate` — include only if diff is S2 handoff/audio-related; otherwise exclude.

## Deploy note

No in-repo BCPD script. Production deploy expected via **git push → Vercel** for `studio.homecheff.eu`.
