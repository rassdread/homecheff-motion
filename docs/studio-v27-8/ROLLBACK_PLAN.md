# Rollback

No rollback was executed.

Worker:

- Live commit on 2026-10-29: `4f6ca34a04873d39ed832a2b3f2dd0d52a4c37ca`
- Live deployment id: UNVERIFIED. The Render API was not used.
- Docker image digest: UNVERIFIED. The image was not inspected.
- Rollback is a redeploy of that commit on the existing service, then `GET /health` must show that `sourceCommitSha`.
- Recovery time: UNVERIFIED.

Studio app:

- Last recorded deployment `dpl_5P4UM9K9bdZzg2ZZM2cegi2ZNsCq` is HISTORICAL. The Vercel API returned HTTP 403 in this pass, so the id was not reconfirmed. Do not rely on it until it is read again.

Database:

- Leave `20261020120000_studio_timeline` in place after an app rollback if it was applied. The current live app and the live worker do not read those tables.
- Do not drop the tables. Do not restore production data as part of this plan.

A rolled-back app with the new worker still in place does not call the film route if the rollback target is the current live app. A rolled-back worker with the new app returns 404 for film export and the job fails closed.
