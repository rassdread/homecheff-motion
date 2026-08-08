# Studio Provider Adapters (S.4)

**Status:** CANONICAL  
**ADR:** ADR-STUDIO-007

## Contract

```ts
start(input) → { providerJobId? | syncResult? }
getStatus?(providerJobId)
getResult?(providerJobId)
cancel?(providerJobId)
```

Adapters map provider status → Studio status. UI never sees raw provider enums unless diagnostics.

## Live adapters

| Adapter id | Capability | Notes |
|------------|------------|-------|
| `openai_image` | IMAGE_GENERATE | Via existing scene image service (sync billed body) |
| `elevenlabs_tts` | VOICE_TTS | Via `generateStoryboardVoice` (sync billed body) |
| `vidu_motion` | VIDEO_GENERATE | Wraps `startProjectJobs` / `pollProjectJobs`; **no cancel** |
| `openai_image` (fusion) | FUSION_RENDER | Local/product fusion path; job semantics aligned |
| `fake` | harness | CI: success / async_success / failure / timeout; cancel supported |

## Execution modes

| Mode | Use |
|------|-----|
| `sync` | OpenAI image, ElevenLabs TTS, Fusion wizard render |
| `async_poll` | Vidu motion transitions |
| `async_callback` | Export workers with signed callbacks (Motion export) |
| `local_process` | ffmpeg publish |

## Isolation rules

- No provider SDK imports from `"use client"` modules
- Client never sets credit cost
- Adapter id is diagnostic metadata, not user-facing product chrome (unless advanced model pick)
- Do not fake cancellation when provider cannot cancel

## Fake adapter

`createFakeProviderAdapter` supports CI harness modes: `success`, `async_success`, `failure`, `timeout`.

## Orphan / catalog capability keys

| Key | Class | Recommendation |
|-----|-------|----------------|
| IMAGE_GENERATE, VOICE_TTS, VIDEO_GENERATE, FUSION_RENDER, RENDER | ACTIVE | Keep |
| IMAGE_EDIT | FUTURE | Keep catalog |
| VOICE_CLONE, MUSIC_GENERATE, SFX_GENERATE, TRANSLATE, SUBTITLE_GENERATE, VISION_ANALYZE | LEGACY | Leave until route migration; do not delete |
