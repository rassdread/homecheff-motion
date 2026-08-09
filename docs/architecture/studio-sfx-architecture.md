# Studio SFX Architecture (S.7D)

## Honesty

- Ambience is an **SFX subtype**
- Render supports **one** SFX/ambience bed — not timed hits
- Scene cues remain planning metadata

## SFX Studio

`buildSfxStudio(storyboard)` — categories, semantic types, linked bed, reuse/preview.

## Scene sound

`buildStoryboardSceneSoundPlan` — environment/ambience/density/movement without timeline editor.

## Packs

`studio-sfx-experience-packs.ts` → Matrix `SFX_GENERATE` (PARTIAL).

## Generation

Existing GenerationJob path for `SFX_GENERATE` unchanged in ownership.
