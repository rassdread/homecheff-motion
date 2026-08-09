# Studio Audio — Product Truth (S.7A)

**Date:** 2026-08-09  
**Mode:** READ-ONLY forensic  
**HEAD:** `e9024814` (`main`)  
**Depends on:** S.6 Continuity / Prompt Matrix / Creative Director / Consumer Experiences COMPLETE  

---

## What Studio Audio is today

Studio Audio is a **real, partially unified** ecosystem:

| Domain | Reality |
|--------|---------|
| **Voice TTS** | LIVE — ElevenLabs (or mock); storyboard narration + character preview |
| **Voice Clone** | LIVE — ElevenLabs IVC + consent; Character / user library linkage |
| **Character voice identity** | STRONG ownership on Character; PARTIAL continuity into narrator/render |
| **Music generation** | LIVE — ElevenLabs music → user audio library → optional mix bed |
| **SFX generation** | LIVE — ElevenLabs SFX → library → optional single looped bed |
| **Music / Sound Directors** | LIVE planning + handoff metadata — **do not generate audio** |
| **Subtitles / STT** | LIVE — ElevenLabs STT + TTS-timed entries; edit; Motion burn-in |
| **Translation** | LIVE for **overlay / language-export text** (OpenAI) — not dubbing |
| **Audio mix** | LIVE FFmpeg: voice ± 1 music bed ± 1 SFX bed; static ducking; music fades |
| **Dubbing** | ABSENT as product (PARTIAL localization pieces only) |
| **AI lip-sync** | ABSENT — amplitude mouth overlay only |
| **Experience Packs** | ENGINE_ONLY — no Voice/Music/SFX/Subtitle consumer packs yet |

There are **no dedicated** `/studio/voice`, `/studio/music`, or `/studio/audio` app routes. Audio lives inside Adaptive Workspace tools, Character forms, Classic editor panels, Instant/Motion handoff, Videos detail, and Publish voice.

---

## Product law (unchanged)

```
Continuity owns identity
  → Prompt Matrix assembles
  → Creative Director orchestrates
  → Provider Transform is last
  → Generation executes
```

**Audio truth today:** most audio routes **bypass** ContinuityBundle → Matrix → Transform. Only **VOICE_TTS** uses `StudioGenerationJob`. Clone / music / SFX / STT / translate are **bare billed routes**.

---

## Runtime providers (not planning labels)

| Capability | Runtime |
|------------|---------|
| TTS | ElevenLabs (`elevenlabs-voice.ts`) |
| STT | ElevenLabs scribe_v2 |
| Voice clone | ElevenLabs IVC |
| Music / SFX | ElevenLabs music + sound-generation APIs |
| Mix / mux / burn-in | FFmpeg (server) |
| Language overlay translate | OpenAI |
| OpenAI TTS / Whisper | **Not used** |
| ElevenLabs Dubbing API | **Not integrated** |

Planning registries may mention providers that are not runtime — never confuse them.

---

## What Studio Audio is not (yet)

- A fully Matrix-native audio stack
- True multilingual dubbing
- Phoneme / viseme lip-sync
- Per-scene timed SFX designer (UI may suggest scene; render is one bed)
- BrandKit-driven auto audio injection
- Consumer Experience Packs for Voice/Music/SFX/Subtitles

---

## Related docs

- `docs/architecture/studio-audio-ownership.md`
- `docs/architecture/studio-audio-continuity.md`
- `docs/architecture/studio-audio-non-negotiables.md`
- `docs/audits/studio-s7a-audio-ecosystem-audit.md`
