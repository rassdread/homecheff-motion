# Production release plan

Not authorized. Not executed.

Candidate for both the worker and the Studio app: `4880f88844e0b3f2a8dcef1bec36eee4c210f3ae`.

Do not deploy `c722b35b`. That commit still waits up to 180 seconds for the MP4. The worker and the app in this release have to move together to the new contract.

1. Read production `_prisma_migrations` again. The timeline migration was not re-queried here.
2. Confirm a backup or restore point.
3. Apply only `20261020120000_studio_timeline` if it is still absent. It is additive. Do not drop anything.
4. Deploy the existing Render service `homecheff-motion` at `4880f888`. Do not create a second service.
5. Read `GET /health` and confirm `sourceCommitSha`. Read `GET /health/video`. Do not post a customer job.
6. Confirm instant-premium, language-export, and marketplace routes still answer their existing auth checks.
7. `POST /jobs/film-timeline/:jobId/render` with a bad token should be 401. Do not create a real film job in this step.
8. Deploy the Studio app at the same commit. This is the point customers can start a film export.
9. Check login and the existing HC gates on a non-production account.
10. A separate approval is required before any production synthetic export.

The current live app does not call the film route, so step 4 does not by itself expose film export. Step 8 does.

Old app plus this worker: Motion routes are unchanged in source. Film export on the unreleased `c722b35b` app would see HTTP 202 instead of a finished MP4 and would show a failure. Do not leave that pair in production. The live app predates the film route, so it does not hit it.
