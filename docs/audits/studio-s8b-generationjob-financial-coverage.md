# S.8B — GenerationJob Financial Coverage

| Capability | Job | Notes |
|------------|-----|-------|
| SUBTITLE_GENERATE | YES | Preview E2E: mock STT charged once; replay `CACHE_HIT_NO_CHARGE`. Live ElevenLabs blocked by Preview API key permissions (job failed, `creditsCharged=0`). |
| TRANSLATE | YES | Preview E2E: prepare with `sceneTexts` overrides (`user_reviewed`); charged once; replay no charge. |
| IMAGE_GENERATE / VOICE_* / MUSIC / SFX / FUSION | YES | prior |
| VIDEO_GENERATE | Track-only | charge at create |
| Bulk/improve images | Bare | classified risk |
| IMAGE_EDIT / VISION | Bare / catalog | classified |

## Preview evidence (2026-08-09)

- Storyboard: `cmsm7y8ca0007ik047jnlztbm`
- STT job: `cmsm7ytz1000xik04e8m6yrdg` — succeeded, `creditsCharged=9`, `chargeFinalized=true`
- Translate project: `cmsm7z5td00012jw8tl2xqp1e`
- Translate job: `cmsm7zu9o0009kx04wo78az4x` — succeeded, `creditsCharged=23`, `chargeFinalized=true`
- Export: `cmsm7zwwd000dkx049ztyrk2m`
