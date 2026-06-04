# Studio — Vision Consistency Engine (V13) & future autonomous movie builder

## V13 (shipped)

V13 adds **visual QA** on generated scene stills — the first pixel-level inspection layer (via OpenAI Vision when configured, mock heuristic otherwise).

```
Scene image (completed)
        ↓
StudioVisionProvider.analyzeImage()
        ↓
Category scorers (character, location, prop, branding, world)
        ↓
VisionConsistencyReport → persisted on StudioSceneImage
        ↓
Correction Engine (V12) merges vision + prompt recommendations
        ↓
Motion handoff v7 (metadata only)
```

### Vision provider

- **Interface:** `StudioVisionProvider` (`analyzeImage`)
- **OpenAI:** reuses HomeCheff Motion OpenAI Vision pattern (`runOpenAiGated`, JSON structured response)
- **Mock:** `STUDIO_VISION_PROVIDER=mock` or no `OPENAI_API_KEY` — deterministic heuristic for CI/local
- **Env:** `STUDIO_VISION_PROVIDER`, `STUDIO_VISION_MODEL`, `OPENAI_API_KEY`

### Prisma (`StudioSceneImage`)

- `visionScore`, `visionStatus`, `visionReport`, `visionAnalyzedAt`

### APIs

- `POST …/images/[imageId]/analyze-vision`
- `POST …/storyboards/[id]/analyze-vision`

### UI

- Scene image panel: **Vision** tab (scores, warnings, recommendations, detected elements)
- Storyboard: **Analyze vision** + **Vision timeline** sidebar

### Correction integration (Phase 13)

`buildCombinedCorrectionRecommendations({ consistencyReport, visionReport })` feeds V12 patches. No auto-regeneration.

### Motion handoff v7

- `visionReport`, `overallVisionScore`, `visionWarnings`
- Per-scene `sceneVisionScore`, `sceneVisionReport`

No Vidu changes. No video rendering. No image editing.

---

## Phase 14 — Future autonomous loop (documentation only)

```
Generate image
    ↓
Prompt consistency (V11)
    ↓
Vision consistency (V13)
    ↓
Combined corrections (V12)
    ↓
Regenerate with corrections
    ↓
Re-analyze until threshold
    ↓
Motion handoff
```

---

## Phase 15 — Future movie builder (documentation only)

| Capability | V13 foundation |
|------------|----------------|
| Character recognition | `analyzeCharacterVisionConsistency` |
| Location recognition | `analyzeLocationVisionConsistency` |
| Prop recognition | `analyzePropVisionConsistency` |
| Logo recognition | `analyzeBrandingConsistency` |
| World continuity | `analyzeWorldVisionConsistency` |
| Scene approval | Vision score + status thresholds |
| Movie approval | Storyboard vision timeline aggregate |

---

## Recommended before Studio V14

- Dedicated vision model tuning per category (character vs branding)
- Batch vision queue for storyboard bulk analyze
- Store vision raw signals separately for audit/debug UI
- Optional local ONNX detectors for offline branding/logo checks
- Auto-regeneration when `overallVisionScore` &lt; threshold (user-approved)
