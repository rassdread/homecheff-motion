# SP.2B — Preview SSO Certification Unblock Report

**Date:** 2026-08-10  
**Decision:** **NO-GO FOR SP.2C**

---

## Progress this session

| Item | Result |
|------|--------|
| Vercel CLI / auth | **PASS** (`npx vercel`, user `rsergioarrias-6539`) |
| Vercel Studio project | `homecheff-motion` |
| Vercel HomeCheff project | `homecheff-app` |
| Preview SSO env (branch-scoped) | **CONFIGURED** |
| Production SSO env | **UNTOUCHED** (no `STUDIO_SSO_*` / `CENTRAL_*` on Production) |
| Matching client id/secret | **SET twice from single generator** (pull redacts secrets — cannot re-read) |
| Redirect URI (exact, no wildcard) | Git alias + deployment URL CSV |
| Studio DB truth | **Shared Neon** `ep-wild-morning-…` Preview=Production capable |
| Migration applied | **YES** `20260810120000_studio_central_userid` |
| Pre/post counts | users 11→11, wallets 9→9, accounts 9→9, projects 2→2, linked 0 |
| passwordHash nullable | **YES** |
| Studio Preview deploy | **READY** (redeployed after env) |
| HomeCheff Preview deploy | **READY** (redeployed after env) |
| Studio TypeScript `tsc --noEmit` | **PASS** (exit 0) |
| Studio SSO unit tests | **7/7 PASS** |
| HomeCheff I.2 SSO validator | **PASS** |
| Live existing-user SSO | **BLOCKED** — Vercel Deployment Protection → `vercel.com/sso-api` |
| Google via HC E2E | **BLOCKED** (same) |
| Email/password via HC E2E | **BLOCKED** (same) |
| Automation bypass | **NOT USABLE** (pull len 0 / ineffective against Vercel SSO protection) |
| Merge PRs | **NOT DONE** (Preview not GREEN) |
| Production SSO flags | **OFF** |

---

## Canonical Preview hosts

| Role | URL |
|------|-----|
| Studio git alias | `https://homecheff-motion-git-feat-sp2-ace053-sergio-s-projects-f7b64ee1.vercel.app` |
| HomeCheff git alias | `https://homecheff-app-git-feat-sp2b-s-f64ffb-sergio-s-projects-f7b64ee1.vercel.app` |
| Callback | `{Studio git alias}/auth/sso/callback` (+ latest dpl URL in allowlist CSV) |

Branch-scoped Preview env:

- Studio: `feat/sp2b-studio-sso-consumer`
- HomeCheff: `feat/sp2b-studio-sso-issuer`

Flags Preview: `CENTRAL_IDENTITY_ENABLED=true`, `CENTRAL_SSO_ENABLED=true`, `JIT=false`, `REQUIRED=false`.

---

## Migration / PITR

| Field | Value |
|-------|-------|
| UTC checkpoint | `2026-08-10T00:36:41Z` |
| Target | Shared Neon `neondb` @ `ep-wild-morning-alynrf2i.c-3.eu-central-1.aws.neon.tech` |
| Safety | Additive only — applied because proven additive |
| PITR | Neon PITR assumed — confirm in console for rollback if needed |

---

## Blocking issues (exact)

1. **Vercel Deployment Protection** on Studio + HomeCheff Preview redirects unauthenticated HTTP to Vercel team SSO — agent cannot complete browser SSO chain.  
2. **Protection Bypass for Automation** not effective / empty when pulled — cannot automate protected Preview.  
3. Therefore live gates remain uncertified: existing-user SSO, Google via HC, email/password via HC, JIT OFF fail path, collision/conflict E2E, cookie inspection in browser, cross-product SSO, legacy/REQUIRED toggles, deep-link return, billing continuity live.

---

## What a human must do for Preview GREEN (≈15 min)

1. Log into Vercel team in browser.  
2. Open Studio Preview git alias → `/login` → confirm **Continue with HomeCheff**.  
3. Complete HC Preview login (Google + email/password).  
4. Confirm callback → `studio_session` → same Studio data.  
5. Run JIT OFF / conflict / legacy checklist from SP.2B plan.  
6. Reply with results → then merge PR #17 + #12 only if GREEN.

Optional unblock for agents later: enable **Protection Bypass for Automation** with a real secret on both Preview projects (or temporarily disable Deployment Protection on Preview only).

---

## Final decision

# NO-GO FOR SP.2C — PUBLIC PRODUCT & WEBSITE COMPLETION

Do not merge until Preview live SSO is GREEN.
