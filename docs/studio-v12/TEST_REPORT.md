# Test report

## Unit

`npx tsx --test src/lib/studio-project-workspace.test.ts` — 3/3 pass.

Full `npm test` on this worktree: 5382 pass, 4 fail, 1 skipped, 5387 total. The four failures are `studio-pricing-profitability`, `voice center UX wiring`, and `studio plan and credit packs config` (pack start value 250 versus the test’s 500). They do not import the workspace. They were already failing on this branch before V12.

`npx tsc --noEmit` passed. `npm run build` passed (Next.js 16.2.4).

Browser end-to-end against a signed-in production session was not run. The workspace requires the existing login. Do not treat the unit tests as that check.

## Not invoked

Paid providers, wallet writes, migrations, media regeneration.
