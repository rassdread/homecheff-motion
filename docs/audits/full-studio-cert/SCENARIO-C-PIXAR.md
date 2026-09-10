# Scenario C — Pixar stress (Authenticated Production)

**Classification:** `PIXAR_STRESS` → **NOT_RUN**  
**Date:** 2026-08-22  

## Planned story

8-scene Anna/Bob bakery + red box + wardrobe change (per cert spec).

## Execution attempt

1. `POST /api/studio/storyboards` with title "Pixar cert closeout" → **400** `INVALID_STYLE_PROFILE` (`promptStyleProfile: "pixar_3d"` invalid)  
2. Did not proceed to bounded scene image generation.

## Credit gate (separate probe)

`POST .../generate-scene-images` on existing board → **403** `free_account_provider_action` (30 credits required).

## Bounded provider plan (not executed)

| Scene | Real provider |
|------:|:-------------|
| 1, 3, 5, 7 | OpenAI scene image |
| 2, 4, 6, 8 | Fixture / deferred |
| Scene 5 rerender | 1 edit call |

## Classifications

| Area | Status |
|------|--------|
| CHARACTER_A_CONSISTENCY | NOT_RUN |
| CHARACTER_B_CONSISTENCY | NOT_RUN |
| WARDROBE_CONTINUITY | NOT_RUN |
| SCENE_RERENDER | NOT_RUN |
| MULTI_CHARACTER | NOT_RUN |

## Smallest repair

1. Cert account: Studio `admin` role or promotional credits for bounded Production runs  
2. Use valid `promptStyleProfile` (e.g. `cinematic`) when creating cert storyboard via API
