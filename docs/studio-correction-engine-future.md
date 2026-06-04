# Studio — Correction Engine (V12) & future autonomous movie builder

## V12 (shipped in Studio)

V12 turns consistency findings into **actionable prompt corrections** without overwriting source prompts.

```
Consistency Engine (V11)
        ↓
Correction Engine (V12)
        ↓
Prompt patches → Corrected prompt layer
        ↓
Regenerate with corrections (new generationVersion)
        ↓
Improvement score + version history
        ↓
Motion handoff v6 (metadata only)
```

### Data model (`StudioSceneImage`)

- `correctionRecommendations` — structured `CorrectionRecommendation[]`
- `promptPatches` — reusable `PromptPatch[]`
- `correctedPrompt` — full prompt sent when regenerating with corrections
- `regeneratedFromImageId` — lineage to source generation
- `previousConsistencyScore` / `improvementScore` — before/after delta

### Core libraries

- `buildCorrectionRecommendations(report)` — warnings → recommendations + severity
- `buildCorrectedPrompt(original, patches)` — appends correction layer, preserves base
- `buildSceneCorrectionBundle` — report + base prompt → bundle
- `computeImprovementScore(previous, new)`
- `buildStoryboardCorrectionSummary` — storyboard-level “scenes needing correction”

### APIs

- `GET …/scenes/[sceneId]/corrections-preview`
- `POST …/images/[imageId]/regenerate-with-corrections`
- `POST …/storyboards/[id]/generate-corrections` (analyze all, summary only — user approves regen)

### UI

- Scene image panel: **Corrections** tab (warnings, patches, corrected preview, regenerate)
- Generation history table (consistency, prompt version, correction count)
- Storyboard: **Generate corrections** + summary sidebar

### Prompt Builder feedback loop

`PromptBuilderInput.correctionRecommendations` applies the same correction layer on top of memory + continuity output. Memory rows are never mutated.

### Motion handoff v6 (metadata only)

- `correctionRecommendations`, `consistencyHistory`, `latestImprovementScore`
- Per-scene `sceneCorrectionRecommendations`

No Vidu changes. No video rendering.

---

## Phase 14 — Future autonomous mode (documentation only)

Planned closed loop (not implemented):

```
Generate image
    ↓
Analyze consistency
    ↓
Build corrections
    ↓
Regenerate with corrections
    ↓
Re-analyze
    ↓
Accept when score ≥ threshold
    ↓
Motion handoff
```

Configuration knobs for a future release: max retries per scene, score threshold, auto-select best generation.

---

## Phase 15 — Future movie builder compatibility (documentation only)

| Domain | Correction type | Retry strategy |
|--------|-----------------|----------------|
| Character | `MissingCharacterTrait`, identity drift | Regenerate with character patches |
| Location | `WeakLocationIdentity` | Location prompt reinforcement |
| Prop | `MissingPropBranding` | Prop visibility patches |
| World | `WorldStyleMismatch` | World style layer |
| Workflow | Scene approval after N attempts | Storyboard / movie-level approval gates |

Bulk storyboard correction (V12) is the **analysis + summary** step; autonomous movie builder would chain regen + approval without manual tab switching.

---

## Recommended before Studio V13

- Vision / pixel consistency vs reference images
- Auto-retry queue with user-configurable thresholds
- Persist “base prompt” snapshot separately from provider prompt for clearer diffs
- Export correction audit trail for Motion / render pipelines when product needs it
