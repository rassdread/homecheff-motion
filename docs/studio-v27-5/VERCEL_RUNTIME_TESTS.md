# Vercel runtime tests

## Isolation

A new project was created: `homecheff-studio-v275-runtime-probe`, `prj_DsEQB7Sgm7rDm4kdBhkCn2LH9N0k`.

Both deployments reported that project id, not `prj_29omEPF5Hmob1eGlRjoJNb9t3m2f`.

- No production database
- No production blob token
- No production worker secret
- No custom domain
- No customer media
- No paid provider

The first deployment, `dpl_EZNDmwJhSzVDyKYCLeTTxG176bFg`, completed without emitting a function. The second, `dpl_ACFQ45zP4s7f4vC6V3bgwBoByx8a`, built `api/probe.js` with `@vercel/node` and answered on `/api/probe.js`.

Default SSO on the new project returned 302 to Vercel SSO. SSO was disabled on this new project only so the probe could be called. The live project's protection was not changed.

The live deployment was read again after the probe and was still `dpl_5P4UM9K9bdZzg2ZZM2cegi2ZNsCq` at `afbbd4cc`.

## What ran

One read-only probe of binary presence, platform, architecture, and Node version. It did not render a film.

## What did not run

Tests A through F on Vercel. A full Studio deployment would need a database the function can reach. Local Postgres is not reachable from Vercel. A new remote database was not created. The production database and the protected preview database were not connected.

Film export on the Vercel runtime: NOT PASSED.

## Cleanup

Leave `prj_DsEQB7Sgm7rDm4kdBhkCn2LH9N0k` until this evidence is accepted. Deleting that project does not touch `homecheff-motion`. Do not delete it without a separate confirmation. No shared resource was created.
