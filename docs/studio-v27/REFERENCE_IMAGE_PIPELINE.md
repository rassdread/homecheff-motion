# Reference image pipeline

## Upload

`POST /api/uploads/images` accepts jpeg, png, and webp, normalizes through Sharp, and stores working and thumbnail blobs. The response includes `workingImageUrl` and `thumbnailUrl`.

## Character, location, and prop references

Create validation requires both `referenceImageUrl` and `referenceStorageKey`, and the URL must be HTTP. `createStudioCharacter` writes both fields. Film action `ASSOCIATE_CHARACTER_REFERENCE` copies a library preview onto the character and returns `creditsConsumed: 0`.

## Scene stills

`pickReferenceUrlsForStillAdapter` ranks references and returns at most four URLs. `OpenAiSceneImageProvider.generateFromReferenceEdit` downloads the first URL as the edit base and sends up to three more as `image[]`. A failed reference edit falls back to text-to-image and sets `identityPreservation: "text_fallback"`. The mock scene-image provider does not call a model.

V27 test `keeps reference images in the still adapter payload` calls `pickReferenceUrlsForStillAdapter` with a character URL and a logo URL. The logo is ranked first because `MUST_PRESERVE` logos sort ahead of characters. This is the adapter selection, not a live OpenAI call.

## Photo to video and Instant

Classic animation projects store `previewUrl` on ordered images. Instant stores `previewUrl`, `storageKey`, and `viduInputUrl`. The animation job passes those URLs into `createStartEndVideoJob` or `createMultiImageVideoJob`. Vidu resolves them with `resolvePublicImageUrlForVidu`. `MockVideoProvider` records a fake job and does not read the URLs.

Homepage blob URLs are not copied into the wizard query. Only `https` URLs are passed as `sourceImage`. The wizard's own file input remains the upload that persists.

Quick Ad reads `sourceImage` when it is an HTTP URL and shows it as the selected photo. Photo to video shows `idea` and still uses its own upload control for local files.

## Film return

Scene wizard links include `returnTo=/studio/projects/:id?section=scenes&workflow=film&scene=:sceneId` only when `safeStudioProjectReturnTo` accepts that path. The scene image URL is included when it is HTTP.
