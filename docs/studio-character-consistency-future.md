# Studio character consistency — future (V18+)

HomeCheff Studio V17 tracks recurring character identity across storyboard scene images using vision, consistency JSON, reference metadata, and prompt patches. **No LoRA, no training, no Vidu changes.**

## Planned (not implemented)

### Character locks

- Pin a character’s visual identity for a storyboard or series.
- Block prompt/vision drift from overriding locked traits (hat, apron, proportions).

### Pose memory

- Remember approved poses per character per storyboard.
- Suggest or enforce pose continuity in Prompt Builder and correction patches.

### Expression memory

- Track expression baselines per scene beat (happy, focused, celebrating).
- Warn when expression drifts without narrative intent.

### Outfit lock

- Freeze default clothing and accessories for selected characters.
- Drift detection escalates when outfit lock is enabled.

### Mascot identity lock

- Stronger than generic character lock: HomeCheff mascots (Chef, Garden, etc.) use canonical reference bundles only.
- Motion handoff carries lock state as metadata for Instant Premium (still prompt/vision only).

### Reference-conditioned image generation

- Use `referenceImageUrl`, `primaryReferenceImageId`, `identityStrength`, and `continuityStrength` as first-class inputs to scene image providers when supported.
- Remains inference-time conditioning; no custom model training.

## V17 baseline (shipped)

- Per-character timelines and `StoryboardCharacterConsistencyReport`
- `analyze_character_consistency` background job
- Character Consistency panel in storyboard editor and Movie Builder readiness
- Motion handoff v9: `characterConsistencyReport`, `characterDriftWarnings`, `perSceneCharacterIdentityScores`
