# Asset Wizard Source Reference Transformation Report

## Flow audit

| Path | Has sourceReference? | Reference choice step? | Source transform step? | Generate direct? |
|------|---------------------|------------------------|------------------------|------------------|
| design | No (unless user uploads later) | Yes (classic upload/generate/skip) | No | No |
| prompt_only | No | Yes | No | No |
| image_only | Yes (upload in input) | **Skipped** | **Yes** | **Yes** |
| image_and_prompt | Yes | **Skipped** | **Yes** | **Yes** |
| derive_from_reference | Yes (derive_source) | **Skipped** | No (uses derive_transform) | **Yes** |
| existing_asset | Yes | **Skipped** | No (uses derive_transform) | **Yes** |
| upload as source | Yes (`sourceReference*`) | Skipped when source present | Yes for image paths | Yes |
| existing asset as source | Yes | Skipped | derive_transform instead | Yes |

When `sourceReferenceImageUrl` or library source is present, the wizard skips “How do you want the reference image?” and routes to transformation → generation preview.

## Double reference step removed

- `shouldSkipReferenceModeChoice()` hides upload / Studio generates / Add later when a source image already exists.
- Reference step shows “Studio uses this image as the basis.” with generate preview, edit prompt, and change source actions.
- Input upload for `image_only` / `image_and_prompt` stores `sourceReference*` only; official `referenceImageUrl` is set after the user accepts the generated variant.

## Source transformation prompt

New wizard step `source_transform` (“What do you want to make from this?”):

- Dynamic chips per asset kind (character / prop / location).
- Custom prompt field: “Describe what Studio should change while style and form stay the same.”
- `buildSourceTransformSummaryPrompt()` writes the live summary used for generation.

## Prompt preservation rules

Generation prompts always include when a source exists:

- Preserve source shape language, main colors, brand style, mascot identity.
- Change only role, outfit, props, or context.
- User custom text is passed via `sourceReference.userPrompt` into `sourceReferenceBlock()`.

## Generated variant review

Reference step (source flow) shows:

- Source image (left) vs generated variant (right).
- Transformation summary prompt.
- Actions: Use as official reference, Regenerate, Edit prompt, Change source.

## Generic user behavior

- `buildSourceTransformChoiceDef()` uses `detectRecommendedRoleIds()` — Chef/Garden/Designer appear only when the user library or metadata contains those roles.
- Generic users see host, mascot, narrator, packaging, cinematic, etc.

## Asset type coverage

| Kind | Source transform | Image reference generation |
|------|------------------|----------------------------|
| Character | Yes | Yes |
| Prop | Yes | Yes |
| Location | Yes | Yes |
| World | No | No (unchanged) |

## Tests/build status

| Check | Status |
|-------|--------|
| prisma validate | pass |
| prisma generate | pass |
| lint | pass (0 errors) |
| build | pass |
| tests | **2171/2172** pass (1 unrelated DB connectivity flake in `refresh-studio-intelligence.test.ts`) |

New suite: `src/lib/studio-asset-wizard-source-flow.test.ts` (11 tests).
