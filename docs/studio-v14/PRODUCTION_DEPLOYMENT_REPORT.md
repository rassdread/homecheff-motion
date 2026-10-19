# Production deployment

Date: 2026-10-19

PRODUCTION_DEPLOYMENT = LIVE

## What shipped

| Item | Value |
| --- | --- |
| Repository | `rassdread/homecheff-motion` |
| Branch | `feature/passion-character-masters-production` |
| V14 feature commit | `3aa7c7e1260fa188fd5790d28c7b0f94a8f0f297` |
| Deployed commit | `afbbd4cc5e7017ac4dce660793642b855a525ed5` |
| Preview deployment | `dpl_CcAeccbatbuqHyU2vbv3C1KQEkia` |
| Production deployment | `dpl_5P4UM9K9bdZzg2ZZM2cegi2ZNsCq` |
| Production URL | https://studio.homecheff.eu |

The deployed commit contains the dialogue implementation and the catalog test corrections. The column already existed before the push, so the preview did not query a missing column.

## Rollback

Restore production deployment `dpl_2DmsCPV1HMTMHjyC11ugwt61idqJ`. That is the V13 application that was live before this release.

Do not drop `dialogueText`. The column is nullable and existing scenes have it set to null. V13 does not select it, so leaving the column in place is safe.

The older V12 deployment `dpl_8LTyG31vcTywXhuJK9VioSrJKoqW` is the rollback of V13, not the first rollback for V14.

## Scope

Studio only. No marketplace change, no wallet mutation, no Stripe change, no HC grant change, no paid provider call, and no character-master regeneration.
