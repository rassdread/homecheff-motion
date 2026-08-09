# Studio Audio — S.8 Billing Inputs (technical registry)

**Do not calculate margins in S.7B.** Prices and registry costs **unchanged**.

| Capability | Provider | Credit key | Registry cost | Provider billing unit | Execution path | GenerationJob | Cache policy | Bypass policy |
|------------|----------|------------|---------------|----------------------|----------------|---------------|--------------|---------------|
| Voice TTS | ElevenLabs | `voice_generation` | registry default | TTS chars / call | storyboard voice route → Job | YES | n/a (no free cache on TTS path) | ADMIN_ONLY / TEST_ONLY / INTERNAL_PIPELINE classified |
| Voice clone | ElevenLabs | `voice_clone` | **400 cr** (unchanged) | per clone | character/user clone → Job | YES (S.7B) | n/a | same |
| Music generation | ElevenLabs | `music_generation` | registry default | per generate | audio-library generate-music → Job | YES (S.7B) | `CACHE_HIT_NO_CHARGE` | same |
| SFX generation | ElevenLabs | `sfx_generation` | registry default | per generate | audio-library generate-sfx → Job | YES (S.7B) | `CACHE_HIT_NO_CHARGE` | same |
| Subtitle STT | ElevenLabs | `subtitle_transcription` | registry default | per transcription | legacy billed route | NO (deferred) | document in S.8 | same |
| Translation export | OpenAI | `translation_export` | registry default | per export | legacy billed route | NO (deferred) | — | same |
| Voice suggestion | OpenAI | `voice_suggestion` | registry default | per suggestion | planning | NO | — | same |
| Music suggestion | OpenAI | `music_suggestion` | registry default | per suggestion | planning | NO | — | same |

Observability for S.8: each audio GenerationJob correlates `actionType` + `capability` + `chargeFinalized` + `outputAssetId` + provider metering events.

No margin math here.
