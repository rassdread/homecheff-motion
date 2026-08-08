# Studio S.6A — Prompt Matrix Audit & Creative Director Discovery

**Branch:** `docs/studio-s6a-prompt-matrix-audit`  
**Base commit:** `a0e28e1c`  
**Nature:** READ-ONLY discovery. **Zero** prompt/code/provider/credit changes.

Companion docs:

- `docs/architecture/studio-prompt-architecture.md`
- `docs/architecture/studio-provider-prompt-matrix.md`
- `docs/architecture/studio-creative-director-discovery.md`

---

## 1. Capability inventory

### 1.1 S.4 registry (12)

| # | Capability | Job wired | Primary entry |
|---|------------|-----------|---------------|
| 1 | IMAGE_GENERATE | Yes | `POST .../scenes/[sceneId]/images` |
| 2 | IMAGE_EDIT | No (orphan) | Editor edit; Studio improve bills scene_generation |
| 3 | VIDEO_GENERATE | Yes | `POST /api/animations/projects/[id]/jobs/start` |
| 4 | VOICE_TTS | Yes | `POST .../storyboards/[id]/voice` |
| 5 | VOICE_CLONE | No | voice-clones / character voice-clone |
| 6 | MUSIC_GENERATE | No | audio-library/generate-music |
| 7 | SFX_GENERATE | No | audio-library/generate-sfx |
| 8 | TRANSLATE | No | Instant language-exports (Studio UI embeds) |
| 9 | SUBTITLE_GENERATE | No | subtitles/transcribe |
| 10 | RENDER | No (alias) | Conceptual Motion/batch |
| 11 | FUSION_RENDER | Yes | `/api/editor/fusion/render` |
| 12 | VISION_ANALYZE | No | analyze-vision / style-dna / asset-derivation |

### 1.2 Additional creative capabilities discovered

| Capability | Notes |
|------------|-------|
| Bulk scene image gen | Legacy StudioJob + bulk route |
| Improve / regenerate with corrections | Heuristic + image regen |
| Consistency analyze (prompt/character) | Mostly heuristic |
| Character / location / prop / world reference generation | Asset reference wizard |
| Style DNA / asset derivation vision | OpenAI vision |
| Character voice preview / draft | TTS without S.4 job |
| Orchestrator production run / batch render | Multi-step pipeline |
| Motion handoff packaging | Prompt package → Motion |
| Editor instruction variant / masked edit / segment | Editor AI |
| Assistant interpret | Optional LLM |
| Instant create+generate / language export | Adjacent Motion/Instant |
| Director proposal apply | Planning only |
| Music/sound/audio/provider directors | Planning only |

**Count:** 12 registry + **~20** adjacent/legacy creative paths = **~32** inventory rows (directors counted as planning, not billed gen).

---

## 2. User options matrix (summary)

Full enum lists: see explore notes in companion architecture docs. Categories:

| Category | Examples | Affects |
|----------|----------|---------|
| Director profile | commercial, documentary, cinematic, social_media, storytelling, educational | Prompt + audio plans |
| Prompt style profile | commercial, cinematic, children_story, documentary, social_media, corporate | Visual style section |
| Shot type | 11 values (extreme_wide…detail_shot) | Camera prompt / Motion |
| Camera movement | 11 values | Camera prompt |
| Scene energy | calm…intense | Prompt + performance |
| Action / emotion presets | cooking/talking…; happy/excited… | Action/emotion sections |
| Duration systems | scene 1–120s; brief short/med/long; V11 15–90/auto; long-form to 10min; intent defaults | Timing / plans |
| Aspect ratio | **No Studio picker** (forced 9:16) | Motion/render |
| Quality / cost profiles | draft/standard/premium; economy/balanced/quality | Provider **plan** |
| Brief goals/tones/pace/audience | v3/v4 enums | Planning / suggestions |
| Visual styles v4 | cinematic, pixar, anime, manga, cartoon, realistic, fantasy | Brief |
| Character identity | roles, styles, shape, energy, outfit, colors, strength | Asset + scene identity |
| Age/gender | brief `ageEnergy`/`presentation`; extraction free text | Character gen |
| Location / world lighting | daylight, golden_hour, night, neon… (enum drift) | Location/world prompts |
| Voice language | nl,en,es,fr,de,pt | TTS |
| Music / sound / mix profiles | many | Audio plans / generation tags |
| Subtitle style | **missing** in Studio (export mode on Motion) | — |
| Platform | phrase detection only | Intent |
| Motion action presets | 65 IDs | **Not used by Studio modules** |

**Approximate distinct user-facing option values:** **250+** across enums/chips (excluding free text).

---

## 3. Prompt construction flows (canonical)

### IMAGE_GENERATE
User scene fields → UI options → `studio-prompt-builder` sections → image wrapper → OpenAI adapter → GenerationJob → Asset Library.

