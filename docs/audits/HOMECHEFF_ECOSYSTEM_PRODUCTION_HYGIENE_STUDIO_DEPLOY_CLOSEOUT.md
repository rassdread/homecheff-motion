# HomeCheff Ecosystem — Production Hygiene Studio Deploy Closeout

**Date:** 2026-09-04  
**Scope:** Unblock Studio Production deploy of Instant Premium non-admin safety gate.  
**Paid Instant Premium:** NOT enabled / NOT certified.

## Decision

`HOMECHEFF_ECOSYSTEM_PRODUCTION_HYGIENE_AND_LAUNCH_READY_CERTIFIED`

## Studio Production SHA

| Field | Value |
| --- | --- |
| STUDIO_PRODUCTION_SHA_BEFORE | `3842b504e41450629fd36f9dd863a369b54bffbf` |
| STUDIO_PRODUCTION_DEPLOYMENT_ID_BEFORE | `6234041456` |
| STUDIO_MAIN_SHA / GATE COMMIT | `1b786f37f4fe55283f4690f7d7d9d2575a2a0a16` |
| STUDIO_PRODUCTION_SHA_AFTER | `08026bf79f0c2142f8a2010142c2084eed7a52a8` (includes gate `1b786f37…`) |
| STUDIO_DEPLOYMENT_ID (GitHub) | see Vercel `dpl_BSrAgf8bYrLZESs3fNrMnjXFNihm` for `08026bf7`; prior gate deploy `6267701429` (`1b786f37`) |
| STUDIO_DEPLOYMENT_ID (Vercel) | `dpl_BSrAgf8bYrLZESs3fNrMnjXFNihm` |
| PRODUCTION_ALIAS | `https://studio.homecheff.eu` (+ `motion.homecheff.eu`) |
| DEPLOYMENT_READY | YES |

Gate commits on `main`:

- `dfd92e8d` — admin-only Instant Premium test generation + coming-soon UI
- `1b786f37` — Instant Premium readiness deps fix (includes gate)

## Instant Premium mode (intentional)

| Field | Value |
| --- | --- |
| INSTANT_PREMIUM_ENV | unset in Production env list → code default `test` |
| LIVE `GET /api/instant-premium/mode` | `{"mode":"test"}` |
| DOM `data-instant-premium-mode` | `test` |
| INSTANT_PREMIUM_PAID_MODE_SAFE | NO |
| INSTANT_PREMIUM_PAID_MODE_ENABLED | NO |

Paid-mode blockers unchanged: Instant Premium VAT/tax, webhook fulfillment, automatic refunds, `/complete` race/idempotency.

## Non-admin safety proof

Server (`create-and-generate`):

- `mode === "test" && user.role !== "admin"` → `403` + `FEATURE_NOT_AVAILABLE`
- Gate runs before `startProjectJobs` / credit capture

Client (`/animate/instant`):

- `instantCustomerCheckoutReady = premiumMode === "paid"`
- Non-admin primary CTA = `instant.step7.ctaComingSoon` (“Binnenkort beschikbaar” / “Coming soon”)
- Primary disabled when `!isAdmin && !instantCustomerCheckoutReady`
- Customer path does **not** call `instant.step7.ctaTest` (testmodus)

Live checks:

- Anonymous POST → `401 AUTH_REQUIRED` (no provider job)
- Invalid session cookie → `401 AUTH_REQUIRED`
- Public HTML: `testmodus` count = 0 on audited Studio routes
- Live deployment serves `dpl_7JGAhhpFPoyc3zbuGfTceZn3Lm2g` = SHA `1b786f37…`

## Provider COGS

`PUBLIC_FREE_PROVIDER_COGS_EXPOSURE = NO` for normal customers (server gate + UI disable).

Admin test generation may remain server-gated (`role === "admin"` only).

## Vercel auth note

Previous CLI `Not authorized` was transient/scope-related; current CLI user `rsergioarrias-6539` has access to team `sergio-s-projects-f7b64ee1` (`team_uLKRAoCrEPUQOIcgbyZGt3HG`) project `homecheff-motion` (`prj_29omEPF5Hmob1eGlRjoJNb9t3m2f`). GitHub→Vercel Production for `1b786f37` completed Ready and is aliased to `studio.homecheff.eu`.

## Ecosystem hygiene (unchanged pass)

Marketplace / Growth / Delivery / HC / Affiliate / SEO / Email remain PASS from prior certified evidence + quick regression (`/api/products/debug` = 404, public Studio pricing €15/€29/€79 present).

Private certification accounts may remain; not a launch blocker when non-public and excluded from customer metrics/supply.
