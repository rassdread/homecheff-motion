# Studio Characters — future extensions (documentation only)

Planned capabilities beyond Studio V2. Not implemented yet.

## Asset richness

- **Multiple reference images** — front/side/expression sheets per character
- **Character expressions** — happy, surprised, focused presets linked to reference sets
- **Character outfits** — seasonal or campaign-specific looks
- **Character voices** — TTS / voice-clone profile IDs for narration
- **Character memory** — long-lived facts the prompt system should remember per identity

## Production workflow

- **Prompt locking** — pin phrasing so “Use Chef” always resolves the same visual contract
- **Character packs** — bundled mascots (Chef, Garden, Designer) for campaigns
- **System character seeding** — `isSystemCharacter` rows visible/read-only to all users

## Integration (after Scene Composer)

```
Studio Character (CharacterSnapshot)
  ↓
Scene Composer (scene slots reference character IDs)
  ↓
Motion Prompt Builder
  ↓
Vidu multi-image / reference conditioning
  ↓
Video
```

See `src/types/studio-character-snapshot.ts` and `src/lib/studio-integration-architecture.ts`.
