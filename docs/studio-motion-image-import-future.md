# Studio → Motion image import — future render pipeline

Studio V9 pre-fills Motion wizard scene slots with selected Studio scene images. Vidu and final render are unchanged.

## End-to-end flow (target)

```
Studio Storyboard
        ↓
Prompt Builder
        ↓
Scene Images
        ↓
Motion Import (V9)
        ↓
Motion Animation
        ↓
Vidu
        ↓
Final Video
```

## V9 scope

- `MotionHandoffPayload` v3 with `selectedSceneImageUrl`, versions, `sceneImageReference`
- Wizard slots: `imageSource: studio`, remote URLs, metadata on persist/restore
- **Studio Image** badge, Studio context panel fields, **Refresh from Studio**
- Missing image: non-blocking warning

## V10+ recommendations

- Pass `sceneImageReference` into render-version / export audit
- Character/world memory for continuity — see `docs/studio-character-engine-future.md`
- Auto-refresh when storyboard changes while Motion draft is open
