# Studio Props — future extensions (documentation only)

## Asset richness

- **Multiple reference images** — angles, in-hand vs on-table
- **Prop variants** — colors, sizes, worn vs displayed
- **Brand packs** — bundled HomeCheff merchandise sets
- **Animation hints** — how the object should move in scene
- **Interaction rules** — “held by character”, “on counter”, etc.
- **Scale presets** — relative size vs characters/locations
- **Lighting presets** — reflective, matte, emissive screens

## Integration

```
Studio Prop (PropSnapshot)
  ↓
Scene Composer
  ↓
Motion Prompt Builder
  ↓
Vidu
```

See `src/types/studio-prop-snapshot.ts`.
