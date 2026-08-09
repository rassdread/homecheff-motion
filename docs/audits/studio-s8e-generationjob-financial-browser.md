# S.8E — GenerationJob Financial Browser

**Date:** 2026-08-10

---

## Surface

| Item | Path |
|------|------|
| UI | `/admin/billing/generation-jobs` (Billing shell tab) |
| API | `GET /api/admin/billing/generation-jobs` |
| Service | `loadGenerationJobFinancialBrowser` |

---

## Columns / correlation

| Field | Source |
|-------|--------|
| Job identity | `StudioGenerationJob` |
| Customer | owner email |
| Action / capability / status | job row |
| Provider | `providerAdapter`, `providerJobId` |
| Credits reserved / charged / cost | job credit fields |
| Reservation | `creditReservationId` |
| Capture / refund | ledger by `metadata.reservationId` |
| ProviderCostEvent | `relatedJobId` or capture meta |
| CustomerBillingEvent | via PCE relation (if any) |
| chargeFinalized / idempotency / attempt | job row |
| cache / replay | metadata flags |

---

## Constraints

- Read-only  
- Does not replace Render Analytics job CSVs  
- Does not change GenerationJob execution or charging  
- Sample window: recent jobs (default 75) + correlated ledger/PCE  

---

## Status

**PASS** — browser delivered inside Billing Control Center.