### VIDEO_GENERATE
Studio/Motion fields → motion instructions + Vidu budget (+ Instant path) → Vidu adapter → GenerationJob → Asset Library.

### VOICE_TTS
Script + voice profile → ElevenLabs (no image-style prompt matrix) → GenerationJob → Asset Library.

### FUSION_RENDER
Editor blueprint → fusion/instruction builders + negatives → OpenAI → GenerationJob → Asset Library (+ consistency).

### MUSIC / SFX / CLONE / SUBTITLE / VISION / TRANSLATE
Billed or legacy routes; **not** unified through scene Prompt Builder or S.4 job (except where noted).

---

## 4. Prompt source inventory

| Class | Count (approx) | Examples |
|-------|----------------|----------|
| Studio section builders | ~15 | `studio-prompt-*-builder.ts`, director/style profiles |
| Scene image / planner | ~5 | `studio-scene-image-prompt.ts`, planner |
| Memory / identity | ~10 | memory-prompt, visual-hints, identity preservation |
| Motion / Vidu / Instant | ~10 | motion instructions, vidu budget, instant-premium-prompt |
| Asset wizard | ~10 | reference/transform/derivation/wizard summary |
| Editor / fusion | ~8 | fusion/instruction/composition/segmentation |
| Vision / assistant system | ~4 | openai vision, character analysis, assistant SYSTEM_PROMPT |
| Preset storage | 3 | Prisma model, service, API |
| Docs (pre-S.6A) | several | `docs/studio-prompt-ai-future.md`, parity reports |

**No** `**/prompts/**` directory; **no** `.prompt.json` packs.

---

## 5. Prompt fragments

| Status | Detail |
|--------|--------|
| Named fragment registry | **Missing** |
| Phrase maps | Present (action, emotion, camera, shot, movement, energy, style, director, Instant chips) |
| Duplicates | Studio vs Motion action maps; legacy vs director camera; style vs director profile overlaps |
| Gaps | No reusable food/restaurant/macro/drone/luxury fragment packs; lightingNotes unused from DB presets |

---

## 6. Prompt presets

| Source | Ownership | Generation wired? |
|--------|-----------|-------------------|
| `StudioPromptPreset` DB | user/project/brand/default/system | **No** |
| Style / director hardcoded | System | **Yes** |
| AI Director keyword presets | System | Planning only |
| Motion action presets | System (Motion) | Motion Instant |
| Instant style chips | System | Instant/Vidu |
| Temporary / future placeholders | Fields on preset payload | Unused |

---

## 7. Automatic intelligence (hidden)

Documented in `studio-creative-director-discovery.md`. Summary: auto shot, duration, profile, music/sound/mix, provider plan, 9:16 aspect, quality string, identity/continuity defaults, Vidu negatives, improve auto-select. **Rule-based** except provider LLM calls.

---

## 8. Workflow maps (stage checklist)

For each wired gen capability, stages verified present:

`User Input → UI Options → Prompt Builder → Fragments/phrase maps → Provider Adapter → GenerationJob (if wired) → Provider → Result Processing → Asset Library (S.4 path or consistency) → Project/Storyboard`

Missing stages called out per orphan capability (no GenerationJob and/or no S.5 index).

---

## 9. Prompt quality classification

| Workflow | Class | Why |
|----------|-------|-----|
| IMAGE_GENERATE scene builder | **COMPLETE** (sectioned) / **PARTIAL** Matrix | Rich sections; no fragment registry/presets |
| Scene image wrapper | **DUPLICATED** risk | Re-adds continuity/still constraints |
| Improve / corrections | **PARTIAL** | Heuristic patches + regen |
| VIDEO / Vidu | **PROVIDER_SPECIFIC** | Budget/compact optimized |
| Instant Premium prompts | **PARALLEL** / **DUPLICATED** | Separate from Studio builder |
| Asset reference/transform | **COMPLETE** for wizard; **LEGACY** relative to Matrix | Own stack |
| Fusion / instruction | **PROVIDER_SPECIFIC** | Editor archetypes |
| Music/SFX prompts | **PARTIAL** | Thin text |
| Voice/Clone/STT | **N/A** text matrix | Settings-driven |
| Vision/assistant system | **PROVIDER_SPECIFIC** | System prompts |
| StudioPromptPreset | **UNKNOWN** effectiveness | Not wired |
| RENDER / IMAGE_EDIT registry | **LEGACY** / orphan | Registry without job path |
| Motion action presets in Studio | **LEGACY** unused | Zero studio* refs |

---

## 10. Prompt consistency

Inconsistencies confirmed:

- Scene vs Shot vs Sequence vs Clip  
- Generate vs Create vs Render  
- Improve (primary) vs Enhance/Upscale (absent)  
- Many “Director” subsystems vs Prompt vs Instruction  
- Overlapping profile names with non-identical members  
- Energy meaning differs (scene vs character vs music)  
- Lighting enum drift (wizard vs identity vs world)  
- Duration mapping conflicts (15/30/60 vs 30/60/90 vs intent)

