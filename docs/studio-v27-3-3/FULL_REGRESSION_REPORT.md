# Full regression

Command results from `/Users/sergioarrias/HomeCheffProjects/homecheff-motion-unified`.

| Check | Result |
| --- | --- |
| `npm test` | 5522 tests, 5521 pass, 0 fail, 1 skip, exit 0, 62.6s |
| `npx tsc --noEmit` | exit 0, empty output |
| `npx eslint .` | exit 0, 0 errors, 476 warnings |
| `npm run build` | exit 0, compiled in 24.5s, TypeScript 60s, 536 static pages |
| `studio-film-certification.db.test.ts` | 1 pass |
| `studio-unified-film-production.db.test.ts` | 1 pass |
| `studio-film-live-providers.db.test.ts` | 1 pass |
| `studio-v24-history.db.test.ts` | 1 pass |
| `studio-timeline-migration.db.test.ts` | 1 pass |
| `studio-mock-billing-isolation.db.test.ts` | 1 pass |
| `authorized-local-mock-execution.test.ts` | 3 pass, included in `npm test` |
| HTTPS browser certification | exit 0 |

The skipped test is `returns no source when project missing studio storyboard` in `src/server/instant-premium/refresh-studio-intelligence.test.ts`. It skips when `DATABASE_URL` is unset so the default suite does not open a database. It was not deleted or weakened.

V27.3.2 baseline was 5518 pass, 0 fail, 1 skip, 476 warnings. This run adds the three authority tests: 5521 pass, same skip, same warning count.

No renderer, timeline, audio, or wizard rewrite was made. The film browser journey, including export and download playback, passed on the repaired server.
