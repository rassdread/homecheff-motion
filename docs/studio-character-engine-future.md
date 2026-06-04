# Studio Character Engine — future hooks (documentation only)

No implementation in Studio V8. Planned extensions for long-form storytelling:

- **Character memory** — persistent traits and history across storyboards
- **Character packs** — bundled identities for franchise series
- **Expression presets** — emotion → visual expression mappings beyond text prompts
- **Outfit presets** — wardrobe continuity per season or campaign
- **Relationship memory** — who appears together and how they interact
- **World memory** — shared locations, props, and tone across projects

V8 uses **prompt-level consistency** only (reference image metadata + continuity lines in `buildSceneImageGenerationPrompt`).

See: `src/lib/studio-scene-image-prompt.ts`, `docs/studio-scene-image-future.md`.