---

## 11. Provider optimization coverage

| Bucket | Share of Studio creative surfaces |
|--------|-----------------------------------|
| Generic free-text prompts | Scene stills, many asset prompts |
| Provider-optimized | Vidu motion/Instant; OpenAI vision/edit |
| Legacy / parallel | Improve as scene regen; Instant vs Studio |
| Planning-only providers | suno/kling/runway/azure in assignment matrix |
| Unknown (unused presets) | DB StudioPromptPreset |

---

## 12. Missing intelligence (opportunities — do not solve)

- No automatic restaurant / food photography pack  
- No automatic product photography director  
- No platform optimization (TikTok/IG) as first-class option  
- No commercial storytelling layer unified with Prompt Matrix  
- No continuity validation gate before pay  
- No Creative Director product modes  
- No provider transform layer (generic → Flux/Imagen/Vidu)  
- Presets not attached to generation  
- Subtitle style / aspect ratio / platform pickers missing in Studio  
- 8/12 S.4 capabilities lack GenerationJob wiring  

---

## 13. Prompt Matrix readiness (per capability)

| Capability | Readiness |
|------------|-----------|
| IMAGE_GENERATE | **PARTIAL** — best foundation (section builder) |
| IMAGE_EDIT | **MAJOR REFACTOR** (orphan + improve divergence) |
| VIDEO_GENERATE | **PARTIAL** — needs Matrix→Vidu adapter |
| VOICE_TTS / CLONE | **READY** for settings Matrix (not text fragments) |
| MUSIC / SFX | **PARTIAL** |
| TRANSLATE / SUBTITLE | **PARTIAL** (outside Studio SoT) |
| RENDER | **MAJOR REFACTOR** (alias cleanup) |
| FUSION_RENDER | **PARTIAL** (Editor-owned) |
| VISION_ANALYZE | **READY** for system-prompt registry (separate from creative Matrix) |
| Asset wizard gens | **PARTIAL** — merge into Matrix later |
| Directors (planning) | **READY** to emit Matrix decisions |

**Overall Studio:** **PARTIAL** — proceed to S.6B architecture; do not big-bang rewrite.

---

## 14. Creative Director readiness

| Mode | Readiness |
|------|-----------|
| Quick Mode | **PARTIAL** — auto planners exist |
| Professional Mode | **PARTIAL** — options exist, consistency debt |
| Director Mode | **PARTIAL** — proposal/auto shot exist; no mode shell |

No GenerationJob / credit / workspace redesign required to introduce modes.

---

## 15. Prompt engine recommendation (S.6B — do not implement now)

**Recommended: Hybrid**

1. **Composable modules** — formalize existing sections as Matrix modules  
2. **Rule engine** — keep current directors as decision producers  
3. **Provider adapters** — transform composed prompt → provider syntax  
4. **Decision trees** — Quick/Pro/Director mode policies  

Avoid deleting phrase maps until modules replace them 1:1.

---

## 16. Technical debt (do not remove in S.6A)

| Item | Notes |
|------|-------|
| Dual generation models | S.4 jobs vs legacy StudioJob vs bare billed routes |
| 8 orphan S.4 capabilities | Registry aspirational |
| Parallel prompt stacks | Studio / Instant / Motion / Editor |
| Legacy camera builder | Fallback behind director camera |
| Unused Motion presets in Studio | 65 presets |
| Unwired StudioPromptPreset | Storage-only |
| Duration / lighting / profile enum drift | Multiple SoTs |
| Planning providers ≠ runtime | suno/runway/kling |
| Unused flags / experiments | Improve auto-select, AI everything flags — inventory before delete |
| Dead docs paths | Future prompt docs partially outdated vs S.4/S.5 |

---

## 17. Recommended implementation order (S.6B+)

1. **S.6B** — Prompt Matrix architecture: module IDs, compose API over `studio-prompt-builder`, preset binding, provider transform interface  
2. Unify duration + profile enums (docs → then code)  
3. Wire IMAGE_GENERATE only through Matrix first  
4. Vidu adapter from Matrix modules  
5. Creative Director modes (Quick/Pro/Director) as policy over Matrix  
6. Later: orphan capability job wiring; Editor/Instant convergence  

---

## 18. Absolute rules compliance

| Rule | Result |
|------|--------|
| No prompt rewrite | **PASS** |
| No UI redesign | **PASS** |
| No provider / GenerationJob / credit changes | **PASS** |
| No Marketplace / Growth / Identity | **PASS** |
| Documentation complete | **PASS** |

---

## 19. Final decision gate

Audit complete → eligible for:

**GO FOR STUDIO S.6B — PROMPT MATRIX ARCHITECTURE**
