# Studio Scene Images — future Motion pipeline

Studio V8 generates **still images** per composed scene. Video rendering and Vidu are out of scope.

## Target flow

```
Storyboard (Scene Composer)
        ↓
Prompt Builder (V7)
        ↓
Scene Image Generator (V8)
        ↓
Motion wizard (slot images from selectedSceneImageId)
        ↓
Vidu (video provider)
        ↓
Final video
```

## V8 scope (current)

- `StudioSceneImage` Prisma model + `selectedSceneImageId` on `StudioScene`
- `SceneImageProvider` abstraction (`openai` | `mock`)
- `generateStudioSceneImage()` + regenerate + bulk + delete + **Use in Motion** selection
- Scene Composer tab: **Generated Image**
- Handoff metadata: `selectedSceneImageId`, `preferredSceneImageUrl` (stored, not wired to Vidu)

## V9+ recommendations

1. **Motion import** — prefill wizard slot `image` from `preferredSceneImageUrl`
2. **Reference-conditioned generation** — pass character/location/prop reference URLs to multi-image APIs
3. **Async job queue** — bulk generation via worker instead of sequential HTTP
4. **Render-version linkage** — bind export to `generationVersion` + `promptVersion`

See also: `docs/studio-character-engine-future.md`, `docs/studio-prompt-ai-future.md`.
