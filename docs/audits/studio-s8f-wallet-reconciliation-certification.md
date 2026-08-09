# S.8F — Wallet Reconciliation Certification

**Date:** 2026-08-10  
**Probe:** `scripts/s8f-financial-ops-probe.ts` + ad-hoc Prisma counts  
**Database:** shared Neon (Preview/Production)  
**Mutation:** NONE  

---

## Inventory (probe)

| Metric | Count |
|--------|------:|
| Wallets | 9 |
| GenerationJobs | 40 |
| chargeFinalized jobs | 20 |
| usage_capture | 14 |
| ProviderCostEvents | 486 |
| Auto Top-Up attempts | 2 |
| Promo codes | 0 |
| subscription_payment rows | 0 |

---

## Categories

### Perfect

| Check | Result |
|-------|--------|
| Wallet bucket identity (purchased + promotional = balance) | **9/9 perfect** |
| Negative balance / reserved | **0** |
| Capture → PCE existence (when PCE id present) | **12/12 present; 0 missing** |

### Warning

| Check | Result | Notes |
|-------|--------|-------|
| Captures without `providerCostEventId` | **2** | Older / non-linked paths |
| Historical pack purchases without `amountEur` | **7/7** | Catalog fallback €34.93 — see historical section |
| Job↔reservation correlation via `creditReservationId` | **20/20 null on finalized charged jobs** | Ledger captures exist with reservationIds; Job field not persisted |

### Critical

| Check | Result |
|-------|--------|
| Auto-mutate reconciliation | **Not run** (forbidden) |
| Negative wallets | **None** |
| Orphan PCE ids on captures | **None** |

---

## GenerationJob sample (correlation honesty)

Random/recent finalized charged jobs (n=20):

- Wallet captures exist for corresponding actions (credits match nearby captures).  
- `StudioGenerationJob.creditReservationId` is **null** on all sampled charged finalized jobs → Admin browser cannot join reservation→capture via Job column alone.  
- PCE ids on captures resolve.  

**Classification:** WARNING (correlation gap), not a wallet money leak. Hardening (persist reservation on finalize) deferred — would touch GenerationJob write path; out of S.8F “no redesign” unless product prioritizes.

---

## Billing Analytics vs layers

| Layer | Observation |
|-------|-------------|
| Pack commercial EUR | Catalog fallback for all 7 historical purchases (€4.99 × 7 = €34.93) |
| Stripe amountEur | 0 rows until new Checkouts after S.8E |
| Subscription cash ledger | 0 `subscription_payment` rows yet |
| MRR | Still from active plan × price (forward-looking) |
| CBE | Parallel Motion EUR narrative — not used for pack gross |
| Provider cost (ledger) | Used for margin after FX |

---

## Verdict

**PASS with warnings** — wallets healthy; Job reservation persistence gap documented; no automatic mutation performed.
