# Asset Image-to-Image Identity Preservation Report

Audit & implementation date: 2026-06-08

## Current generation architecture

```
POST /api/studio/asset-references/generate
  └─ generateAssetReference()                    [studio-asset-reference-service.ts]
       ├─ resolveAssetGenerationIntent()
       ├─ buildAssetReferenceGenerationPrompt()  OR buildDerivationReferenceGenerationPrompt()
       ├─ generateImageBuffersFromPrompt()       [studio-image-generation-core.ts]
       │    └─ OpenAiSceneImageProvider.generate()
       │         ├─ TRANSFORM + source image → POST /v1/images/edits  (gpt-image-*)
       │         └─ otherwise                → POST /v1/images/generations
       └─ uploadStudioAssetReferenceBuffers()
```

Client orchestration (`runAssetReferenceGeneration`) runs vision pre-analysis, generation, post-gen fidelity scoring, and auto-recovery when fidelity < 60%.

## Source image audit

| Stage | Source image used? | Details |
|-------|-------------------|---------|
| Vision / style DNA | Yes | `POST /v1/chat/completions` with `image_url` |
| Image generation (before) | **No** | Text prompt only — identity drift root cause |
| Image generation (after) | **Yes** | Source URL fetched and sent to `/v1/images/edits` when `TRANSFORM_EXISTING_ASSET` |

**Priority order enforced in prompts:**

1. Source Image  
2. Identity Fingerprint  
3. Brand Identity  
4. Asset Family  
5. Preserve Rules  
6. Change Rules  
7. Forbidden Rules  
8. User Instructions  

## Image-input capability findings

### Supported (same OpenAI provider)

| Capability | Endpoint | Models |
|------------|----------|--------|
| Text-to-image | `/v1/images/generations` | dall-e-2/3, gpt-image-* |
| Image edit (source transform) | `/v1/images/edits` | gpt-image-*, dall-e-2 |
| High input fidelity | `input_fidelity=high` | gpt-image-1, gpt-image-1.5 |
| Vision analysis | `/v1/chat/completions` | gpt-4o-mini / env vision model |

### Unsupported (no parallel pipeline added)

- `/v1/images/variations` — not wired (edit covers transform use cases)
- dall-e-3 image edit — falls back to `gpt-image-1` via `resolveOpenAiImageEditModel()`
- Mask-based inpainting — not required for mascot outfit transforms

### Best identity-preserving path

When source image exists → `TRANSFORM_EXISTING_ASSET` → `/v1/images/edits` with `input_fidelity=high` + identity lock prompt blocks.

## Transform-existing implementation

- **`resolveAssetGenerationIntent()`** — returns `TRANSFORM_EXISTING_ASSET` when source image, parent asset, or derivation source exists
- **`OpenAiSceneImageProvider`** — branches to edit API; logs `generationMode: image_edit`
- **Fallback** — if edit model unsupported, text-to-image with full identity lock prompts (logged warning)

Examples covered:

| Source | Variant | Mode |
|--------|---------|------|
| Globe Man | Chef / Garden / Designer | TRANSFORM_EXISTING_ASSET + image_edit |
| Packaging | Premium | TRANSFORM_EXISTING_ASSET |
| Location | Night | TRANSFORM_EXISTING_ASSET |
| Logo | Dark variant | TRANSFORM_EXISTING_ASSET |

## Identity fingerprint enforcement

**P1 (locked):** face, shape, silhouette, proportions, outline  
**P2 (locked):** colors, branding  
**P3 (preserve):** pose, expression — locked at level 2  
**P4 (changeable):** outfit, accessories, environment  

`buildFingerprintLockBlock(level)` prepended in all source transforms. Level 2 activated on strict regeneration or auto-recovery.

## Fidelity validation results

Post-generation vision re-analysis compares source vs generated:

| Score | Weight |
|-------|--------|
| identity | 35% of overall |
| color | 20% |
| shape | 15% |
| brand | 15% |
| family | 15% |

**Recovery tiers:**

| Overall | Action |
|---------|--------|
| ≥ 80% | OK |
| < 80% | Warning in UI |
| < 60% | Auto-regenerate with identity lock level 2 |
| < 40% | Identity failure — advise alternate approach |

## Motion integration impact

`SceneSemanticRecipe` extended with top-level `brandIdentity` (alongside existing `assetFamily`, `identityFingerprintSummary`).  
`formatSceneSemanticRecipeForMotion()` now includes brand identity for Storyboard → Director → Motion → Render continuity.

## Tests/build status

New/updated tests:

- `studio-asset-generation-intent.test.ts`
- `openai-image-generation.test.ts` (edit model + form data)
- `studio-asset-identity-preservation.test.ts` (P1-P4 lock, recovery tiers, Globe Man scenarios)
- `studio-asset-reference-generate-path.test.ts` (edit path with FormData)

Run validation:

```bash
npx prisma validate && npx prisma generate
npm run lint && npm run build && npm run test
```

## Key files changed

| File | Change |
|------|--------|
| `src/lib/openai-image-generation.ts` | `/v1/images/edits` client + model resolution |
| `src/server/scene-image-providers/openai-provider.ts` | Source-image edit branch |
| `src/server/studio/studio-asset-reference-service.ts` | Wire source URL + intent |
| `src/lib/studio-asset-identity-preservation.ts` | P1-P4 lock, family score, recovery tiers |
| `src/lib/studio-asset-wizard-reference-generation.ts` | Auto-recovery loop |
| `src/types/studio-scene-semantic-recipe.ts` | `brandIdentity` on recipe |

No new provider. No schema migration. No new wizard.
