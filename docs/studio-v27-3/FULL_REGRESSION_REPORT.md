# Full regression

Run from `/Users/sergioarrias/HomeCheffProjects/homecheff-motion-unified` after the workflow changes. Output files are local scratch logs, not part of the repo.

## `npm test`

```
# tests 5509
# suites 991
# pass 5508
# fail 0
# skipped 1
# duration_ms 63044
EXIT:0
```

V27.2 baseline was 5507 passed, 0 failed, 1 skipped, 991 suites. This run adds one passing test in `studio-v27-workflow-routes.test.ts` (the storyboard open keeps `tool`, `scene`, and `returnTo`). No assertion was weakened. No failure was skipped.

Classification: no `NEW_REGRESSION`. No `PRE_EXISTING_FAILURE`.

## Typecheck

`npx tsc --noEmit --pretty false --incremental false` exit 0. No diagnostics.

## Lint

`npx eslint .` exit 0.

```
✖ 477 problems (0 errors, 477 warnings)
```

The V27.2 full run was 476 warnings. The extra warning was `ownerA` unused in `scripts/v273-workflow-cert.ts`. That binding was removed after the full run. `npx eslint scripts/v273-workflow-cert.ts` then exited 0 with no output. The committed tree does not contain that warning. The full tree was not linted a second time.

## Production build

`npm run build` exit 0. Next reported `Compiled successfully in 39.5s`.

## Database tests

Five disposable-database files, 5 passed, 0 failed. Details are in `DATABASE_INTEGRATION_TESTS.md`. They are not part of `npm test`.
