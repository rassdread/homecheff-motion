# Studio S.4 — AI Pipeline Audit

**Branch:** `refactor/studio-s4-generation-orchestration`  
**Base:** `21a759c6` (S.3 GO on main)  
**PR:** #5

## Inventory summary

Live providers: OpenAI (image/vision), ElevenLabs (voice/music/SFX/STT), Vidu (motion), ffmpeg (publish). Registry lists Replicate for some image actions but runtime uses OpenAI.

## Fragmentation (resolved / adapted)

| Item | Class | S.4 action |
|------|-------|------------|
| StudioJob bulk unbilled generate | RISKY | Fixed — bill per step |
| Dual fusion/variant paths | DUPLICATE | Fusion render on GenerationJob; share adapter later |
| Orphan registry keys | LEGACY | Catalog classification; no fake routes |
| Scene image sync vs job vs bulk | DUPLICATE | Canonical job on sync route |
| Voice bypassed orchestrator | RISKY | Migrated to VOICE_TTS job |
| Video scattered poll | RISKY | Vidu adapter + GenerationJob on start/poll |
| Fusion credit without job | RISKY | FUSION_RENDER job + chargeFinalized |

## Implemented

- `StudioGenerationJob` schema + additive migration  
- Status / errors / capability registry  
- Orchestrator (sync + async + cancel + technical retry)  
- Image / Voice / Fusion sync routes  
- Video start/poll async path + `vidu_motion` adapter  
- Job GET refresh, history list, cancel, recover  
- Client poller + render prerequisite gate  
- Fake adapter harness + contract tests  
- ADRs 006–008 + architecture docs  

## Voice audit (pre-migration → now)

| Item | Was | Now |
|------|-----|-----|
| Provider | ElevenLabs / mock | same via adapter body |
| Credit action | `voice_generation` | same + job.chargeFinalized |
| Status | implicit HTTP | canonical GenerationJob |
| Retry | resubmit | technical vs new key |
| Persistence | StudioStoryboardVoice | + job.outputAssetId = voiceId |
| Target | storyboard | frozen storyboardId + language |
| Failure | HTTP error | FAILED + safe message |

## Video audit

| Item | Path |
|------|------|
| Provider | Vidu via animation-jobs |
| providerJobId | AnimationTransition + GenerationJob.providerJobId |
| Poll | jobs/poll → refreshAsyncGenerationJob |
| Credits | motion_render at project create (not on start) |
| Cancel | unsupported (honest) |

## PITR / migration

Additive table only. Before production migrate: confirm PITR/restore per HomeCheff governance.

| Field | Value |
|-------|-------|
| Project | frameflow-ai / homecheff-motion |
| Branch | refactor/studio-s4-generation-orchestration → main after merge |
| Migration | `20260808120000_studio_generation_job` |
| Destructive SQL | none |

## Preview / production certification

| Gate | Status |
|------|--------|
| Code migration voice/video/fusion | DONE (this slice) |
| Preview DB migrate | PENDING |
| Preview E2E refresh/resume/concurrency/credits | PENDING |
| PR #5 merge | PENDING |
| Production migrate + smoke | PENDING |

## Current gate

**NO-GO FOR S.5** until Preview GREEN + production smoke for full DoD.
