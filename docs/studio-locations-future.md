# Studio Locations — future extensions (documentation only)

Planned capabilities beyond Studio V3. Not implemented yet.

## Asset richness

- **Multiple reference images** — day/night, interior/exterior, aerial views
- **Time of day** — morning, golden hour, night presets
- **Weather presets** — rain, sun, overcast linked to prompt hints
- **Camera presets** — wide establishing, street-level, interior POV
- **Location memory** — persistent facts (“always busy market”, “quiet garden”)
- **Location packs** — bundled sets (Rotterdam city pack, HomeCheff restaurant pack)
- **Location variations** — seasonal or campaign-specific variants of the same place

## Integration (after Scene Composer)

```
Studio Location (LocationSnapshot)
  ↓
Scene Composer
  ↓
Motion Prompt Builder
  ↓
Vidu
  ↓
Video
```

See `src/types/studio-location-snapshot.ts` and `src/lib/studio-integration-architecture.ts`.
