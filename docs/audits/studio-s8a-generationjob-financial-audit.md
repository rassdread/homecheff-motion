# S.8A — GenerationJob Financial Audit

**Date:** 2026-08-09 · **Read-only**  
**ADRs:** ADR-STUDIO-006, ADR-STUDIO-008

## Capability matrix (financial)

| Capability | actionType | Job wired? | Notes |
|------------|------------|------------|-------|
| IMAGE_GENERATE | scene_generation | YES | Single scene image |
| FUSION_RENDER | fusion_render | YES | Editor fusion |
| VOICE_TTS | voice_generation | YES | Storyboard voice |
| VOICE_CLONE | voice_clone | YES | S.7B |
| MUSIC_GENERATE | music_generation | YES | S.7B + cache skip |
| SFX_GENERATE | sfx_generation | YES | S.7B + cache skip |
| VIDEO_GENERATE | motion_render | YES track-only | Often `chargeOnThisJob: false`; charge at project create |
| SUBTITLE_GENERATE | subtitle_transcription | **NO deferred** | Bare route |
| TRANSLATE | translation_export | **NO deferred** | Bare route |
| IMAGE_EDIT | image_edit | NO catalog only | Bare editor routes |
| VISION_ANALYZE | vision_analysis | NO catalog only | Bare routes |
| RENDER | motion_render | NO separate | Overlaps VIDEO |

## Job financial behaviours

| Concern | Truth |
|---------|-------|
| Owner | `StudioGenerationJob.ownerId` = session user |
| Credit responsibility | Same user wallet via `billProviderAction` |
| Provider responsibility | `providerAdapter` + `providerJobId` |
| Idempotency | unique `(ownerId, idempotencyKey)`; resume/replay |
| chargeFinalized | once per successful capture |
| Technical recover | no recharge |
| New paid retry | new idempotency key |
| Cache | music/SFX skipCapture → creditsCharged 0 |

## Bare billed (high priority for S.8B)

STT · translation · bulk/improve scene images · voice preview · motion create/instant/segment retry · vision · OCR · assistant interpret · publish exports · asset-reference generate · editor image paths

Static list: `src/lib/credit-enforcement-audit.ts`.

## Status

**PASS as Product Truth** — gaps documented honestly.
