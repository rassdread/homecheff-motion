# Asset Reference 502 Final Fix Report

## Exact model in production

The OpenAI image model is resolved by `resolveOpenAiImageModel()` from:

1. `STUDIO_SCENE_IMAGE_MODEL` (primary)
2. `OPENAI_IMAGE_MODEL` (fallback — **was not read before this fix**)
3. default `dall-e-3`

Production likely sets **`gpt-image-*`** via `OPENAI_IMAGE_MODEL` while the runtime previously defaulted to `dall-e-3` for body building, or sets `STUDIO_SCENE_IMAGE_MODEL=gpt-image-1` with a deploy that still sent `response_format`.

Check Vercel/server logs for:

```
[asset-references/generate] … "model":"gpt-image-…"
[studio-openai-image-generations] … "includesResponseFormat":false
```

## Exact body before fix

Before this fix, the wire body was built in `OpenAiSceneImageProvider.generate()` via `buildOpenAiImageGenerationsBody()` and passed directly to `fetch()` with **no final strip**. If any helper/version mismatch re-introduced `response_format`, it went straight to OpenAI.

Example failing body:

```json
{
  "model": "gpt-image-1",
  "prompt": "…",
  "n": 1,
  "size": "1024x1024",
  "response_format": "url"
}
```

OpenAI returns: `Unknown parameter: 'response_format'`.

## Why previous fix missed it

1. **No hard strip at fetch time** — helper gating was correct in source, but nothing enforced it on the final JSON sent to OpenAI.
2. **`OPENAI_IMAGE_MODEL` ignored** — production may resolve model from a different env key than tests (`STUDIO_SCENE_IMAGE_MODEL` only).
3. **Logging gap** — no server log of actual body keys at fetch time, so production could still run an older bundle or mismatched env without visibility.

## Final strip location

`src/lib/openai-image-generation.ts`:

- `stripUnsafeOpenAiImageGenerationParams()` — deletes `response_format` when `body.model` starts with `gpt-image` (case-insensitive) or model does not support it.
- `prepareOpenAiImageGenerationsBody()` — build + strip.
- `fetchOpenAiImageGenerations()` — **strip again immediately before `fetch()`** (last-line safety net).

Call chain for asset reference:

`POST /api/studio/asset-references/generate` → `generateAssetReference()` → `generateImageBuffersFromPrompt(logRoute=…)` → `OpenAiSceneImageProvider.generate()` → `fetchOpenAiImageGenerations()`.

## Temporary logging

- Route: `[asset-references/generate]` — model, provider, env keys.
- Service: `[studio-openai-image-generations]` — pre-call metadata.
- Fetch: `[studio-openai-image-generations]` — **actual body keys + `includesResponseFormat`** immediately before OpenAI.

## User-facing error

Unchanged: `studio.assetCreation.reference.generateFailedUser` →  
**“Generatie mislukt. Probeer opnieuw of upload een afbeelding.”**  
Admin/debug still receives `providerMessage` in API response.

## Tests/build status

| Check | Status |
|-------|--------|
| prisma validate | pass |
| prisma generate | pass |
| lint | pass (0 errors) |
| build | pass |
| tests | **2189/2189** pass |

- `openai-image-generation.test.ts` — strip, prepare, `OPENAI_IMAGE_MODEL` fallback
- `openai-provider.test.ts` — provider + `fetchOpenAiImageGenerations` hard strip
- `studio-asset-reference-generate-path.test.ts` — full asset-reference path with `gpt-image-1`
