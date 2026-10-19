# V13 test report

Commands were run in `/Users/sergioarrias/HomeCheffProjects/homecheff-motion-passion-prod` on branch `feature/passion-character-masters-production`.

## Focused tests

`npx tsx --test src/lib/studio-project-linking.test.ts src/lib/studio-project-workspace.test.ts src/lib/studio-i18n-deep.test.ts src/lib/studio-motion-i18n-hardening.test.ts`

21 passed, 0 failed.

Covered:

- create reuses an existing storyboard id
- unowned, conflicting, unconfirmed, and valid attach decisions
- scene move up and down
- Dutch subtitle merge and clear
- preparation service source has no credit reservation, no provider call, and no master URL write
- new routes call `requireActiveUser`
- classic editor still renders and adds the film return link
- MADE WITH PASSION ids are absent from the preparation service
- Dutch and English studio strings stay in parity, including the V13 keys

## Typecheck

`npx tsc --noEmit` passed.

## Lint

`npx eslint` on the V13 TypeScript files passed with no findings.

## Prisma

`npx prisma validate` passed. `npx prisma generate` passed. No migration was created. Validate used a local dummy URL so it would not open the shared database.

## Production build

`NODE_OPTIONS=--max-old-space-size=6144 npx next build` passed. Compiled successfully.

## Full suite

`npm test`

- tests: 5394
- pass: 5389
- fail: 4
- skipped: 1

The four failures are the same pre-existing ones reported for V12. They are not in the V13 linking or scene code:

- `studio-pricing-profitability`: worst pack is `pack_8000`; `voice_clone` at 75 credits
- `voice center UX wiring`: expected preview copy is not in the current voice center
- `studio plan and credit packs config`: expected pack start 500, actual 250

No database rows were created. No wallet was written. No provider was called.

## Browser

Signed-in browser test was not run. A signed-out Studio page is the SSO gate and is not counted as a pass.
