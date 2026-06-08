# Asset Reference Production Bugfix Report

## Actual failing route

`POST /api/studio/asset-references/generate`

Call chain:

1. `src/app/api/studio/asset-references/generate/route.ts`
2. `generateAssetReference()` → `src/server/studio/studio-asset-reference-service.ts`
3. `generateImageBuffersFromPrompt()` → `src/server/studio/studio-image-generation-core.ts`
4. `getSceneImageProvider().generate()` → `OpenAiSceneImageProvider` in `src/server/scene-image-providers/openai-provider.ts`
5. OpenAI `POST https://api.openai.com/v1/images/generations`

There is no alternate image-generation path for this route.

## response_format root cause

Production uses `STUDIO_SCENE_IMAGE_MODEL=gpt-image-*` (or similar). Those models reject `response_format` on `/v1/images/generations`.

The provider already routes through `buildOpenAiImageGenerationsBody()`, but model detection was too narrow (exact `dall-e-2` / `dall-e-3` only). Unknown or prefixed models could still receive `response_format` in older builds.

## safe image body fix

`src/lib/openai-image-generation.ts`:

- `gpt-image-*` → never send `response_format`
- `dall-e-2*` / `dall-e-3*` → send `response_format: "url"`
- anything else → omit `response_format`

Verified by:

- `src/lib/openai-image-generation.test.ts`
- `src/server/scene-image-providers/openai-provider.test.ts`
- `src/server/studio/studio-asset-reference-generate-path.test.ts` (full asset-reference path)

## duplicate reference step root cause

Two issues:

1. **Detection gap** — `hasWizardSourceReference()` did not treat `derivationSource.referenceImageUrl` as a source, so `shouldSkipReferenceModeChoice()` could be false after derive/upload flows.
2. **Step injection** — derivation entry paths always included a static `reference` step before source existed, and the upload exception in `shouldSkipReferenceModeChoice()` could re-show the mode grid.

## source-reference wizard fix

- `hasWizardSourceReference()` now checks `sourceReference*`, `derivationSource.*`, and `derivationSource.assetId`.
- `shouldSkipReferenceModeChoice()` is simply “has source reference”.
- `injectSourceReferenceWizardSteps()` only adds `reference` when a source exists (or for non-source flows that need it: design / prompt / choice).
- Derivation/image source flows: `source_transform` → `reference` (variant generation), never mode choice.
- Reference step UI guard uses `sourceFlow` and shows source-transform copy instead of `studio.assetCreation.reference.title`.
- Progress label shows “Genereer variant” when source exists.

## production verification checklist

- [ ] Deploy with `STUDIO_SCENE_IMAGE_MODEL=gpt-image-1` (or prod value)
- [ ] `/studio/characters/new?guided=1` → derive flow → upload source → style DNA → target kind → transform → preview → **Generate variant** (not “Hoe wil je de referentieafbeelding maken?”)
- [ ] Click generate → `POST /api/studio/asset-references/generate` returns 200 (not 502)
- [ ] On failure, user sees friendly copy; admin sees `providerMessage` in API response
- [ ] Repeat for `image_only`, `image_and_prompt`, library source pick

## tests/build status

| Check | Status |
|-------|--------|
| prisma validate | pass |
| prisma generate | pass |
| lint (changed files) | pass |
| build | pass |
| tests | **2186/2186** pass |
