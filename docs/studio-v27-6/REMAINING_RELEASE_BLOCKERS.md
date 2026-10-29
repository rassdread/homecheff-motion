# Remaining release blockers

The film route can now target the existing worker. Production is still NO-GO.

1. The live worker is commit `4f6ca34a` and has no `/jobs/film-timeline` route. Shipping the app commit alone would call a missing route. A worker deploy needs a separate approval and was not done.
2. A film encode on the live worker was not run. Live H.264 and AAC are unverified.
3. Production blob upload of a film export was not run.
4. `HOMECHEFF_IDENTITY_ORIGIN`, `LEGACY_STUDIO_LOGIN_ENABLED`, and `STUDIO_CENTRAL_HC_SPEND_ENABLED` stayed unverified in V27.5. This task did not decrypt them.
5. The Vercel deployment id was not re-read. The API returned HTTP 403.
6. Timeline migration `20261020120000_studio_timeline` is still not applied to production. V27.5 already rehearsed it. It was not repeated.
7. Certified worker film length is the one-second fixture. The local in-process matrix still covers 3 seconds. The worker HTTP wait is 180 seconds. Longer films are not certified.
8. Motion host redirect stays off.

No production database, blob, environment, domain, or deployment was changed. Nothing was pushed or merged.
