# Production release plan

This plan is not authorized and was not executed.

1. Source commit: `dcd0caea75b6d08755c4431ceebc3eba651f10b7` only. Do not deploy the port-3456 checkout.
2. Vercel project: `homecheff-motion` / `prj_29omEPF5Hmob1eGlRjoJNb9t3m2f`. Never `homecheff-app`.
3. Current live deployment: `dpl_5P4UM9K9bdZzg2ZZM2cegi2ZNsCq`.
4. Rollback deployment: the same id, aliases returned to that deployment.
5. Environment: do not add `STUDIO_FILM_CERT_LOCAL_AUTH` or `STUDIO_DISPOSABLE_LOCAL_AUTH`. Do not set `STUDIO_SCENE_IMAGE_PROVIDER=mock` on production. Leave the OpenAI, ElevenLabs, Stripe, blob, and FFmpeg variables as they are. Read `HOMECHEFF_IDENTITY_ORIGIN`, `LEGACY_STUDIO_LOGIN_ENABLED`, and `STUDIO_CENTRAL_HC_SPEND_ENABLED` in the Vercel UI before the release. Do not print them into the repo.
6. Database: production `ep-wild-morning-alynrf2i` / `neondb`.
7. Migration, only after a backup and a separate approval: `20261020120000_studio_timeline`. Do not run `migrate reset`, `db push`, or a seed.
8. Storage: existing blob token. Do not point production at `file://` or `STUDIO_LOCAL_MEDIA_DIR`.
9. Providers: OpenAI and ElevenLabs keys are already present. Do not switch production to mock.
10. Build: `npm run build` passed on Node v25.6.1 in 18.7s compile, TypeScript 50s, 536 pages. The project setting is Node 24.x. Repeat the build on the Vercel Node 24 image before promoting.
11. Runtime: region `fra1`. The film render route needs an explicit `maxDuration` consistent with the existing 300-second render routes, then a timed export. That code change is not in this commit.
12. Health checks after a future release: `/`, `/login`, `/motion`, `/editor/start`, `/studio/quick-ad`, `/studio/experience` return 200; `/api/studio/projects` returns 401 without a session; an existing project still opens; a wallet balance is unchanged for a user who does not generate.
13. Post-release: create one film only if the operator accepts HC and provider cost. Confirm a timeline row exists only after the migration. Export one short MP4 and confirm the blob URL is `https` rather than `file://`.
14. Rollback triggers: login failure, wallet debit on a mock or failed generation, 5xx on `/motion` or `/editor/start`, export timeout, or any write to the wrong database.
15. Rollback: promote `dpl_5P4UM9K9bdZzg2ZZM2cegi2ZNsCq` back onto both aliases. Do not drop the new tables.
16. User data: 24 users, 18 wallets, 82 ledger rows, 46 animation projects, 87 editor projects, 92 scene images, 3 creative projects, 10 library assets. Do not replace the database.
17. Expected downtime: none for an alias swap, plus a short lock while the foreign key is added if the migration runs first.
18. Provider cost of the release itself: zero if nobody generates. A practical test that generates images or voice spends HC and provider money.
19. Infrastructure cost: one production deployment of the existing project. No new project.
20. Approvals still required: the user, for deployment, for the migration, and for any paid generation. This document is not that approval.

Do not create a new Preview as a substitute for this release.
