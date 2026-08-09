# Studio Music Identity (S.7D)

**Depends on:** S.7B Audio Foundation · S.7C Voice (frozen)

## Law

- Scene owns music intention (planning)
- Project/Storyboard owns reusable music themes + linked bed
- Creative Director recommends genre/tempo/emotion/energy (`forced: false`)
- Prompt Matrix assembles AudioSpecification
- Provider Transform owns ElevenLabs music payload
- GenerationJob executes (`MUSIC_GENERATE`)
- Render mixes one project music bed (honest current capability)

## Music Studio

`buildMusicStudio(storyboard)` → themes (primary/secondary/brand/intro/outro/ending), characteristics, linked asset, reuse/preview policy.

## Scene music

`buildStoryboardSceneMusicPlan` — theme/emotion/intensity/timing/purpose without generating.

## Packs

`studio-music-experience-packs.ts` → Matrix `MUSIC_GENERATE` (PARTIAL).
