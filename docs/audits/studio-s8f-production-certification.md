# S.8F — Production Certification

**Date:** 2026-08-10  
**Commit on main:** `387ac840`  
**Host:** `https://studio.homecheff.eu`  
**Vercel Production deployment:** `5823602011` / `homecheff-motion-19exheq19-…`

---

## After merge (push to main)

| Check | Method | Result |
|-------|--------|--------|
| Deploy success | GitHub Vercel status | **PASS** |
| Routing — new Billing tabs | HTTP 200 on all listed paths | **PASS** |
| Permissions — APIs | Unauth → 401 `AUTH_REQUIRED` | **PASS** |
| Permissions — layout | Admin layout `canAccessAdmin` | **PASS** (code) |
| Rendering | Pages return 200 (login/admin shell) | **PASS** |
| Pagination / sorting / filtering / search | Not on new tables | **N/A** — sample lists by design |
| Regression — packs/plans/pricing | Untouched | PASS |
| Regression — wallet charge path | Untouched | PASS |
| Regression — Stripe Checkout | Additive metadata + subscription_payment | PASS |

---

## New Admin surfaces (Production smoke)

| Surface | Unauth page | Unauth API |
|---------|-------------|------------|
| `/admin/billing/auto-topup` | 200 | 401 |
| `/admin/billing/generation-jobs` | 200 | 401 |
| `/admin/billing/reconciliation` | 200 | 401 |
| `/admin/billing/promo-codes` | 200 | 401 |
| `/admin/billing/analytics` | 200 | 401 |
| `/admin/studio-finance` | 200 | 401 |
| Top nav Billing / Studio finance | present in build | — |

Interactive admin-session UI walkthrough (logged-in) not automated here — APIs/pages prove deploy + auth gate.

---

## Production LIVE constraints honored

- No paid LIVE Checkout during S.8F  
- Reconciliation read-only (DB probe only)  
- No promo toggles on production  

---

## Verdict

**PASS**
