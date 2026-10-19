# Pricing test investigation

No price, pack grant, margin rule, or wallet code was changed.

The source of truth for pack grants is `STUDIO_HC_PACK_CATALOG` in `src/lib/studio-hc-pack-catalog.ts`, version `2026-09-universal-v1`. `STUDIO_CREDIT_PACKS` maps `credits` to `hcGrant`. The file comment says the legacy slug `pack_500` grants 250 HC, not 500 legacy credits. `studioPackHcGrant("pack_500")` is already asserted as 250 by `src/lib/studio-universal-hc-catalog.test.ts`.

## 1. Worst pack rate

File: `src/lib/studio-pricing-profitability.test.ts`

Test: `worst pack is pack_8000`

Expected: `getWorstPackEurPerCredit()` is greater than 0.006 and less than 0.007.

Actual: `0.01996`. The assertion `eur < 0.007` fails.

`getWorstPackEurPerCredit` returns the lowest `priceEur / credits` in the catalog. Current values:

| Slug | Price | HC grant | Euro per HC |
|---|---:|---:|---:|
| pack_500 | 4.99 | 250 | 0.01996 |
| pack_1250 | 9.99 | 500 | 0.01998 |
| pack_3000 | 19.99 | 1000 | 0.01999 |
| pack_8000 | 49.99 | 2500 | 0.019996 |

The lowest rate is `pack_500` at 0.01996, not `pack_8000`. The range 0.006 to 0.007 matches an older reading of €49.99 / 8000 credits, which is 0.00624875. The catalog no longer grants 8000 HC for that slug.

The test is stale. The catalog is the production configuration. Neither was changed.

## 2. Voice clone at 75 credits

File: `src/lib/studio-pricing-profitability.test.ts`

Test: `voice_clone at 75 credits would be CRITICAL`

Expected status: `CRITICAL`

Actual status: `LOW_MARGIN`

Using the current worst rate 0.01996, a 1.08 EUR/USD default, and a provider cost of $1:

- revenue €1.497
- cost €0.9259
- margin 38.15 percent

Below 60 percent is `LOW_MARGIN`. `CRITICAL` is only for a margin below -50 percent. At the old 0.00624875 rate, 75 credits would not cover a $1 provider cost, which is why the test expected `CRITICAL`.

The live registry still prices `voice_clone` at 400 credits. That case remains `SAFE` at 88.4 percent margin, and its test passes. A 75-credit clone is a hypothetical in the test, not the charged price.

## 3. Credit pack start value

File: `src/server/studio-account/studio-credit-foundation.test.ts`

Test: `credit packs are defined with expected start values`

Expected: `getCreditPack("pack_500").credits === 500` and price €4.99

Actual: credits `250`, price €4.99

The price matches. The grant matches the Universal HC catalog and the comment on `studio-credit-packs.ts`. The assertion still expects the legacy credit count in the slug.

`studio-credit-foundation.test.ts` also expects the voice-clone registry cost to be 400. That assertion passes.

## Founder decision

These three failures do not show that customers are being charged the wrong live price. They show tests written for the pre-universal pack sizes.

Do not change 250 to 500. Do not change the tests to expect 250 or 0.01996 until the founder confirms that `2026-09-universal-v1` is the commercial catalog that should stay. V14 does not make that confirmation.
