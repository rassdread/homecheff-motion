# Studio Audio — S.8 Billing Inputs (preparation only)

**Do not calculate margins in S.7A.** List of billable audio capabilities for later S.8 financial audit.

| Capability | Provider | Pricing unit (technical) | Credit key | Source location |
|------------|----------|--------------------------|------------|-----------------|
| Voice TTS / preview | ElevenLabs | Per generation (reserved USD→credits) | `voice_generation` | `studio-action-cost-registry.ts` |
| Voice clone | ElevenLabs | Per clone | `voice_clone` (**400 cr** override) | same |
| Subtitle STT | ElevenLabs | Per transcription | `subtitle_transcription` | same |
| Music generation | ElevenLabs | Per generate | `music_generation` | same |
| SFX generation | ElevenLabs | Per generate | `sfx_generation` | same |
| Translation / language export | OpenAI | Per export | `translation_export` | same |
| Voice planning suggestion | OpenAI | Per suggestion | `voice_suggestion` | same |
| Music planning suggestion | OpenAI | Per suggestion | `music_suggestion` | same |

Also note for S.8:

- Cache-hit free paths (preview/music/SFX)
- Admin / production-chain bypasses
- Multi-call TTS under single `voice_generation` bill
- Provider cost telemetry (`elevenlabs_tts|stt|clone|music|sfx`) with `skipBillingSync`

No margin math here.
