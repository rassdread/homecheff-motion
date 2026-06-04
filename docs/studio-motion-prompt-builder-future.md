# Studio → Motion Prompt Builder (documentation only)

## Future flow

```
Studio Scene (SceneSnapshot + StudioSceneContextMetadata)
  ↓
Prompt Builder (reads location, characters, props, action, camera, emotion)
  ↓
Generated Motion Prompt (per scene + transitions)
  ↓
Generated Images (optional — not automatic in V6)
  ↓
Motion Render (Vidu — existing pipeline)
```

V6 stores Studio context on wizard slots and in `MotionHandoffPayload` without calling Vidu.

## Extensibility

These fields are reserved on snapshots and context metadata:

- `voice`, `music` on `SceneSnapshot`
- Character / location memory, prompt locks, world state — add to `StudioSceneContextMetadata` without breaking import mapping
