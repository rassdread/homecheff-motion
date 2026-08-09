# Studio Audio Foundation (S.7B)

**Date:** 2026-08-09  
**Branch:** `feat/studio-s7b-audio-foundation`  
**Depends on:** S.7A Audio Ecosystem Audit (frozen)

---

## Product law (audio)

```
Character owns Character voice identity
Storyboard owns narration defaults
Scene owns scene-specific audio intent (planning)
Project/Storyboard owns project-wide music/mix
Asset Library owns reusable audio assets
GenerationJob owns billable generation execution
Credits/Billing remain server-authoritative
```

Global Studio law still applies: Continuity → Matrix → Creative Director → Provider Transform → Generation.

---

## What S.7B delivered

| Area | Status |
|------|--------|
| Canonical ownership contracts | LIVE (`studio-audio-ownership.ts`) |
| Dual voice SoT precedence | LIVE (`resolveVoiceIdentity`) |
| Character voice lock | Locked Character cannot be silently overridden |
| Audio Continuity extension | LIVE (`ContinuityBundle.audio`) |
| AudioSpecification | LIVE (provider-neutral) |
| ElevenLabs transform boundary | LIVE (`studio-audio-provider-transforms.ts`) |
| VOICE_TTS GenerationJob | Unchanged (regression protected) |
| VOICE_CLONE GenerationJob | Normalized + idempotent |
| MUSIC_GENERATE GenerationJob | Normalized + idempotent |
| SFX_GENERATE GenerationJob | Normalized + idempotent (user-scope bed) |
| Cache-hit policy | Explicit `CACHE_HIT_NO_CHARGE` |
| Admin/internal bypass class | Explicit; normal user ≠ free bypass |
| Mix contract | Formalized static beds |
| Brand audio | Contract only (`wired: false`) |
| Dubbing / AI lip-sync | Honestly `NOT_IMPLEMENTED` |
| Credit prices | **Unchanged** |

---

## Honest limitations preserved

- Scene SFX cues are planning metadata — render supports **one** looped bed
- Project music is **one** bed — not per-scene stems
- Ambience is an **SFX subtype**
- Translation = overlay/export — **not** dubbing
- Mouth overlay = amplitude — **not** AI lip-sync
- Character voice continuity strength: improved contracts/tests; claim STRONG only when E2E cert proves it

---

## Code map

| Module | Role |
|--------|------|
| `src/lib/studio-audio-ownership.ts` | Ownership + cache + bypass class |
| `src/lib/studio-audio-voice-resolver.ts` | Voice precedence |
| `src/lib/studio-audio-specification.ts` | AudioSpecification |
| `src/lib/studio-audio-continuity.ts` | Continuity audio builder |
| `src/lib/studio-audio-provider-transforms.ts` | ElevenLabs boundary |
| `src/lib/studio-audio-mix-contract.ts` | FFmpeg mix contract |
| `src/lib/studio-audio-director-boundary.ts` | CD audio functions |
| `src/server/studio-generation/run-audio-generation-job-route.ts` | Job wrapper |

---

## Next

S.7E — Subtitles & Translation (certified separately).  
S.8 — Billing, Credits & Financial Audit (after S.7E GO).
