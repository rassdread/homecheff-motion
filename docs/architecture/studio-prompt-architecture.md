# Studio Prompt Architecture (S.6A Discovery)

**Phase:** S.6A — discovery only  
**Base:** `a0e28e1c`  
**Rule:** Document reality. No prompt rewrites in this phase.

## Principle

Studio already has a **sectioned TypeScript prompt assembler** for scene stills, plus **multiple parallel assemblers** for image wrappers, motion/Vidu, asset wizards, Instant Premium, and Editor fusion. There is **no** registered Prompt Matrix fragment system yet. S.5 `StudioPromptPreset` is **storage only** and is **not** consumed by generation.

## Canonical scene prompt path (IMAGE_GENERATE)

```
Scene row / snapshot
  → sceneSnapshotToPromptInput / studio-scene-to-prompt-input
  → buildScenePromptFromSceneRow (studio-prompt-builder-service)
  → buildScenePromptFromInput (studio-prompt-builder)
      sections:
        identity, directorIdentity, location, characters, props,
        action, emotion, camera, director, visualStyle,
        qualityInstructions, continuity
  → buildSceneImageGenerationPrompt (studio-scene-image-prompt)
      + still-frame / no-text / reference ordering
  → scene-image provider (openai | mock)
  → StudioGenerationJob (S.4) → registerLibraryAssetFromGeneration (S.5)
```

### Section builders (modular-ish, code-embedded)

| Section | Builder |
|---------|---------|
| Action | `studio-prompt-action-builder.ts` (`ACTION_PHRASES`) |
| Emotion | `studio-prompt-emotion-builder.ts` |
| Camera (legacy) | `studio-prompt-camera-builder.ts` |
| Camera (director) | `studio-scene-director.ts` → preferred |
| Character | `studio-prompt-character-builder.ts` |
| Location | `studio-prompt-location-builder.ts` |
| Prop | `studio-prompt-prop-builder.ts` |
| Continuity | `studio-prompt-continuity-builder.ts` + `studio-memory-prompt.ts` |
| Style | `studio-prompt-style-profiles.ts` |
| Director profile | `studio-director-profiles.ts` |
| Identity | `studio-identity-prompt-context.ts` + visual-hints modules |
| Quality | Hardcoded `QUALITY_INSTRUCTIONS` in `studio-prompt-builder.ts` |
| Corrections | `build-corrected-prompt.ts` append layer |

`PROMPT_BUILDER_VERSION = 4` (`src/types/studio-prompt-builder.ts`).

## Parallel prompt stacks (not unified)

1. **Scene image wrapper** — may re-add continuity/reference constraints  
2. **Motion instructions** — `build-studio-scene-motion-instructions.ts` (own phrase maps)  
3. **Execution / Vidu** — `studio-scene-execution.ts`, `vidu-prompt-budget.ts`, Instant Premium prompts  
4. **Asset reference / transform / derivation** — wizard prompt family  
5. **Editor fusion / instruction** — separate OpenAI image assemblers  
6. **Vision / assistant system prompts** — LLM inspectors, not scene matrix  

## Hidden / automatic layers (generation)

| Layer | Mechanism |
|-------|-----------|
| Quality instructions | Fixed string (no text/watermarks, natural lighting…) |
| Continuity / memory | Priority memory chunks or fallback strings |
| Identity locks | Drift-triggered strict preserve; brand protection rules |
| Corrections | `--- Continuity corrections ---` patch block |
| Still-frame constraints | Single cinematic still; no collage/text |
| Vidu negatives | `VIDU_NEGATIVE_TEXT_SAFETY_LINE` + motion preset negatives |
| Aspect ratio | Hardcoded `9:16` on Studio→Motion handoff / batch render |

## Presets

| Kind | Wired into generation? |
|------|------------------------|
| Hardcoded style / director profiles | **Yes** |
| Motion action presets | Motion Instant only — **not** Studio modules |
| Instant style chips (`food_promo`, …) | Instant/Vidu path |
| AI Director keyword presets | Rule interpreter only |
| DB `StudioPromptPreset` | **No** (CRUD/API only) |

## Fragment system verdict

**PARTIAL** — sectioned assembler + phrase maps exist; no fragment registry, fragment IDs, JSON/MD packs, or lighting/food/drone fragment library.

## Terminology (product)

Dominant terms: Scene, Generate, Improve, Director, Prompt.  
Parallel/conflicting: Shot / Sequence / Clip; Render vs Generate; Instruction (Motion/Editor) vs Prompt (Studio).

## S.6B implication

Prompt Matrix should **compose over** the existing section builder, not replace GenerationJob or S.5 library. Wire presets into the assembler; do not invent a second orphan stack.
