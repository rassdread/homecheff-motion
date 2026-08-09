# Studio Experience Registry (S.6E)

Many UI doors → few canonical engines.

## Canonical IDs

Defined in `src/lib/studio-prompt-matrix/experience-ids.ts` (`StudioCreativeExperienceId`).

Examples:

| Fans / entry | Canonical ID |
|--------------|--------------|
| Fusion outfit / Character Studio outfit | `OUTFIT_CHANGE` |
| restaurant_promo / cooking_show | `RESTAURANT_PROMO` / `COOKING_SHOW` |
| Instant food_promo | `FOOD_PROMO` |
| Motion presets (65) | `MOTION_PRESET` (+ preset value) |
| Scene still IMAGE_GENERATE | `SCENE_STILL` |

SEO marketing slugs are **not** product experience IDs.

## Registry fields

`experienceId`, `family`, `modality`, `continuityRequirements`, `supportedModes`, `generationCapability`, `runtimeProvider`, `resultType`, `compliance`, `status`

## Families

IDENTITY · PHOTO · VIDEO · MOTION · FUSION · SOCIAL · BUSINESS · FOOD · LIFESTYLE · FASHION · VOICE · AUDIO · BRAND · RENDER · PUBLISH · STORY

## Migration honesty

Do not claim MATRIX_NATIVE for all experiences because scene stills are wrapped. Compliance is per registry entry (`listExperiencesByCompliance`).
