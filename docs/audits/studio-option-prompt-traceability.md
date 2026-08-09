# Studio Option → Prompt / Runtime Traceability

**Purpose:** Basis for any future Prompt Matrix.  
**Method:** Trace UI/enum → internal value → effect → provider.  
**Coverage:** All major option *families* from S.6A (~250+ values). Values within a family share the same wiring class unless noted.

## Classification

| Class | Meaning |
|-------|---------|
| FULLY_WIRED | User value reaches prompt/provider request as designed |
| PARTIALLY_WIRED | Reaches some path (prompt OR plan OR Motion) but not all / diluted |
| UI_ONLY | Shown but no runtime effect found |
| LEGACY | Old path; superseded or fallback-only |
| DEAD | Unreachable or no-op |
| UNKNOWN | Insufficient evidence |

---

## A. Director / style

| Option family | Values (summary) | Internal | Effect | Provider | Class |
|---------------|------------------|----------|--------|----------|-------|
| Director profile | 6 profiles | `directorProfile` | `buildDirectorProfilePrompt` + audio plan maps | Prompt text | FULLY_WIRED |
| Prompt style profile | 6 profiles | `promptStyleProfile` | `buildStyleProfilePrompt` | Prompt text | FULLY_WIRED |
| AI Director moods/strength | interpret tags | interpreter | Sets profiles/keys | Planning | PARTIALLY_WIRED |
| Story purpose V2 | 6 purposes | purpose patch | May patch shot/energy/emotion | Prompt if applied | PARTIALLY_WIRED |

## B. Camera / shot / energy

| Option family | Values | Effect | Class |
|---------------|--------|--------|-------|
| Shot type | 11 enums | `buildDirectorCameraPrompt` → scene prompt; Motion handoff | FULLY_WIRED (prompt); PARTIAL (provider camera API — none for OpenAI stills) |
| Camera movement | 11 enums | Same | FULLY_WIRED (prompt phrase); Motion interprets later |
| Scene energy | 4 enums | Prompt + performance multipliers | FULLY_WIRED |
| Legacy camera presets | 6 + custom | Mapped to shot types / `buildCameraPrompt` fallback | LEGACY / PARTIALLY_WIRED |
| Director V2 shot cards subset | 4 shots | UI subset of full enum | PARTIALLY_WIRED |
| Director V2 motion cards subset | 4 moves | UI subset | PARTIALLY_WIRED |
| Visual focus cards | 4 | Composition director display | UI_ONLY / PARTIAL (read-only) |

## C. Action / emotion

| Family | Effect | Class |
|--------|--------|-------|
| Action presets (8 + custom) | `ACTION_PHRASES` or raw text | FULLY_WIRED |
| Emotion presets (7 + custom) | emotion phrases | FULLY_WIRED |

## D. Duration

| Family | Values | Effect | Class |
|--------|--------|--------|-------|
| Scene duration | 1–120s | Timing / plans / handoff | FULLY_WIRED (timing); PARTIAL (video provider length) |
| Brief length v3 | short/med/long → 15/30/60 | Brief selection | PARTIALLY_WIRED (conflicts with other maps) |
| V11 duration chips | 15/30/60/90/auto | Wizard | PARTIALLY_WIRED |
| Long-form targets | 30s–10min | Plan scene counts | PARTIALLY_WIRED |
| Intent default durations | 30–300s | Defaults | PARTIALLY_WIRED |
| Motion preset durations | 5/8/12 | Motion Instant only | LEGACY w.r.t. Studio modules (0 studio* refs) |

**Conflict:** Multiple duration SoTs — classify system as PARTIALLY_WIRED overall.

## E. Aspect ratio

| Family | Effect | Class |
|--------|--------|-------|
| Studio user picker | **None** | DEAD / missing |
| Handoff / batch | Forced `9:16` | FULLY_WIRED (automatic) |
| Instant Premium aspect | `9:16` \| `16:9` | FULLY_WIRED on Instant path |

## F. Quality / cost / platform

| Family | Effect | Class |
|--------|--------|-------|
| Provider quality profile | draft/standard/premium | Provider **plan** (premium→runway plan) | PARTIALLY_WIRED (plan ≠ always runtime) |
| Cost profile | economy/balanced/quality | Plan sound→freesound | PARTIALLY_WIRED |
| Platform (IG/TikTok) | phrase detection | Intent only | PARTIALLY_WIRED |
| Hardcoded QUALITY_INSTRUCTIONS | always on | Prompt | FULLY_WIRED (not user option) |

