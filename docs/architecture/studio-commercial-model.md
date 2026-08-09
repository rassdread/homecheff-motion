# Studio Commercial Model (S.8C)

**Status:** CANONICAL COMMERCIAL MODEL (read-only)  
**Date:** 2026-08-09  
**HEAD:** `0e8fe056fd1374ec77563efa8b92dc8e39a9ac4f`

---

## One-sentence truth

Studio sells **prepaid wallet credits** (packs + promos) and **subscriptions that buy privileges** (discounts, storage, Auto Top-Up eligibility) — **not** monthly credit allotments.

---

## Money in

| Instrument | Currency | What customer gets | Code SoT |
|------------|----------|--------------------|----------|
| Credit packs | EUR | Credits + bonusCredits | `STUDIO_CREDIT_PACKS` / DB `StudioCreditPack` |
| Subscriptions | EUR | Plan benefits; **0 monthly credits** | `STUDIO_PLANS` / DB `StudioSubscriptionPlan` |
| Auto Top-Up | EUR | Same as pack purchase via Checkout | `studio-auto-topup.ts` |
| Promotions / grants | — | Wallet credits (PROMOTIONAL/BETA/…) | Billing policy + admin |

### Pack catalog (TS fallback)

| Pack | Credits | Price | €/credit |
|------|--------:|------:|---------:|
| pack_500 | 500 | €4.99 | 0.00998 |
| pack_1250 | 1250 | €9.99 | 0.007992 |
| pack_3000 | 3000 | €19.99 | 0.006663 |
| pack_8000 | 8000 | €49.99 | 0.006249 |

### Subscription catalog

| Plan | Monthly | Yearly (10×) | Credit discount | ATU | Storage | monthlyCredits |
|------|--------:|-------------:|----------------:|:---:|--------:|---------------:|
| free | €0 | — | 0% | no | 1 GB | **0** |
| creator | €7.99 | €79.90 | 10% | yes | 5 GB | **0** |
| pro | €24.99 | €249.90 | 15% | yes | 25 GB | **0** |
| studio | €79.99 | €799.90 | 20% | yes | 100 GB | **0** |
| enterprise | custom | custom | 25% | yes | unlimited | **0** |

Yearly marketing savings vs 12× monthly ≈ **17%** (`SUBSCRIPTION_YEARLY_SAVINGS_PERCENT`).

---

## Money out (customer consumption)

1. Resolve action → registry / DB `StudioPricingRule` / `overrideCredits`
2. Apply plan `creditDiscountPercent`
3. `reserveStudioCredits` → provider execute → `capture` or `refund`
4. Telemetry: `ProviderCostEvent` (COGS estimate or Vidu balance delta)

**Fair use:** hard wallet stop (`insufficient_credits` / free-account gate). Motion also has role AnimationUsageLedger caps (orthogonal).

---

## Pricing law

```
credits ≈ ceil(reservedProviderUsd × 2.5 / 0.005)
```

Overrides (proven): `voice_clone=400`, `premium_vision_analysis=5`, `fusion_render` intent map 15–50, `studio_orchestrator_production=50`, `motion_render` min 180.

Nothing in S.8C changes these values.

---

## Dual catalog risk

Runtime prefers **DB** when seeded (`db_with_ts_fallback`). Stripe price IDs live in env/DB only. Feature flags can diverge (policy defaults vs DB `[]`). Financial Audit must re-read DB in production before changing commercial claims.

---

## Parallel commercial narratives (do not conflate)

| Narrative | Unit | Used for |
|-----------|------|----------|
| StudioWallet credits | credits @ internal $0.005 | Primary Studio monetization |
| CustomerBillingEvent EUR | EUR tiers | Legacy/video quote sync for some PCE actions |
| Editor localStorage | display only | **Non-authoritative** |
| V41 planning EUR | planning estimates | Not charged |

---

## Commercial loops

```
Subscribe (optional) → buy pack / ATU → generate (discounted credits) → provider COGS
         ↓
   storage + flags
```

Heavy users: subscription fee ≈ pure software margin; pack spend drives COGS.  
Light users: subscription can be high-margin with little provider spend.

---

## See also

- `studio-provider-margin-model.md` — margin math  
- `studio-financial-profit-model.md` — P&amp;L scenarios  
- S.8A product truth docs — ownership &amp; bypasses  
