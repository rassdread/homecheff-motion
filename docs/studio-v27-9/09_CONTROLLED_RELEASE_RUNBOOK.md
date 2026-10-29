# Controlled release runbook

Not authorized. Not executed. Each numbered approval is separate.

The worker deploy restarts `homecheff-motion` and drops any Motion render that is in that process. Do that only when no customer render is running. The migration lock is the short foreign-key check on `StudioCreativeProject`.

## Before any change

1. Read `GET /health` and record `sourceCommitSha`. Read the Render deployment id in the dashboard. It is UNVERIFIED here.
2. Renew Vercel access and record the production deployment id. Do not trust `dpl_5P4UM9K9bdZzg2ZZM2cegi2ZNsCq` until it is read again.
3. Re-read `_prisma_migrations`. On 2026-10-29 the newest finished name was `20261019153000_studio_scene_dialogue_text`.
4. Read the three flags that are still UNVERIFIED. Do not change them in this release. Confirm `VIDEO_RENDER_MODE` is still `worker` and the worker host is still `homecheff-motion.onrender.com`.
5. Approval A: create a Neon branch or record the restore timestamp. See `06_DATABASE_MIGRATION.md`.

## Schema

6. Approval B: `npx prisma migrate deploy` for `20261020120000_studio_timeline` only, against the confirmed production URL.
7. Read the three new tables and the six row counts. Stop if the counts moved.

The current live app and live worker keep running after step 6.

## Worker

8. Approval C: deploy `4880f88844e0b3f2a8dcef1bec36eee4c210f3ae` to the existing Render service. Do not create a service. The image build is still BLOCKED, so this approval is not ready until `02_WORKER_IMAGE.md` has a real build.
9. `GET /health` must show that commit. `GET /health/video` must still report `/usr/bin/ffmpeg`.
10. Confirm the old routes answer their existing auth failures. Do not start a Motion job.
11. `POST /jobs/film-timeline/does-not-exist/render` with a wrong bearer must be 401. Do not create a film row.

Customers still cannot export a film. The live app does not call this route.

## Application

12. Approval D: deploy Studio at the same commit `4880f888`. This is the step that exposes film export. It also replaces `motion.homecheff.eu`, because both domains are aliases of this project.
13. Check login and an existing paid gate with a non-production account. Film export must stay 0 HC.
14. Approval E: one synthetic production export, including the Blob checks in `04_STORAGE_DEPENDENCIES.md`.
15. Read health, deployment ids, and the migration row again.

Do not include a domain redirect. That is a later approval and is not in this candidate.
