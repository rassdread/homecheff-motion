# Deployment readiness

Outcome: deployment is blocked until the dialogue migration is approved and applied.

Production remains:

- URL: https://studio.homecheff.eu
- Deployment: `dpl_2DmsCPV1HMTMHjyC11ugwt61idqJ`
- Rollback of that deployment: `dpl_8LTyG31vcTywXhuJK9VioSrJKoqW`

## Why this commit cannot ship first

`loadStudioProjectWorkspace` selects `StudioScene.dialogueText`. `updateStudioScene` writes it. The generated Prisma client includes the column.

A feature flag around the form does not help. The select runs for every project workspace. On a database without the column, that request fails.

Preview and production share the Neon database. Pushing this branch would let Vercel build a preview that queries the missing column. That preview was not created. This commit stays local until the founder approves the migration.

## Independent voice-center test

The voice-center assertion change does not alter the product. It is in the same commit as the dialogue query, so it is not deployed by itself.

## Financial changes

None. The three pricing failures stay failing on purpose. See [PRICING_TEST_INVESTIGATION.md](PRICING_TEST_INVESTIGATION.md).

## Approval required

1. Confirm `STUDIO_HC_PACK_CATALOG` version `2026-09-universal-v1` is the commercial catalog, if those three tests should be updated later.
2. Approve applying `prisma/migrations/20261019153000_studio_scene_dialogue_text` to the shared database, after a verified backup.
3. Deploy this commit only after that migration has been applied.
