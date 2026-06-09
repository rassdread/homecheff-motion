# Universal Asset Generation Workbench Phase 2 & 3 Report

## Character Style Cards

- Seven wireframe style cards: Flat Vector, 2.5D, 3D, Mobile Game, Stylized Cartoon, Storybook, Custom
- Wizard step `character_style` after identity/evolution for mascot/character/person/canonical base
- Persisted in semantic record as `characterStyleCard` / `characterStyleCustom`
- Consumed in `buildAssetSemanticGenerationContext`

## Info Button System

- `StudioWizardInfoButton` — desktop popover / mobile bottom sheet
- Integrated on character style, animation readiness, reference placement, placement preview
- i18n keys under `studio.workbench.info.*`

## AI Animation Ready Suggestions

- `buildAnimationPreparationSuggestions()` — 13 actions with confidence scores from vision
- Auto-selected on animation readiness step seed; user can override
- Extended actions: hands/legs reconstruction, turnaround, motion ready, lip sync ready

## Dynamic Accessory & Clothing Extraction

- `extractDynamicAccessoriesFromVision()` from keyFeatures, accessoryPattern, semantic fields
- HomeCheff-specific hardcoded options removed from canonical evolution UI
- Per-item actions: keep / remove / replace / identity_marker
- Persisted as `dynamicAccessories` in semantic record

## Reference Placement System

- Wizard steps: `reference_placement`, `placement_preview`
- Upload or pick from library; type, target, size, importance (optional → exact)
- Object-aware targets: chest, apron, hat, packaging, background, custom

## Multi-Reference Context

- `buildPlacementPromptBlock()` + composition graph in generation context
- Exact/required placements enforce “do not invent similar logo” instructions
- Documented provider limitation: prompt/semantic instruction when multi-image input unavailable

## Semantic Persistence

- `AssetSemanticRecord`: `referencePlacements`, `dynamicAccessories`, `semanticLayers`, `characterStyleCard`
- No Prisma migration — stored in `[studio:semantic:v1]` marker

## Asset Library Integration

- Detail view shows reference placements (clickable to source asset)
- `StudioAssetSemanticContinuity.referencePlacements` on registry load

## Director & Motion Integration

- `SceneSemanticRecipeAssetRef.referencePlacementSummary`
- Motion recipe text includes placement continuity instructions

## Placement QA

- `auditReferencePlacements()` after variant generation
- Merged into `GeneratedIdentityVariantAudit` warning items
- Scores: placement accuracy, brand accuracy, reference accuracy

## Generation Progress UX

- `StudioWizardGenerationProgress` — 8-step progress bar during reference generation
- Replaces simple spinner on reference step

## End-to-End Audit

| Stage | Stored | Consumed | Behavior |
|-------|--------|----------|----------|
| Vision | sourceVisionAnalysis | Style/accessory/placement suggestions | Seeds workbench choices |
| Style card | characterStyleCard | Generation context | Style prompt block |
| Animation suggestions | animationPreparationActions | Generation + semantic record | Prep instructions |
| Dynamic accessories | dynamicAccessories | Generation context | Keep/remove/markers |
| Reference placements | referencePlacements | Generation, QA, library, motion | Exact placement prompts |
| Composition graph | derived from placements | Generation context | Object-aware tree |
| Semantic layers | semanticLayers | Generation context | Lock/hide guidance |
| Variant QA | variantIdentityAudit + placement QA | Library badges, director warnings | Recovery tiers |

## Semantic Composition (Phase 3)

### Object Aware Placement

Placements attach to clothing/prop/packaging nodes in composition graph.

### Composition Graph

`buildCompositionGraphFromDraft()` — character → clothing/prop → placement assets.

### Semantic Layers

`defaultSemanticLayers()` — character, clothing, placement_assets, environment, background, brand_elements.

### Exact Reference Assets

Importance levels: optional, best_effort, high_priority, required, exact.

### Placement Preview

Tree preview before generation (no pixel render).

### Smart Placement Suggestions

Vision-driven prompts for apron logo, hat badge, box label, background poster.

### Motion Placement Continuity

Placement summaries flow to scene semantic recipe motion text.

### Future Foundation

Types and composition graph extensible for mockups, merchandise, multi-character scenes.

## Tests / Build Status

- `src/lib/studio-asset-generation-workbench.test.ts` — style cards, accessories, placements, composition, QA
- Run: `npm run test`, `npm run build`, `npm run lint`
