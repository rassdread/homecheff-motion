# Mijn Verbruik Error Fix Report

## Root cause

The usage page could fail in three ways:

1. **Instrumentation events in user billing** — Studio `ProviderCostEvent` rows (OCR, scene images, storage, ElevenLabs, etc.) could sync to `CustomerBillingEvent` when `skipBillingSync` was omitted. Summary logic used `renderType.includes("mode")`, which incorrectly counted those rows and could surface non-customer actions.
2. **Null-unsafe rendering** — `formatPriceEur(null)` and `renderType.replace(...)` on missing values could throw during client render after a partially successful load.
3. **Hard failure on DB/query errors** — Server page and API returned only an error state with no report shell when loading failed.

Studio profitability / studio insights APIs are separate (`/api/me/studio-insights`) and do not conflict with `/api/me/usage`.

## API fix

- `loadUserBillingUsage()` — filters to `CUSTOMER_FACING_BILLING_ACTIONS`, dedupes by `providerCostEventId`, normalizes null fields, returns empty summary on DB errors (no throw).
- `GET /api/me/usage` — try/catch; always returns `{ ok: true, report }` with empty rows on failure.

## UI fix

- Page always passes an `initialReport` (empty when load fails) so filters and empty state render.
- Dashboard — null-safe type/status labels; non-blocking warning banner on filter reload errors; `formatPriceEur` accepts null/undefined.

## Billing/privacy safety

- `INSTRUMENTATION_ONLY_ACTIONS` enforced at sync time in `recordCostEvent` (double guard with `skipBillingSync`).
- User API exposes only: gross/net EUR, credits, render type, status, project title — no provider cost, COGS, margin, or admin profitability fields.
- Instrumentation action types never returned from `loadUserBillingUsage`.

## Tests/build status

| Check | Status |
|-------|--------|
| lint | pass (0 errors) |
| build | pass |
| tests | **2177/2177** pass |

New tests: `src/server/billing/customer-billing-events.test.ts` (5 cases).
