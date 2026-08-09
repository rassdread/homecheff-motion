# Studio Audio — GenerationJob Coverage (S.7A)

---

## Catalog vs wired

Capabilities exist in generation catalog / Matrix. Wiring differs.

| Capability | Matrix ID | Matrix compliance | StudioGenerationJob wired? | Actual execution |
|------------|-----------|-------------------|----------------------------|------------------|
| Voice TTS | `VOICE_TTS` | MATRIX_PARTIAL | **YES** | `POST …/storyboards/[id]/voice` |
| Voice Clone | `VOICE_CLONE` | MATRIX_PARTIAL | **NO** | Bare `runBilledProviderRoute` |
| Music | `MUSIC_GENERATE` | MATRIX_PARTIAL | **NO** | Bare audio-library generate-music |
| SFX | `SFX_GENERATE` | MATRIX_PARTIAL | **NO** | Bare generate-sfx |
| Subtitles / STT | `SUBTITLE_TRANSCRIBE` | LEGACY_UNMIGRATED | **NO** | Bare transcribe route (`SUBTITLE_GENERATE` capability name) |
| Translate | `TRANSLATE_EXPORT` | LEGACY_UNMIGRATED | **NO** | Instant language-exports |
| Publish export | `PUBLISH_EXPORT` | LEGACY_UNMIGRATED | **NO** | Publish product paths |

Also wired (non-audio): IMAGE_GENERATE, VIDEO_GENERATE, FUSION_RENDER.

---

## VOICE_TTS job behavior (reference)

- Idempotency key (route + fallback `voice_tts:{id}:{lang}`)
- `chargeFinalized` once
- Replay succeeded job
- 409 while generating
- Paid retry requires new key (ADR-008)

---

## Gap

Five audio-adjacent capabilities are **catalogued for jobs** but remain **bare billed routes** — higher double-click charge risk and weaker Continuity→Matrix→Transform discipline.

S.7B should normalize without changing prices.
