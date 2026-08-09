# Studio Audio — S.8 Billing Inputs (technical registry)

**Do not calculate margins.** Prices and registry costs **unchanged** in S.7E.

## Core billable capabilities

| Capability | Provider | Credit key | Registry cost | Provider billing unit | Execution path | GenerationJob | Cache policy | Bypass policy | Duplicate-charge risk | Free-generation path |
|------------|----------|------------|---------------|----------------------|----------------|---------------|--------------|---------------|----------------------|----------------------|
| Voice TTS | ElevenLabs | `voice_generation` | registry default | TTS chars / call | storyboard voice → Job | YES | n/a | ADMIN/TEST/INTERNAL classified | Low (idempotency) | None intentional |
| Voice clone | ElevenLabs | `voice_clone` | **400 cr** | per clone | clone routes → Job | YES (S.7B) | n/a | same | Low | None |
| Music generation | ElevenLabs | `music_generation` | registry default | per generate | generate-music → Job | YES (S.7B) | `CACHE_HIT_NO_CHARGE` | same | Low | Library cache hit |
| SFX generation | ElevenLabs | `sfx_generation` | registry default | per generate | generate-sfx → Job | YES (S.7B) | `CACHE_HIT_NO_CHARGE` | same | Low | Library cache hit |
| Subtitle STT / generation | ElevenLabs | `subtitle_transcription` | registry default | per transcription | subtitles/transcribe billed route | **NO (deferred)** | document | same | **Medium** (bare route) | Reuse existing track |
| Subtitle edit | — | none (local) | 0 | — | PATCH subtitles | N/A | — | — | None | Edit is free |
| Subtitle export / burn-in | local FFmpeg | bundled with voice/render paths | — | CPU | burn-in / metadata_only | via render/voice jobs | — | — | Review in S.8 | metadata_only free of STT |
| Translation / localization export | OpenAI | `translation_export` | registry default | per export | language-exports billed route | **NO (deferred)** | — | same | **Medium** (bare route) | Replay approved export |
| Voice suggestion | OpenAI | `voice_suggestion` | registry default | per suggestion | planning | NO | — | same | Low | — |
| Music suggestion | OpenAI | `music_suggestion` | registry default | per suggestion | planning | NO | — | same | Low | — |

## Language / localization capabilities (S.7E prep — no price changes)

| Capability | Billable today? | Credit key | GenerationJob | Notes for S.8 |
|------------|-----------------|------------|---------------|---------------|
| Subtitle generation (STT) | YES | `subtitle_transcription` | NO | Wrap in Job recommended |
| Subtitle editing | NO | — | — | Server PATCH; ownership required |
| Subtitle export (SRT/ASS) | Often bundled | — | — | Confirm vs separate charge |
| Translation overlay | YES | `translation_export` | NO | Wrap in Job recommended |
| Localization of titles/captions/metadata | Via translation export | `translation_export` | NO | Same path as language export |
| Preview generation (language) | Policy TBD | — | — | Must not silently free paid path |
| Library replay / reuse | Should be free | — | — | Reuse ≠ regeneration (S.7E law) |
| Cache hits | Music/SFX yes | — | — | STT cache policy TBD in S.8 |
| Future dubbing | NOT_IMPLEMENTED | — | — | Reserve credit key later |
| Future lip-sync | NOT_IMPLEMENTED | — | — | Reserve credit key later |

## Ownership for S.8 observability

Correlate: `actionType` · Matrix/capability id · `chargeFinalized` · provider metering · `outputAssetId` / export id · ownerId.

No margin math here.
