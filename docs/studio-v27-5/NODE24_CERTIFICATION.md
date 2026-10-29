# Node 24 certification

Binary: `/Users/sergioarrias/.nvm/versions/node/v24.22.2/bin/node`

Version: `v24.22.2`

The earlier V27.4 suite used Node v25.6.1. Those results are not reused here.

`nvm` default alias was `22` after these commands and was left at `22`.

Worktree: `/Users/sergioarrias/HomeCheffProjects/homecheff-motion-unified` at the application commit that became `8ffde5d7f349b63dc1ecaa0df6fec085cab0fd81`.

| Command | Result |
|---|---|
| `npx tsx --test src/server/studio/studio-v275-film-export.test.ts` | 3 pass, 0 fail, 3289 ms |
| `npm test` | 5525 tests, 5524 pass, 0 fail, 1 skip, 68770 ms |
| `npx tsc --noEmit` | exit 0, empty output |
| `npx eslint .` | exit 0, 0 errors, 476 warnings |
| `npm run build` | exit 0, compiled 21.1s, TypeScript 49s, 536 static pages |

The skipped unit test is `returns no source when project missing studio storyboard` because `DATABASE_URL` is unset for `npm test`.

The 476 warnings include the preserved untracked files in this worktree. The four source files added for this repair have 0 warnings.

Database tests, same Node, local URLs only:

| File | Result |
|---|---|
| `studio-film-certification.db.test.ts` | 1 pass |
| `studio-unified-film-production.db.test.ts` | 1 pass |
| `studio-film-live-providers.db.test.ts` | 1 pass |
| `studio-mock-billing-isolation.db.test.ts` | 1 pass |
| `studio-v24-history.db.test.ts` | 1 pass |
| `studio-timeline-migration.db.test.ts` | 1 pass |

Production Node setting was not changed. The isolated Vercel function reported Node `v24.21.0`, which is inside the project's 24.x setting.
