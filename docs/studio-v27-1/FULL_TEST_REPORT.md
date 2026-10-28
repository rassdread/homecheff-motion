# Full test report

Command: `npm test` in `/Users/sergioarrias/HomeCheffProjects/homecheff-motion-unified`  
Exit code: 0  
Duration: 94515 ms

| Result | Count |
| --- | --- |
| Passed | 5504 |
| Failed | 0 |
| Skipped | 1 |
| Suites | 991 |

The skipped test is pre-existing: `returns no source when project missing studio storyboard` in the project-source suite, skipped because `DATABASE_URL` is unset. It was not deleted or weakened.

Focused V27.1 file `src/lib/studio-v27-1-integration.test.ts`: 9 passed, 0 failed. The earlier combined run of that file with the V23, V27, AI-home, and SSO suites was 72 passed.

`npx tsc --noEmit --pretty false --incremental false`: exit 0, no diagnostics.

`npx eslint .`: exit 0, 0 errors, 476 warnings. None of the warnings are in the V27.1 files. They are unused variables and similar issues already present in other modules.

`npm run build` was run again after the voice page was given a white surface. The second build compiled in 33.9s, exit 0, and lists `/studio/audio/create`. The first build, before that class change, also exited 0.

No database tests wrote data. The one database-gated test skipped itself.
