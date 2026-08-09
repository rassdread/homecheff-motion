# S.8E — Billing Analytics Certification

**Date:** 2026-08-10

---

## Defect (S.8D)

```ts
grossRevenueEur = creditsSold * USD_PER_CREDIT  // 0.005 treated as EUR
```

Also: `netRevenueEur = grossRevenueEur - providerCostUsd` mixed EUR − USD.

---

## Fix (proven in code)

| Metric | Source |
|--------|--------|
| `packRevenueEur` | Each unique `credit_purchase` → Stripe `amountEur` / `amountTotalCents` in ledger metadata, else pack catalog `priceEur` |
| `subscriptionRevenueEur` | Sum `subscription_payment` ledger rows (`amountEur` from Stripe `invoice.amount_paid`) |
| `grossRevenueEur` | `packRevenueEur + subscriptionRevenueEur` |
| `providerCostEur` | `providerCostUsd / FX` (`resolveEurToUsdRate`) |
| `netRevenueEur` / margin | EUR − EUR |

Helper: `src/lib/studio-commercial-revenue.ts`  
Service: `src/server/admin/studio-billing-analytics-service.ts`  
Forward persist: `stripe-billing.ts` writes `amountEur` on pack grant; `subscription_payment` on `invoice.paid`.

---

## Unit tests

`src/lib/studio-commercial-revenue.test.ts` — PASS (6):

- Catalog ≠ credits × $0.005  
- Stripe amount preferred  
- Dedupe by session  
- FX margin math  

---

## Unchanged

| Area | Status |
|------|--------|
| Wallet balances / credit costs | Unchanged |
| Pack / plan / action prices | Unchanged |
| Provider COGS writers | Unchanged |
| Auto Top-Up execution | Unchanged (monitor only) |
| GenerationJob charge logic | Unchanged (browser only) |

---

## Historical caveat

Older `credit_purchase` rows without `amountEur` use **pack catalog list price** (pre-discount). New checkouts store Stripe `amount_total`. Subscription cash only accumulates for invoices paid **after** this deploy.

---

## Verdict

**CERTIFIED** — Billing Analytics reports commercial EUR, not notional credit×0.005.