## G. Brief / V11 / intent

| Family | Effect | Class |
|--------|--------|-------|
| Goals, tones, pace, audience, narrative | Suggestions / enrichment | PARTIALLY_WIRED |
| V4 emotions / visual styles | Brief v4 | PARTIALLY_WIRED |
| Video intents (15) | Director profile + duration defaults | PARTIALLY_WIRED |
| AI everything flag | Automation flag | PARTIALLY_WIRED / UNKNOWN depth |

## H. Character identity options

| Family | Effect | Class |
|--------|--------|-------|
| Role / identity type / styles / shape / energy / personality / outfit / accessories / colors | Stored → identity prompt lines when character linked | FULLY_WIRED (to prompt text when attached) |
| Identity / continuity strength | Memory prompt hints | FULLY_WIRED |
| Reference image | Required create; metadata + vision; **not** scene T2I pixels | PARTIALLY_WIRED |
| Wizard chips | Prefill fields | FULLY_WIRED → fields |
| Age/gender | brief enums vs free text extraction | PARTIALLY_WIRED |
| Performance / mouth / idle | Motion handoff / performance | PARTIALLY_WIRED |
| Voice fields / lock | TTS / handoff | PARTIALLY_WIRED |

## I. Location / world / prop

| Family | Effect | Class |
|--------|--------|-------|
| Location category | Taxonomy + hints | FULLY_WIRED |
| Location/world lighting enums | Identity prompt lines | FULLY_WIRED (text); enum drift across wizards |
| World music/ambience/style/tone | Plans + prompt extras | PARTIALLY_WIRED |
| Prop category / brandingRules | Prompt | FULLY_WIRED (text) |
| Supporting refs in notes | Text + vision | PARTIALLY_WIRED |

## J. Audio options

| Family | Effect | Class |
|--------|--------|-------|
| Voice languages | TTS language match | FULLY_WIRED |
| Voice / music / sound / audio mix profiles | Director plans → gen tags / mix | PARTIALLY_WIRED |
| Music/SFX generate prompt | ElevenLabs | FULLY_WIRED (thin) |
| Subtitle style chips | Missing in Studio | DEAD / missing |
| Subtitle export mode | Motion export | PARTIALLY_WIRED |

## K. Motion action presets (65)

| Family | Effect | Class |
|--------|--------|-------|
| Motion action preset IDs | Instant Motion templates | FULLY_WIRED on Instant; **LEGACY/UNUSED in Studio modules** |

## L. Fusion preservation / intents

| Family | Effect | Class |
|--------|--------|-------|
| Fusion intents + defaultPreservation | Prompt preserve rules + OpenAI edit | FULLY_WIRED |
| Simulation intents | Marked simulation | EXPERIMENTAL / PARTIAL |

## M. S.5 Brand / Presets

| Family | Effect | Class |
|--------|--------|-------|
| BrandKit fields | Stored only | UI_ONLY / storage (API live, gen dead) |
| PromptPreset fields | Stored only | UI_ONLY / storage |

---

## Aggregate counts (value-level estimate)

| Class | Est. share of ~250+ values |
|-------|----------------------------|
| FULLY_WIRED | ~35–45% (especially when entity linked / phrase maps) |
| PARTIALLY_WIRED | ~40–50% (plans, handoff, vision-not-gen, duration drift) |
| UI_ONLY / storage | ~5–10% (BrandKit, PromptPreset, some cards) |
| LEGACY | ~5–10% (legacy camera, Motion presets in Studio, classic-only) |
| DEAD / missing | ~2–5% (Studio aspect picker, subtitle style) |
| UNKNOWN | <5% |

---

## Critical wiring gaps (product DNA)

1. Character/location/prop **reference pixels → scene IMAGE_GENERATE** = PARTIAL (metadata + vision only).  
2. **BrandKit / PromptPreset → generation** = not wired.  
3. **Planning providers (runway/suno/kling)** often ≠ runtime.  
4. **Duration maps** disagree.  
5. New scenes **do not inherit** prior scene links (manual continuity).
