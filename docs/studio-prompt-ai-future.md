# Studio Prompt Builder — future AI pipeline

Studio V7 generates **Motion-ready text prompts** from composed scenes. No image generation, Vidu calls, or render changes are included in V7.

## Target end-to-end flow

```
Scene Composer (Studio)
        ↓
Prompt Builder (V7 — implemented)
        ↓
Image Generator (future — reference frames per scene)
        ↓
Motion (instant / premium pipeline)
        ↓
Vidu (video provider)
        ↓
Final video
```

## V7 scope (current)

- `PromptBuilderInput` / `PromptBuilderOutput` (`src/types/studio-prompt-builder.ts`)
- Pure builders: action, emotion, camera, character, location, prop, continuity, style profiles
- `buildScenePrompt()` — full scene prompt + sections + quality score
- Storyboard-level `promptStyleProfile` (default: commercial)
- Scene Composer **Prompt Preview** tab (read-only)
- `MotionHandoffPayload` v2: per-scene `generatedPrompt`, `stylePrompt`, `continuityPrompt`, `promptVersion` metadata (stored, not used for Vidu yet)

## V8+ recommendations

1. **Image Generator** — use `CharacterSnapshot` / `LocationSnapshot` / `PropSnapshot` reference URLs to seed still frames before Motion.
2. **Vidu wiring** — pass `generatedPrompt` + continuity into provider prompt budget after validation.
3. **Prompt version persistence** — optional Prisma table or render-version snapshot when prompts change mid-project.
4. **Editable prompts** — allow per-scene overrides while keeping Studio snapshots as source of truth.
5. **Character memory hooks** — extend continuity builder with stable IDs across exports.

See also: `docs/studio-architecture.md`, `src/lib/studio-integration-architecture.ts`.
