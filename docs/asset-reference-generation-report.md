# Asset Reference Generation Report

## Audit result

**Positive — safe to reuse existing stack.**

| Question | Answer |
|----------|--------|
| What generates images today? | `OpenAiSceneImageProvider` via `getSceneImageProvider()` → DALL-E 3 (`STUDIO_SCENE_IMAGE_MODEL`) |
| Reusable for asset refs? | **Yes** — provider is prompt-only; no scene coupling |
| Scene-specific parts | `StudioSceneImage` rows, storyboard access, consistency/vision QA, scene prompt builder |
| Extracted | `generateImageBuffersFromPrompt`, `buildAssetReferenceGenerationPrompt`, `uploadStudioAssetReferenceBuffers`, `generateAssetReference` |

No new provider. No schema migration. No parallel pipeline.

## Existing image generation architecture

```
Scene (today):
  API → generateStudioSceneImage → runSceneImageGeneration
      → buildSceneImageGenerationPrompt (scene context)
      → getSceneImageProvider().generate()
      → uploadStudioSceneImageBuffers
      → StudioSceneImage row + metering

Asset reference (new):
  API → generateAssetReference
      → buildAssetReferenceGenerationPrompt (wizard summary)
      → generateImageBuffersFromPrompt (same provider)
      → uploadStudioAssetReferenceBuffers
      → return URLs to wizard draft → save on asset create
```

## Reused systems

- `SceneImageProvider` / `OpenAiSceneImageProvider` / `MockSceneImageProvider`
- `uploadPublicBlob` (Vercel Blob)
- `meterOpenAiSceneImage` with feature `asset_reference_generate`
- `buildWizardSummaryPrompt` → `buildAssetReferenceGenerationPrompt` (no second builder)
- Wizard reference upload path unchanged (`postWizardImageUpload`)

## Asset generation implementation

| File | Role |
|------|------|
| `src/lib/studio-asset-reference-prompt.ts` | Summary → DALL-E prompt + kind boosts |
| `src/server/studio/studio-image-generation-core.ts` | Thin provider wrapper |
| `src/server/studio/studio-asset-reference-blob.ts` | `studio/{ownerId}/wizard-references/{kind}/{id}/` |
| `src/server/studio/studio-asset-reference-service.ts` | `generateAssetReference()` |
| `src/app/api/studio/asset-references/generate/route.ts` | GET status + POST generate |
| `src/lib/studio-asset-reference-client.ts` | Client API |
| `src/components/studio/studio-wizard-reference-step.tsx` | Generate UI in wizard |

## Character generation

Portrait framing + personality/outfit/world/style boosts from wizard `choices` → `applyWizardChoicesToFields`.

## Prop generation

Product/hero prop framing + category/material/color/usage boosts.

## Location generation

Establishing-shot framing + type/mood/architecture/lighting boosts.

## Reference assignment

1. User selects **Laat Studio genereren**
2. Auto-start generation (skeleton + status)
3. Preview with **Gebruik als officiële referentie** / **Opnieuw genereren** / **Keuzes aanpassen**
4. On accept → `referenceImageUrl` + `referenceStorageKey` on draft
5. Save → existing create APIs persist reference on asset

## Readiness impact

Review step uses existing readiness engines; when `referenceImageUrl` is set after accept, reference domain scores as attached (same as upload path).

## Mobile UX

- Skeleton preview during generation
- Full-width action buttons
- User stays in wizard (no redirect, no builder)

## Tests/build status

- **Build**: pass
- **Tests**: 2109/2109 pass
- `studio-asset-reference-prompt.test.ts` — 3/3 prompt tests
- `studio-asset-reference-service.test.ts` — validation + optional mock/live generate
- Wizard flow tests updated for generate advance guard
- **Prisma**: no schema changes; validate/generate OK
