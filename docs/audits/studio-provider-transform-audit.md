# Studio Provider Transform Audit (S.6D)

**Question:** Do prompts/params differ by provider? Where do transforms exist?

---

## 1. Runtime providers by experience

| Experience band | Runtime provider | Distinct transform? |
|-----------------|------------------|---------------------|
| Scene stills / asset refs / improve | OpenAI Images | Truncation/gating; edit if sourceImageUrl (transform path) |
| Vision / Style DNA / char analysis | OpenAI Vision | System JSON inspectors |
| Fusion / instruction / mask | OpenAI Images | Archetype prompts + negatives + preserve; image edit compose |
| Instant / Motion / VIDEO_GENERATE | Vidu | `vidu-prompt-budget`, compact motion, negatives, segment I2V URLs |
| Voice TTS / clone / STT | ElevenLabs | Voice IDs, language, not image prompt Matrix |
| Music / SFX | ElevenLabs | Thin text prompt |
| Translate / language export | OpenAI + render | Text translate + ffmpeg burn |
| Mock paths | Fake adapters | Cert only |

---

## 2. Provider-specific transforms (exist today)

| Transform | File / area | Used by |
|-----------|-------------|---------|
| Vidu prompt budget / compact | `vidu-prompt-budget.ts`, preflight | Instant, Motion handoff |
| Vidu negative safety line | deevid / motion polish libs | Video |
| Instant STYLE_PROMPTS / CHIP_INSTRUCTIONS | `instant-premium-prompt.ts` | Instant |
| Motion preset promptTemplate + negativePrompt | `motion-action-presets*.ts` | Instant preset cards |
| Fusion archetype + negativePromptLines | `editor-fusion-archetype-definitions.ts` | Fusion |
| Fusion preserve / brand rules | fusion prompt builders | Fusion |
| OpenAI image edit vs T2I branch | `openai-provider.ts` scene image | Transform-existing / fusion |
| ElevenLabs voice settings | voice provider / profiles | TTS |
| Planning-only provider IDs | `studio-provider-assignment.ts` | **Not** always runtime |

---

## 3. Where transforms do **not** exist

| Gap | Impact |
|-----|--------|
| Unified Provider Transform layer | Each stack rolls its own |
| ContinuityBundle → Vidu module map | Instant ignores Studio ContinuityBundle |
| ContinuityBundle → OpenAI ref pixels | Scene T2I text-only |
| Kling / Runway / Veo transforms | Plan vocabulary only |
| BrandKit → any provider | Unwired |

---

## 4. Prompt differs by provider?

| Pair | Differs? |
|------|----------|
| Same scene → OpenAI still vs Vidu motion | **Yes** — separate assemblers |
| Fusion vs scene still | **Yes** — archetype vs section builder |
| ElevenLabs vs OpenAI | **Yes** — different modality |
| Planned runway vs runtime Vidu | **Yes** — plan ≠ runtime |

---

## 5. S.6E implication

Prompt Matrix must emit **provider-neutral modules**;  
existing Vidu/Fusion/OpenAI code becomes **Transforms**.  
Do not delete current transforms — wrap them.
