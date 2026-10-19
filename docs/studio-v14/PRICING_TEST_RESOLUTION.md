# Pricing test resolution

PRICING_CATALOG_VERIFIED = YES, for the application catalog

FINANCIAL_PRODUCTION_LOGIC_CHANGED = NO

STRIPE_PRICES_CHANGED = NO

HC_PACKAGE_GRANTS_CHANGED = NO

## Authoritative application catalog

`STUDIO_HC_PACK_CATALOG_VERSION` is `2026-09-universal-v1` in `src/lib/studio-hc-pack-catalog.ts`.

| Slug | Price | HC grant |
| --- | --- | --- |
| pack_500 | €4.99 | 250 |
| pack_1250 | €9.99 | 500 |
| pack_3000 | €19.99 | 1000 |
| pack_8000 | €49.99 | 2500 |

`STUDIO_CREDIT_PACKS` copies `hcGrant` into `credits`. `getWorstPackEurPerCredit()` therefore returns `4.99 / 250 = 0.01996`. `pack_500` is the lowest euro-per-HC pack.

The same grants are asserted by `studio-universal-hc-catalog.test.ts`. The billing promo grid fallback uses the same numbers. `listStudioCreditPacks` and `getStudioCreditPackBySlug` pass database rows through `applyCatalogHcGrant`, so checkout reads the catalog grant rather than the raw stored credit count.

## Stripe

Production Stripe secrets cannot be pulled by the Vercel CLI (`37 Secret values cannot be pulled`). Live Stripe price amounts were not read. No Stripe object was changed.

The database rows in `StudioCreditPack` still store the legacy credit counts (500, 1250, 3000, 8000) and the same euro prices (€4.99, €9.99, €19.99, €49.99). Each row has a Stripe price id set. Those stored credit counts are not what the read path returns, because the catalog overlay replaces them. The rows were not updated.

## Tests updated

Only expectations changed:

- `src/lib/studio-pricing-profitability.test.ts` now expects `0.01996`, and a hypothetical 75-credit voice clone is `LOW_MARGIN`. The live registry price remains 400 and `SAFE`.
- `src/server/studio-account/studio-credit-foundation.test.ts` now expects `pack_500` to grant 250 HC at €4.99.

No wallet, catalog, package, or price function was edited.
