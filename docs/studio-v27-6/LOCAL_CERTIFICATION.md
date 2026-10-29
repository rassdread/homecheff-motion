# Local certification

Node `v24.22.2`. Application commit `c722b35b8507b0d682aebf333b867667f8e9fa6b`.

| Check | Result |
|---|---|
| `npm test` | 5525 pass, 0 fail, 0 skip, 59.4 s |
| `npx tsc --noEmit` | PASS |
| `npx eslint .` | 0 errors, 476 warnings |
| `npm run build` | PASS, compile 24.4 s, TypeScript 55 s, 536 pages |
| Six disposable database tests | 6 pass |
| `studio-v275-film-export.test.ts` | 3 pass, including the 3-second local matrix |
| `studio-v276-film-worker.db.test.ts` | 1 pass, about 3.6 s |

The unit suite had no skip because `DATABASE_URL` in that shell was the local database `homecheff_film_cert_2u`. The previously skipped storyboard test ran against a missing project id and passed. It did not use a remote database.

## Local worker

`studio-v276-film-worker.db.test.ts` started `worker/video-worker.ts` on `127.0.0.1:8091` with a test-only secret and the disposable database. It did not call `homecheff-motion.onrender.com`.

One video clip, dialogue, music, and an effect. Output H.264, AAC, 720×1280. Repeat call returned the same library asset. Wallet stayed 500, lifetime spent 0, `creditsCharged` 0. A second user could not read the job. An empty timeline failed and left the wallet at 500.

This exercises the actual local worker process, not a mocked dispatch.

## Browser

Clean checkout `/Users/sergioarrias/HomeCheffProjects/homecheff-motion-v276-exact` at `c722b35b`, `https://127.0.0.1:3458`, worker mode unset.

Project `cmvsuyzti0001dhuovk3nxdik`. Wallet 500 to 500. Captures 0. Ledger delta 0. Mock images 2. Paid provider calls 0. Exit 0 in about 41 seconds.

The server was stopped. Ports 3456 and 3462 were still listening.
