# S.8F — Operational Readiness

**Date:** 2026-08-10  

---

## Monitoring inventory (existing)

| Signal | Where | Gap? |
|--------|-------|------|
| Auth denials | `logAuthCheck` | No paging |
| Negative margin | Studio Finance + Render profitability banners | No email/Slack |
| Vidu balance | Admin dashboard card | No low-balance alert |
| OCR/vision/overlay health | Admin cards | Present |
| Stripe readiness | `/admin/billing/stripe` | Manual |
| Auto Top-Up attempts | `/admin/billing/auto-topup` (S.8E) | Present; no alert on fail spike |
| Wallet mismatches | `/admin/billing/reconciliation` (S.8E) | Manual refresh |
| ProviderCostEvent failures | Render analytics / PCE status | Partial |
| GenerationJob failures | Job browser + status field | Partial; reservation null gap |
| Stripe webhook failures | Stripe dashboard + past_due count | No in-app webhook failure inbox |
| Cron financial digests | **None** | Gap |
| `/api/health/video` | FFmpeg/worker — not financial | N/A |

---

## Historical revenue (no backfill)

| Field | Value |
|-------|-------|
| Rows without `amountEur` | **7** (100% of credit_purchase) |
| Packs | all `pack_500` |
| Dates | 2026-06-16 → 2026-08-09 |
| Catalog-resolved EUR | **€34.93** |
| Recovery source | Stripe Checkout `amount_total` via `metadata.stripeSessionId` |
| Backfill feasibility | **FEASIBLE** — not performed in S.8F |

---

## Scores (0–5)

| Dimension | Score | Notes |
|-----------|------:|-------|
| Billing | 4 | Commercial EUR fixed; historical catalog fallback |
| Credits | 4 | Pipeline solid |
| Wallet | 4 | Buckets perfect in probe |
| GenerationJobs | 3 | Charge works; reservationId not persisted |
| Providers | 4 | Metering mature; Google Vision gap (S.8C) |
| Telemetry | 3 | Dual narratives; dual PCE possible |
| Admin | 4 | S.8E surfaces complete |
| Security | 4 | Admin gates OK; audit trail thin |
| Performance | 3 | OK now; analytics/finance scan risk |
| Commercial readiness | 4 | Prepaid model certified |
| Support readiness | 3 | Tools exist; no alert routing |
| Operational readiness | **3.5 → 4** | Certifiable with documented warnings |

---

## Verdict

**Operationally ready for continued Studio use** with known correlation/historical/monitoring gaps. Not a blocker for S.9 product work if warnings accepted.
