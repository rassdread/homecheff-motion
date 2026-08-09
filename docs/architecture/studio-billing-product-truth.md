# Studio Billing — Product Truth (S.8A)

**Status:** FORENSIC PRODUCT TRUTH (read-only)  
**Date:** 2026-08-09  
**Mode:** Discovery only — no pricing, architecture, or code changes  
**Canonical companion:** `docs/audits/studio-s8a-product-truth.md`

---

## Product law (financial)

```
Billing owns money.
Credits own consumption.
GenerationJobs own execution tracking (when wired).
Provider adapters own provider-specific execution.
Financial Audit owns verification.
Nothing may bypass Billing or Credits — except documented bypass classes.
```

---

## How money enters

| Path | Mechanism | Ledger / event |
|------|-----------|----------------|
| Credit pack purchase | Stripe Checkout → webhook `checkout.session.completed` | `StudioLedgerEntry` `credit_purchase` / origin `PURCHASED` |
| Subscription | Stripe Checkout / invoice | Sets plan + `billingStatus`; **does not grant monthly credits** (Phase 4) |
| Promotions / promo codes | Promo redemption services | `promotional_grant` / bonus origins |
| New-user / beta grants | `StudioBillingPolicy` | Promotional grants on account ensure |
| Admin grant | Admin APIs | `admin_grant` / `manual_adjustment` |
| Compensation / referral origins | Typed on ledger | `COMPENSATION` / `REFERRAL` when used |

**Money-in owner:** Billing (`stripe-billing.ts`, packs, plans, promos).

---

## How money leaves (customer wallet)

Canonical pipeline:

```
evaluateCreditPolicy
  → authorizeStudioAction / reserveStudioCredits  (usage_reservation)
  → provider execute
  → captureStudioCredits (usage_capture)  OR  refundStudioReservation (usage_refund / failed_generation_refund)
```

Helpers: `billProviderAction`, `runBilledProviderRoute`, `withStudioCreditGate`, GenerationJob orchestrator.

**Spend order:** promotional balance first, then purchased.

**Money-out owner:** Credits (wallet + policy + authorization).

---

## How money leaves (company COGS)

| System | What |
|--------|------|
| `ProviderCostEvent` | Estimated/actual provider USD per action |
| `ProviderUsageLog` | Vidu balance-delta credits (provider-side) |
| `studio-cost-metering.ts` | Fire-and-forget instrumentation (`skipBillingSync: true` often) |
| Stripe fees | Outside app ledger |

**COGS owner:** Provider metering — **not** customer wallet.

---

## Parallel EUR story (legacy Motion)

`CustomerBillingEvent` + `video-pricing.ts` quote EUR for some motion/video paths.  
This is **parallel** to StudioWallet credits — not a second customer wallet, but a second monetization narrative.

---

## Where profit exists (structure only — no margin math)

Profit is **structurally** intended where:

1. Customer pays credits (or EUR) priced with margin multiplier (`CREDIT_MARGIN_MULTIPLIER = 2.5`, `USD_PER_CREDIT = 0.005`)
2. Provider COGS is recorded lower than reserved USD used to derive credit cost
3. Registry `estimateMarginUsd` / profitability admin tools can compute — **S.8A does not calculate margins**

Profit risk surfaces: admin bypass, cache free paths, production-chain bypass, free EUR video for admin/test, under-metered provider calls, dual catalogs (TS vs DB pricing rules).

---

## Ownership map (no overlaps intended)

| Owner | Owns | Does not own |
|-------|------|--------------|
| **Billing** | Stripe, plans, packs, promos, carry policy storage, EUR customer events, checkout/portal | Per-action spend authorization |
| **Credits** | Registry defaults, policy allow/deny, reserve/capture/refund, wallet balances, ledger | Provider SDK execution |
| **GenerationJobs** | Job lifecycle, idempotency resume/replay, `chargeFinalized` once | Wallet mutation itself (delegates to Credits) |
| **Provider adapters** | Provider calls, provider job IDs | Credit prices |
| **Telemetry** | ProviderCostEvent, usage logs, aggregation | Charging the user |

---

## Absolute product truths

1. Customer spend SoT is **`StudioWallet` + `StudioLedgerEntry`**.
2. Action price SoT is **`STUDIO_ACTION_COST_REGISTRY`** with optional **`StudioPricingRule`** DB override.
3. Subscriptions today sell **plan benefits + pack discounts + storage**, not monthly credit pools (`monthlyCredits: 0`).
4. Admin role is a **hard credit bypass** (`admin_bypass`).
5. GenerationJob coverage is **partial** — S.8B wraps STT (`SUBTITLE_GENERATE`) and translation (`TRANSLATE`); remaining bare billed routes include bulk/improve images and Motion charge-at-create (EUR/wallet correlation documented).
