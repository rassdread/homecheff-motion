# SP.2B — Preview Certification

**Date:** 2026-08-10  
**Status:** **CODE COMPLETE — LIVE PREVIEW CERT PENDING ENV**

---

## Prerequisites (not yet applied in this phase run)

| Item | Owner |
|------|--------|
| Deploy Studio with migration `20260810120000_studio_central_userid` | Studio Vercel |
| Deploy HomeCheff with Studio SSO registry | HomeCheff Vercel |
| Set matching `STUDIO_SSO_CLIENT_ID/SECRET` on HC + Studio | Ops |
| Exact `STUDIO_SSO_REDIRECT_URI` = Preview callback URL(s) | Ops |
| `HOMECHEFF_IDENTITY_ORIGIN` = HC Preview origin | Studio |
| `HOMECHEFF_VERCEL_BYPASS_SECRET` for S2S exchange (Preview only) | Studio |
| Flags ON: `CENTRAL_IDENTITY_ENABLED` + `CENTRAL_SSO_ENABLED` (+ JIT if desired) | Studio + HC |

---

## Preview checklist

| # | Step | Result |
|---|------|--------|
| 1 | Legacy Studio login still works with flags OFF | **Expected PASS** (defaults) |
| 2 | `/auth/sso/start` → `SSO_DISABLED` when flags OFF | **Expected PASS** |
| 3 | Flags ON → Continue with HomeCheff → HC login (email/Google) | **PENDING deploy** |
| 4 | Callback issues `studio_session` host-only | **PENDING deploy** |
| 5 | `centralUserId` set / JIT or link | **PENDING deploy** |
| 6 | Credits/wallet via `ensureStudioAccount` | **PENDING deploy** |
| 7 | No Google button on Studio | **PASS** (code) |
| 8 | Unit tests `studio-sso.test.ts` | **7/7 PASS** |
| 9 | HC `validate-phase-i2-sso-backend` | **PASS** (Growth still green) |

---

## Certification verdict

**Preview LIVE SSO: NOT CERTIFIED YET** — awaiting coordinated Preview env + deploy.  
**Preview CODE readiness: GO**
