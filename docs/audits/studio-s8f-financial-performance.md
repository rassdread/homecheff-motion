# S.8F — Financial Performance Audit

**Date:** 2026-08-10  
**Mode:** Measure + recommend only — no query rewrites in this phase  

---

## Measured (shared Neon probe)

| Operation | Timing | Notes |
|-----------|-------:|-------|
| Load all `credit_purchase` rows | ~1348 ms | 7 rows today — scales with purchase history |
| Inventory counts (8 queries parallel) | ~259 ms | Fine |
| Job sample capture checks (20 jobs) | ~45 ms with null short-circuit | Would worsen if reservation join used |
| Full probe total | ~1.7 s | Acceptable for admin |

---

## Surface characteristics (code review)

| Surface | Pattern | Risk as data grows |
|---------|---------|-------------------|
| Billing Analytics | Loads **all** credit_purchase + all subscription_payment | **HIGH** at 10k+ purchases — recommend aggregate / date window |
| GenerationJobs browser | Last 75 jobs + up to 1200 ledger rows for owners | MEDIUM |
| Reconciliation | Up to 5k wallets + 500 captures + 200 jobs + targeted extras | MEDIUM–HIGH; N+1 avoided after S.8E fix |
| Promo codes | `findMany` all codes | LOW until large campaigns |
| Studio Finance | Wallet aggregate + all usage_capture/failed_refund ledger rows | **HIGH** — in-memory fold |
| Auto Top-Up admin | Last 100 attempts + groupBy | LOW |

---

## Recommendations (do not implement in S.8F)

1. **Billing Analytics:** SQL group/sum or time-bounded window; cache snapshot 60s.  
2. **Studio Finance:** aggregate `providerCostUsd` / margins in SQL; avoid loading full ledger.  
3. **Reconciliation:** background job + stored mismatch table (read-only UI).  
4. **GenerationJobs browser:** index already on `(ownerId, createdAt)`; add optional status filter server-side (already supported).  
5. **Indexes:** confirm `StudioLedgerEntry(actionType, createdAt)` for analytics scans.

---

## Verdict

**PASS for current scale** · Optimization backlog documented · No changes shipped.
