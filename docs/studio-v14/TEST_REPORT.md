# V14 test report

Worktree: `/Users/sergioarrias/HomeCheffProjects/homecheff-motion-passion-prod`

Branch: `feature/passion-character-masters-production`

No migration was applied. No shared database was opened. `DATABASE_URL` was unset in the shell. Prisma validate and generate used a dummy local URL that does not connect.

## Dialogue and V13 regression

`npx tsx --test src/lib/studio-scene-dialogue.test.ts src/lib/studio-scene-validation.test.ts src/lib/studio-project-linking.test.ts`

Passed, including:

- optional dialogue
- trim, 4000-character cap, and clear to null
- description left unchanged when only dialogue is validated
- Baker, Potter, and Gardener example lines kept separate from Dutch subtitle text
- migration SQL is a single nullable add-column
- preparation service does not reserve credits or write a master URL

These tests do not read or write a database. Dialogue persistence against a migrated database was not executed.

## Voice center

`src/lib/studio-voice-center-ux.test.ts` passed after the assertion was pointed at the shared preview component.

## Pricing

`src/lib/studio-pricing-profitability.test.ts` still fails two cases.

`src/server/studio-account/studio-credit-foundation.test.ts` still fails `credit packs are defined with expected start values`.

The other cases in those files passed, including voice clone at 400 credits and the plan prices.

## Typecheck

`npx tsc --noEmit` passed.

## Lint

ESLint on the touched TypeScript files reported 0 errors. The warnings are existing unused locals in the director proposal builder and the storyboard service.

## Production build

`NODE_OPTIONS=--max-old-space-size=6144 npx next build` passed.

## Full suite

`npm test`

- tests: 5398
- pass: 5394
- fail: 3
- skipped: 1

The three failures are the pricing cases above. The previous voice-center failure is gone.

## Not run

- Database integration with `dialogueText` present: no isolated database was available, and the shared Neon database was not used.
- Signed-in browser test: no session was available, and the new field is not on production.
