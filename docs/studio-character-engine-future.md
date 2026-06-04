# Studio — Future Character Engine (documentation only)

Studio V10 stores **character memory** (appearance, personality, clothing, keywords, reference strength). The following capabilities are planned but **not implemented** in V10.

## Planned memory dimensions

- **Character memory** — baseline identity (V10: `appearanceMemory`, `personalityMemory`, …)
- **Character evolution** — time-based or story-arc changes to appearance/personality
- **Outfit memory** — scene-specific overrides while preserving core identity
- **Expression memory** — default expressions and emotion-to-face mapping
- **Relationship memory** — how characters interact visually (proximity, gaze, scale)
- **Location evolution** — seasonal or narrative changes to environments
- **World state** — global flags (time of day, season, campaign phase) affecting all assets

## Intended consumers

1. Prompt Builder (V10: continuity text injection)
2. Scene Image Generator (future: reference-conditioned generation)
3. Consistency Engine (future: post-generation validation / repair)
4. Motion handoff (V10: metadata storage only)

## Non-goals in V10

- LoRA training
- Image-to-image pipelines
- Video generation
- Vidu integration changes
