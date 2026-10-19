# Production deployment

This file is completed after the V14 production promotion. The migration itself is already recorded in [MIGRATION_EXECUTION_REPORT.md](MIGRATION_EXECUTION_REPORT.md).

Rollback target before this release: `dpl_2DmsCPV1HMTMHjyC11ugwt61idqJ` on https://studio.homecheff.eu.

The earlier V12 deployment `dpl_8LTyG31vcTywXhuJK9VioSrJKoqW` remains the rollback of that V13 deployment. If V14 misbehaves, restore `dpl_2DmsCPV1HMTMHjyC11ugwt61idqJ`. Do not drop `dialogueText`.
