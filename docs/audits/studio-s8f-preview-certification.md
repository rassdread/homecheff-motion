# S.8F — Preview Certification

**Date:** 2026-08-10  
**Commit:** `387ac840` (includes S.8E `0930f043`)  
**Mode:** Operational certification — no redesign  

---

## Deploy reality (this repo)

| Field | Value |
|-------|-------|
| Push | `main` `0e8fe056..387ac840` → `origin/main` |
| Vercel | **success** — https://vercel.com/sergio-s-projects-f7b64ee1/homecheff-motion/7c3hPxRPPnMULHuoLsotdr58t1qJ |
| GitHub environment | **Production** deployment `5823602011` (main pushes deploy Production; no separate Preview deployment created for this SHA) |
| Deployment URL | `https://homecheff-motion-19exheq19-sergio-s-projects-f7b64ee1.vercel.app` (Vercel SSO protection) |
| Public production host | `https://studio.homecheff.eu` |

Main-branch S.8F therefore certifies the **Production** deployment as the live surface. Branch Preview TEST isolation remains as documented in S.8B when using Preview deployments.

---

## Surface smoke (`studio.homecheff.eu`)

| Surface | HTTP | Result |
|---------|-----:|--------|
| `/admin` | 200 | PASS (route live) |
| `/admin/billing` | 200 | PASS |
| `/admin/billing/analytics` | 200 | PASS |
| `/admin/billing/auto-topup` | 200 | PASS |
| `/admin/billing/generation-jobs` | 200 | PASS |
| `/admin/billing/reconciliation` | 200 | PASS |
| `/admin/billing/promo-codes` | 200 | PASS |
| `/admin/studio-finance` | 200 | PASS |
| `/api/admin/billing/analytics` | 401 `AUTH_REQUIRED` | PASS |
| `/api/admin/billing/auto-topup` | 401 | PASS |
| `/api/admin/billing/generation-jobs` | 401 | PASS |
| `/api/admin/billing/reconciliation` | 401 | PASS |
| `/api/admin/billing/promo-codes` | 401 | PASS |
| `/api/admin/studio-finance` | 401 | PASS |

Deployment alias URLs redirect to Vercel SSO (expected for protected deployments).

---

## Verdict

**PASS** — S.8E surfaces routed and gated on Production host after deploy success.
