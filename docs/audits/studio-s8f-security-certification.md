# S.8F — Security Certification (Financial Admin)

**Date:** 2026-08-10  
**Mode:** Verify — no new auth system  

---

## Admin permissions

| Control | Evidence | Result |
|---------|----------|--------|
| Page gate | `admin/layout.tsx` → login redirect / forbidden chrome | PASS |
| API gate | All `/api/admin/billing/**` incl. new ATU/jobs/reconcile → `requireAdmin()` | PASS |
| Role | `canAccessAdmin` = `role === "admin"` only | PASS |
| Auth check logging | `logAuthCheck` on requireUser/requireAdmin | PASS |

---

## Cross-user / privacy

| Threat | Control | Result |
|--------|---------|--------|
| Non-admin reads wallet APIs | 401/403 | PASS |
| Admin sees all users’ financial rows | By design (ops) | ACCEPT |
| GenerationJob browser exposes prompts | Uses safe fields; metadata may include refs | PASS / watch |
| Reconciliation details JSON | Admin-only | PASS |
| Promo PATCH | Admin-only; can disable codes | PASS |

---

## Stripe / money endpoints

| Endpoint class | Change in S.8E/F | Risk |
|----------------|------------------|------|
| Checkout / webhook | Additive metadata + subscription_payment ledger | Low — no price change |
| Auto Top-Up execution | Unchanged | PASS (S.8B cert) |
| Admin ATU monitor | Read-only | PASS |

---

## Audit logging gaps

| Gap | Severity |
|-----|----------|
| No dedicated immutable admin audit log for promo enable/disable | Medium |
| No alert on reconciliation criticals | Medium |
| Auth checks logged; financial admin mutations not centrally audited | Medium |

---

## Verdict

**PASS** for access control. Residual: richer admin audit trail & alerting (ops backlog).
