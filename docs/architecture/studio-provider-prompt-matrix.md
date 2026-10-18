# Studio Provider ↔ Prompt Matrix (S.6A Discovery)

**Phase:** S.6A — discovery only. No provider or prompt changes.

## Runtime providers (actually called)

| Provider | Capabilities in production paths | Prompt format | Special notes |
|----------|----------------------------------|---------------|---------------|
| **OpenAI Images** | Scene stills, asset refs, improve/regen, editor edit/fusion | Free-text prompt string | Truncation/gating in `openai-image-generation.ts`; mock via `STUDIO_SCENE_IMAGE_PROVIDER` |
| **OpenAI Vision** | Scene vision, Style DNA, character ref analysis | System + user JSON inspectors | Separate from generation matrix |
| **OpenAI (translate / assistant)** | Instant language export; assistant interpret | Chat completions | TRANSLATE not on StudioGenerationJob |
| **Vidu** | Motion / VIDEO_GENERATE async | Budgeted compact motion prompt | `vidu-prompt-budget`, preflight, comic-strip transitions |
| **ElevenLabs TTS** | Storyboard voice, character previews | Script + voice settings (not image prompt) | Language match via voice profiles |
| **ElevenLabs Clone** | Voice clones | Sample audio | No text prompt matrix |
| **ElevenLabs Music / SFX** | Audio library generate | Short text prompt + director plan | Not on S.4 job |
| **ElevenLabs STT** | Subtitle transcription | Audio URL | No prompt matrix |
| **Mock adapters** | Scene image, video, voice, STT, vision | Passthrough / fake | Cert & offline |

## Planning registry providers (not always live)

`studio-provider-assignment.ts` / `studio-provider-registry` planning defaults:

| Asset type | Default plan id | Fallback chain (plan) | Premium override |
|------------|-----------------|----------------------|------------------|
| image | `openai_images` | registry candidates | — |
| video | `vidu` | vidu → kling → runway | `qualityProfile=premium` → runway |
| voice | `elevenlabs` | elevenlabs → openai_voice → azure_voice | language match |
| music | `suno` | planning only | — |
| sound | `freesound` | economy → freesound | — |

**Important:** Planning IDs (`suno`, `kling`, `runway`, `azure_voice`) are **capability/plan vocabulary**. Live Studio generation today is dominated by OpenAI + Vidu + ElevenLabs. Flux / Imagen / Replicate appear in cost inventory / editor lab contexts — **not** as the Studio scene prompt matrix SoT.

## S.4 capability → default adapter

From `studio-generation-capabilities.ts`:

| Capability | defaultAdapterId | Job wired? |
|------------|------------------|------------|
| IMAGE_GENERATE | `openai_image` | **Yes** |
| IMAGE_EDIT | `openai_image` | No (orphan) |
| VIDEO_GENERATE | `vidu_motion` | **Yes** |
| VOICE_TTS | `elevenlabs_tts` | **Yes** |
| VOICE_CLONE | `elevenlabs_clone` | No |
| MUSIC_GENERATE | `elevenlabs_music` | No |
| SFX_GENERATE | `elevenlabs_sfx` | No |
| TRANSLATE | `openai_translate` | No |
| SUBTITLE_GENERATE | `elevenlabs_stt` | No |
| RENDER | `vidu_motion` | No (alias orphan) |
| FUSION_RENDER | `openai_image` | **Yes** |
| VISION_ANALYZE | `openai_vision` | No |

## Provider optimization coverage (per capability)

| Capability | Classification | Evidence |
|------------|----------------|----------|
| IMAGE_GENERATE | Mostly **generic** + quality/identity layers | OpenAI free text; no Flux/Imagen syntax |
| IMAGE_EDIT | **Provider_specific** (OpenAI edits) / legacy paths | Editor + improve as scene regen |
| VIDEO_GENERATE | **Provider_optimized** (Vidu budget/compact) | Parallel Instant stack also Vidu-aware |
| VOICE_* | Provider settings, not prompt matrix | ElevenLabs voice IDs / params |
| MUSIC/SFX | Thin text + plan | ElevenLabs |
| FUSION_RENDER | **Provider_specific** OpenAI + archetype negatives | Editor builders |
| VISION_ANALYZE | **Provider_specific** system prompts | OpenAI vision |
| TRANSLATE / SUBTITLE | Outside scene matrix | Instant / STT |

## Prompt overrides & fallbacks

| Mechanism | Behavior |
|-----------|----------|
| Env mock providers | Bypass live model; fake outputs |
| Provider assignment language match | Swap voice provider if language unsupported |
| Video premium plan | Prefer runway in **plan** (may not equal runtime adapter) |
| Vidu budget | Truncate/dedupe blocks when over limit |
| Fake S.4 adapter | Tests / cert harness |

## Gaps for Prompt Matrix

- No single provider-adapter prompt transform layer (generic → Vidu / OpenAI / future Flux).  
- Planning providers ≠ runtime adapters for several types.  
- Negative prompts exist for Vidu/Motion/Editor archetypes but not as a shared Studio module.  
- `StudioPromptPreset` cannot yet store per-provider variants.
