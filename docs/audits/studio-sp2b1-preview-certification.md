# SP.2B.1 — Preview certification (UX layer)

**Date:** 2026-08-10  
**Commit:** `2f76ce84`  
**Branch:** `feat/sp2b-studio-sso-consumer`  
**PR:** https://github.com/rassdread/homecheff-motion/pull/17  
**Depends on:** SP.2B Preview SSO live (see `studio-sp2b-preview-unblock-report.md`)

---

## Local code gates

| Check | Status |
|-------|--------|
| lint | **PASS** |
| build | **PASS** (`/welcome` routed) |
| tsc --noEmit | **PASS** |
| npm test | **PASS** `4794/4794` |
| studio-sso.test.ts | **PASS** `10/10` |
| i18n parity | **PASS** |

---

## Live Preview checklist

| Check | Expected | Status |
|-------|----------|--------|
| Studio Preview `/login` reachable | HTTP 200 app HTML | **BLOCKED** — Vercel Deployment Protection → `vercel.com/sso-api` |
| Native HomeCheff Studio brand + Welcome back | No “Continue with HomeCheff” primary CTA | **CODE READY** / live **PENDING** |
| Google button → `/auth/sso/start` | Not Studio Google OAuth | **CODE READY** |
| Email form → SSO start with email hint | Prefill HC login | **CODE READY** |
| Create account → HC register | Studio SSO callback | **CODE READY** |
| Forgot password → HC | No return URL yet | **CODE READY** |
| First Studio visit → `/welcome` | Product prefs only | **CODE READY** |
| Returning welcome cookie | Skip wizard | **CODE READY** |
| Wallet / projects continuity | Same `centralUserId` link | **CODE READY** (inherits SP.2B resolve) / live **PENDING** |
| Underlying SP.2B Preview SSO | GREEN | **NOT GREEN** |

Canonical Studio Preview alias (still protected):

`https://homecheff-motion-git-feat-sp2-ace053-sergio-s-projects-f7b64ee1.vercel.app`

---

## Certification verdict

**PREVIEW UX: CODE GO · LIVE NO-GO**

Do not mark SP.2B.1 Preview **PASS** until a human (or unprotected Preview) completes the live checklist with SSO flags ON.

**SP.2C: NO-GO**
