# Studio Semantic Persistence & Consumption Report

Sprint goal: one consistent semantic chain from Asset → Motion without re-analysis, re-guessing, or parallel systems.

## Asset semantic record

- Added `AssetSemanticRecord` (`src/types/studio-asset-semantic-record.ts`) with marker `[studio:semantic:v1]` serialized into existing DB text fields.
- Builder/parser in `src/lib/studio-asset-semantic-record.ts` — vision → record, extract from character/prop/location/world rows, director label formatting.
- On wizard save (character/prop/location/world), record is built from vision analysis + style DNA and applied to identity fields.
- Character: `referenceNotes` (+ appearanceMemory, visualKeywords, continuityNotes).
- Prop/location: `continuityNotes` (+ appearance/branding/world memory fields).
- World: visualStyle, shapeLanguage, brandRules via existing identity form.
- Wizard create pages merge `wizardSemanticCreateExtras()` into API payloads.

## Vision persistence

- Vision output no longer dies in wizard state only — flows into `appearanceMemory`, `visualKeywords`, `continuityNotes`, branding, shape language, and serialized semantic marker on save.
- `buildAssetSemanticGenerationContext()` is the single deduplicated prompt block for all generation paths.

## Preserve/change/forbidden parity

- `buildAssetReferenceGenerationPrompt`, `buildDerivationReferenceGenerationPrompt`, and `buildSourceTransformSummaryPrompt` all consume `buildAssetSemanticGenerationContext()` with:
  - Vision analysis
  - Style DNA / shape DNA
  - Brand identity
  - Preserve / change / forbidden rules
  - User instructions

## Director semantic consumption

- `formatDirectorSemanticAssetLabel()` produces enriched labels (e.g. "Chef · Chef Mascot · Brand: HomeCheff · Shape: Friendly Round · Style: Cartoon Mascot").
- `ProposedAssetRef.semanticLabel` optional field on proposal assets.
- Director builder uses typed refs (`toCharacterAssetRef`, `toPropAssetRef`, `toLocationAssetRef`) at asset selection sites.

## Readiness improvements

- `buildProposalAppliedStoryboard()` now resolves props and locations from proposal refs (was character-only with empty props / null location).
- Unified readiness considers characters, props, locations, worlds, references, scene images, and motion assets.

## Scene prompt reuse

- `create-motion-handoff-payload.ts` `toHandoffScene()` uses `selectedImageRow.generatedPrompt` as truth when present (`summarySource: "selected_scene_image"`).
- Falls back to `buildScenePromptFromSceneRow()` only when no selected prompt exists.

## Semantic recipe

- `SceneSemanticRecipe` (`src/types/studio-scene-semantic-recipe.ts`) — compact per-scene bundle:
  - Character / prop / location / world identity refs
  - Emotion, narrative goal, visual style
  - Preserve rules, continuity rules, key features
  - Audio semantic layer (voice identity, scene emotion/energy, narrative importance)
  - Cross-asset relations (character↔prop, character↔location, character↔world, location↔world, prop↔brand)
  - `ScenePromptLineage` (prompt hash, version, recipe version, handoff version)
- Built in `src/lib/build-scene-semantic-recipe.ts`, attached to each `MotionHandoffScene.semanticRecipe`.

## Motion consumption

- Handoff version bumped **25 → 26**.
- `buildStudioSceneMotionInstructions()` consumes `semanticRecipe` at highest priority (`dropPriority: 0`) before truncation drops blocking/placement.
- `buildInstantStoryModePromptDetailed()` accepts `studioSemanticRecipes[]` per scene.
- Animation job service resolves recipe text from stored handoff and injects into Vidu story prompt.

## Handoff persistence

- `sanitizeMotionHandoffForStorage()` still strips `generatedPrompt`, `stylePrompt`, `continuityPrompt`, `description`.
- **Preserves** compact `semanticRecipe` objects (lossless, reproducible).
- Execution prompts truncated at 2400 chars; semantic meaning carried in recipe.

## Cross-asset intelligence

- `buildCrossAssetRelations()` in recipe builder emits explicit character↔prop, character↔location, character↔world, location↔world, prop↔brand links when assets co-occur in a scene.

## Audio semantic layer

- Recipe `audio` block carries voice identity, scene emotion, scene energy, narrative importance from scene row — passed through handoff without new audio engine.

## Render lineage

- `StudioRenderAuditMetadata` extended with:
  - `semanticRecipeVersion`
  - `promptLineageHashes[]`
  - `assetSemanticRecordIds[]`
- `buildStudioRenderAuditMetadata()` extracts lineage from stored handoff JSON when available.

## What was not rebuilt

No changes to: Asset Vision Analysis pipeline, Universal Asset Wizard flow, Director V2 core, Planner Stack, Scene Generation, Motion Handoff v25 infrastructure (extended to v26), Memory Bundles, Scene QA, Profitability Layer, Voice Marketplace, Asset Library, image/motion providers.

## Tests/build status

| Check | Status |
|-------|--------|
| `npx prisma validate` | pass |
| `npx prisma generate` | pass |
| `npm run lint` | pass |
| `npm run build` | pass |
| `npm run test` | **2191/2191 pass** |

Handoff version: **26**. Semantic recipe version: **1**.
