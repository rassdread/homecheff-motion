# S.8E — Wallet ↔ Provider Reconciliation

**Date:** 2026-08-10

---

## Surface

| Item | Path |
|------|------|
| UI | `/admin/billing/reconciliation` |
| API | `GET /api/admin/billing/reconciliation` |
| Service | `loadWalletProviderReconciliation` |

---

## Checks (mismatches only)

| Code | Meaning |
|------|---------|
| `WALLET_BUCKET_BALANCE_MISMATCH` | purchased + promotional ≠ balance |
| `WALLET_NEGATIVE_BALANCE` | balance or reserved &lt; 0 |
| `LEDGER_PCE_MISSING` | usage_capture → missing ProviderCostEvent |
| `JOB_CAPTURE_MISSING` | chargeFinalized job without usage_capture |
| `CBE_PCE_MISSING` | CustomerBillingEvent → missing PCE |

---

## Guarantees

- **Never mutates** wallet, ledger, jobs, PCE, or CBE  
- Highlights only — operator investigates  
- Sample-scoped (recent captures/jobs/events) for performance  

---

## Status

**PASS**
