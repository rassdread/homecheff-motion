# Full regression

Commands were run in `/Users/sergioarrias/HomeCheffProjects/homecheff-motion-unified` on branch `integrate/studio-unified-film-production` after the V27.2 implementation, including the upload-token narrowing fix and the character-image assertion update.

## npm test

`npm test` completed with output redirected to a file so the runner could finish. Two earlier launches in this session exited 1 before a TAP summary, with tests still printing `ok` and no `not ok`. Those runs did not record an assertion failure.

The first completed run reported 5508 tests, 5505 passed, 2 failed, 1 skipped, 991 suites. Both failures were source scans of `studio-film-preparation.ts` that required `referenceImageUrl` to appear once. The film character link added two reads of an existing character image: a Prisma select and a library preview copy. It does not call `studioCharacter.create`, `update`, or `upsert`. The two tests now require those exact reads and still forbid a character-master write, credit reservation, and provider calls. They were not deleted and their other assertions were not removed.

The rerun after that change:

| Result | Count |
|---|---|
| tests | 5508 |
| passed | 5507 |
| failed | 0 |
| skipped | 1 |
| suites | 991 |
| exit | 0 |
| duration | 93216 ms |

Previous baseline before V27.2: 5504 passed, 0 failed, 1 skipped, 991 suites. The three added passing tests are in `src/server/auth/disposable-local-auth.test.ts`. The skipped test is the same pre-existing skip.

## Typecheck

`npx tsc --noEmit --pretty false --incremental false` exited 0 after an explicit 503 when the orchestrator upload route has no blob token. An earlier run failed with TS2322 because `token` was `string | null` at `put()`.

## Lint

`npx eslint .` exited 0 with 0 errors and 476 warnings. That matches the previous warning baseline. An intermediate run reported 477 warnings because `scripts/v272-security-cert.ts` assigned `sceneId` and did not use it. That binding was removed before this lint run. No new warning remains.

## Production build

`npm run build` exited 0. The Next.js build finished and printed the route table, including the Studio project and wizard routes.

## Database integration tests outside npm test

`studio-unified-film-production.db.test.ts`, `studio-film-live-providers.db.test.ts`, and `studio-film-certification.db.test.ts` require `FILM_CERT_DATABASE_URL` and throw unless the database name is exactly `homecheff_film_cert_2u`. `studio-v24-history.db.test.ts` and `studio-timeline-migration.db.test.ts` require their own database names. They were not run and were not pointed at `homecheff_studio_v27_2_test`.

Authenticated browser, upload, timeline, preview, export, ownership, and zero-HC evidence is in the other V27.2 documents. Those browser results are partial where the remaining-blockers document says so.
