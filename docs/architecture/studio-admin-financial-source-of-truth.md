# Studio Admin Financial Source of Truth (S.8D)

**Status:** CANONICAL SoT MAP (read-only discovery)  
**Date:** 2026-08-10  
**HEAD:** `0e8fe056fd1374ec77563efa8b92dc8e39a9ac4f`  
**Mode:** No implementation · No new dashboards

---

## Absolute law (unchanged)

| Domain | Product SoT |
|--------|-------------|
| Money-in (EUR) | **Billing / Stripe** |
| Consumption | **Credits / StudioWallet + StudioLedgerEntry** |
| Execution | **GenerationJobs** (when wired) |
| Provider SDK | **Provider adapters** |
| COGS rows | **Telemetry → ProviderCostEvent** |
| Verification | **Financial Audit** |

Admin UI must **display** these SoTs — not invent alternate ledgers.

---

## Three parallel money narratives in Admin (proven)

| Narrative | Primary tables | Admin surfaces | Trust for Studio commercial |
|-----------|----------------|----------------|----------------------------|
| **A. Wallet credits** | `StudioWallet`, `StudioLedgerEntry` | Billing Control Center, Studio Finance, Users billing panel | **Canonical for Studio prepaid** |
| **B. Provider COGS (USD)** | `ProviderCostEvent` (+ `ProviderUsageLog` legacy) | Render Analytics → costs / profitability / CSV | **Canonical for COGS** |
| **C. Motion/video EUR quotes** | `CustomerBillingEvent` | Render Analytics → billing analytics / profitability revenue | **Parallel** — not Studio pack Checkout SoT |

Mixing A+B+C without labels produces false margins.

---

## Metric → canonical owner

| Metric | Canonical source | Correct admin home | Do not use as SoT |
|--------|------------------|--------------------|-------------------|
| Pack purchase EUR | Stripe Checkout + ledger `credit_purchase` metadata | Billing (needs honest EUR — see caveat) | `creditsSold × USD_PER_CREDIT` |
| Subscription MRR/ARR | `StudioAccount.billingStatus=active` × plan monthly EUR | Billing analytics | CBE revenue |
| Credits outstanding / reserved | `StudioWallet` aggregates | Studio Finance | PCE |
| Credits sold / granted / spent / refunded | Wallet lifetime + ledger actionTypes | Studio Finance + Billing analytics | CBE |
| Per-user wallet / grant / ledger | Wallet + ledger by userId | `/admin/users` billing panel | — |
| Action catalog credits / override | `StudioPricingRule` + registry defaults | Billing → Pricing | Hardcoded UI |
| Pack / plan catalog | `StudioCreditPack` / `StudioSubscriptionPlan` | Billing → packs / subscriptions | TS fallback alone |
| Stripe readiness | Env + DB price IDs + past_due accounts | Billing → Stripe | — |
| Promotions / campaigns | `StudioPromotion`, `StudioBillingPolicy` | Billing → promotions / campaigns | — |
| Provider COGS USD | `ProviderCostEvent` | Render Analytics | Ledger `providerCostUsd` alone (partial) |
| Vidu provider balance | Vidu API (cached) | Dashboard `VideoCreditsCard` | StudioWallet |
| Motion EUR revenue | `CustomerBillingEvent` | Render Analytics billing section | Wallet analytics “grossRevenueEur” |
| Studio feature profitability | PCE + CBE join | Render Analytics → Studio Profitability | Billing analytics margin |
| Negative margin (wallet path) | Ledger `marginEstimate` | Studio Finance alerts | — |
| Negative margin (PCE path) | Profitability alerts | Render Analytics | — |
| Auto Top-Up attempts | `StudioAutoTopUpAttempt` | **No admin UI** | — |
| GenerationJob financial state | `GenerationJob` (+ chargeFinalized) | **No dedicated admin UI** | Render job CSVs only |

---

## Critical reliability caveat (proven)

`loadBillingAnalytics()` computes:

```ts
grossRevenueEur = creditsSold * USD_PER_CREDIT  // USD_PER_CREDIT = 0.005
```

Source: `src/server/admin/studio-billing-analytics-service.ts`.

This treats the **internal USD ledger unit** as **EUR pack revenue**. It is **not** Stripe Checkout EUR and **not** pack €/credit from S.8C (`€0.006–€0.010`).

**Implication:** Billing Control Center “gross/net revenue” and margin % are **not** commercial EUR truth. Label as *notional ledger revenue* or fix in a later phase — **do not build a second revenue dashboard that duplicates this without correcting it**.

True pack EUR requires Stripe amounts and/or pack price × purchases from metadata.

---

## Ownership of Admin domains

| Admin domain | Owner service | Mutates production money? |
|--------------|---------------|---------------------------|
| Catalog (packs/plans/pricing/promos/campaigns) | `studio-account/*` + billing admin APIs | **Yes** (config) |
| Wallet grants | `studio-billing-admin-service` | **Yes** (credits) |
| Stripe readiness | `studio-stripe-readiness-service` | No (read) |
| Wallet finance summary | `studio-finance-analytics` | No |
| Wallet commercial snapshot | `studio-billing-analytics-service` | No (numbers misleading for EUR) |
| Render/cost/profitability | `render-analytics` + `studio-profitability` + siblings | No |
| Vidu balance | `video/credits` → Vidu API | No |
| Health cards | various | No / repair actions |

---

## Canonical operator map (use existing)

| Operator question | Go here first |
|-------------------|---------------|
| Change pack/plan/price/promo | `/admin/billing/**` |
| Is Stripe configured? | `/admin/billing/stripe` |
| How many credits outstanding / spent? | `/admin/studio-finance` |
| Grant/remove user credits + ledger | `/admin/users` → Billing |
| Provider COGS / feature margin / CSV | `/admin/render-analytics` |
| Vidu provider balance | `/admin` → Video credits card |
| Replicate connectivity probe | `/admin/ai-lab/replicate` |

---

## Anti-duplication rule for S.8E+

Before adding any Admin financial surface:

1. Map the metric to the table above.  
2. If a surface already answers the question → **extend or relabel**, do not invent a peer.  
3. Never create a fourth money narrative (wallet / PCE / CBE already exist).
