# Asset Wizard Source Flow Step Sequence Bugfix Report

## Root cause

After `derive_preview` (or image upload paths), the wizard still landed on the generic **reference mode choice** step because:

1. `derivationSource` was not counted as a wizard source reference.
2. Derivation entry paths hard-coded `reference` in the base step list regardless of source state.
3. `shouldSkipReferenceModeChoice()` had an upload exception that could force the mode grid back on.

## Step sequence fix

**Before (derive):**  
Stijlbasis → Maken als → Transformatie → Preview → **Referentie (mode choice)** → Controle → Opslaan

**After (with source):**  
Stijlbasis → Maken als → Transformatie → Preview → **Genereer variant** → Controle → Opslaan

Implementation:

- Removed static `reference` from `wizardStepsForDerivationFlow()` and derive entry paths in `wizardStepsForEntryPath()`.
- `injectSourceReferenceWizardSteps()` inserts `reference` only when `shouldIncludeReferenceStep()` is true (source present, or non-source flows that need reference choice).
- Image paths: `source_transform` → `reference` (variant panel).

## Render guard fix

`StudioWizardReferenceStep`:

- `sourceFlow = shouldSkipReferenceModeChoice(draft) || hasWizardSourceReference(draft)`
- When `sourceFlow`, never renders `REFERENCE_CHOICE_DEF` (“Hoe wil je de referentieafbeelding maken?”).
- Shows source-transform title/lead + variant generation/review panel instead.

## response_format production fix

Same as asset-reference report: `buildOpenAiImageGenerationsBody()` gates `response_format` by model family; asset-reference generate path tested end-to-end.

## Screenshot flow verification

Automated in `src/lib/studio-asset-wizard-source-flow.test.ts`:

- Derivation with `derivationSource` only → skips reference mode choice
- Steps: `derive_preview` → `reference` → `readiness` when source exists
- `showReferenceModeChoice: false` in audit for `derive_from_reference`
- Progress label key → `studio.assetCreation.wizard.step.generateVariant`

Manual checklist:

1. Upload source image
2. Style DNA ready
3. Choose Character → Mascot
4. Preview summary shown
5. Next step = generate variant panel (not upload/generate/later grid)
6. Accept → readiness → save

## Tests/build status

| Check | Status |
|-------|--------|
| prisma validate | pass |
| prisma generate | pass |
| build | pass |
| tests | **2186/2186** pass |

New/updated tests:

- `studio-asset-wizard-source-flow.test.ts` — derivation step sequence + screenshot flow
- `studio-asset-wizard-generation.test.ts` — `derivationSource` detection
- `openai-image-generation.test.ts` — gpt-image + unknown models
- `openai-provider.test.ts` — provider body safety
- `studio-asset-reference-generate-path.test.ts` — asset reference API path
