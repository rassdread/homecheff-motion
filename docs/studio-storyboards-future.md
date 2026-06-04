# Studio Storyboards — future extensions (documentation only)

## Scene richness

- **Scene templates** — reusable starter compositions
- **Character positioning** — where each character stands in frame
- **Prop positioning** — placement relative to characters and location
- **Character relationships** — pairs, groups, facing direction
- **Voice assignments** — TTS / narrator per character
- **Music assignments** — bed and stinger per scene
- **Scene transitions** — cut, fade, match-cut metadata beyond `transitionToNext`
- **World memory** — persistent facts across scenes in a storyboard
- **Location memory** — weather, time-of-day continuity
- **Future Scene AI generation** — draft scenes from a brief

## Motion integration

```
Storyboard (StoryboardSnapshot)
  ↓
Scenes (SceneSnapshot[])
  ↓
Motion Prompt Builder
  ↓
Scene Prompts
  ↓
Vidu
  ↓
Video
```

See `src/types/studio-storyboard-snapshot.ts` and `src/types/studio-scene-snapshot.ts`.
