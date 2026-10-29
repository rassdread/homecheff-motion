# Production release runbook

Do not run this runbook under the V27.5 task. It needs a separate explicit approval. Current verdict is NO-GO, so this is a prepared procedure, not an authorization.

## Preconditions that are not met

- Vercel film export has not passed.
- Production blob delivery has not been exercised.
- Three production flags are UNVERIFIED.
- `20261020120000_studio_timeline` is not applied to production.

## When those are met and approval is given

1. Re-read the live deployment. Expect to start from `dpl_5P4UM9K9bdZzg2ZZM2cegi2ZNsCq` at `afbbd4cc` unless a later approved deploy already moved it.
2. Take the backup in `PRODUCTION_BACKUP_PLAN.md`.
3. Apply only the additive timeline migration to `neondb`.
4. Deploy the approved candidate. Do not change Node away from 24.x as part of this release.
5. Aliases `studio.homecheff.eu` and `motion.homecheff.eu` move together because they point at one project. Do not enable the Motion host redirect in the same step.
6. Smoke unauthenticated pages and one owned film read. Do not run a paid generation in the smoke.
7. Keep the previous deployment id for rollback.

Film export on the current candidate returns 503 on the Vercel worker runtime. Shipping that behavior without a working encoder is a product outage for export. Do not deploy it as the export fix.

## Isolated probe left behind

`prj_DsEQB7Sgm7rDm4kdBhkCn2LH9N0k` can be deleted after this report is accepted. It is not the live project.
