# Asset Wizard Transformation Prompt Confirmation Report

## Root cause

`StudioWizardReferenceStep` auto-started generation via a `useEffect` when `referenceMode === "generate"`, `summaryPrompt` was set, and status was `idle`. After variant selection, the summary prompt was populated immediately — so clicking **Next** landed on the reference step and triggered `POST /api/studio/asset-references/generate` without user confirmation.

## Auto-generation removed

- Removed the auto-generate `useEffect` from the reference step.
- Source flows never call the generate API on step enter, variant select, or **Next**.
- Non-source choice flows now show an explicit **Generate variant** button when idle.

## Prompt confirmation step

New wizard step `transform_prompt` inserted before `reference` for all source-based flows:

- `source_transform` → **`transform_prompt`** → `reference` (image paths)
- `derive_preview` → **`transform_prompt`** → `reference` (derivation paths)

Fields:

1. Free instruction (`sourceTransformInstruction`)
2. Preserve (`sourceTransformPreserve` + chips)
3. Change (`sourceTransformChange` + chips)
4. Forbidden (`sourceTransformForbidden`)

## Prompt preview

Confirmation UI shows basis, variant, preserve, change, forbidden, and compact final prompt before generation.

## Explicit generate action

Only the **Genereer variant** / **Generate variant** button on `transform_prompt` starts generation. Wizard **Next** is hidden on that step. After success, the wizard advances to the reference review step.

## Generation payload

`buildReferenceGenerationPayload()` sends:

- `summaryPrompt` from `buildSourceTransformSummaryPrompt()`
- `sourceReference.userPrompt`, `preserveHint`, `changeHint`, `forbiddenHint`
- Included in `buildAssetReferenceGenerationPrompt()` source block

Empty instruction still uses smart defaults from variant + preserve chips; user must still click **Generate variant**.

## Review flow

Unchanged after generation: source vs variant side-by-side, accept official reference, regenerate, edit prompt (back to `transform_prompt`), change source.

## Tests/build status

| tests | **2190/2190** pass |

New tests: `studio-asset-transform-prompt.test.ts`, updated source-flow and reference-prompt tests.
