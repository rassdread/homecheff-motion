# SP.2B.1 — Unified Login UX Audit

**Phase:** SP.2B.1 — Unified HomeCheff Login Experience (UX layer)  
**Date:** 2026-08-10  
**Scope:** Presentation / journey only — **no** IdP, SSO protocol, Google OAuth ownership, cookies, or schema redesign  

---

## Product law (unchanged)

| Role | Owner |
|------|--------|
| Identity | HomeCheff |
| Authentication | HomeCheff |
| Google OAuth | HomeCheff only |
| Studio | SSO consumer (`studio_session`) |
| Growth | SSO consumer (sibling; same UX pattern) |

---

## Before → after (Studio)

| Before (SP.2B) | After (SP.2B.1) |
|----------------|-----------------|
| “Continue with HomeCheff” exposed IdP | Native **Continue with Google** + email/password |
| Auto-redirect when identity required | Always show Studio-branded login UI |
| Local signup when SSO live | Create account → HomeCheff `/register` → Studio SSO resume |
| No first-visit product wizard | `/welcome` for Studio-only prefs |
| SSO error CTA “Continue with HomeCheff” | “Back to login” / “Try again” |

---

## Honest UX gaps (documented, not papered over)

1. **Email/password is not fully silent on-page.** Studio collects email (+ password field for familiarity) but **does not** POST credentials to Studio. Submit opens HomeCheff login with email prefill via `/auth/sso/start?email=…`. True credential-forwarding would need a new HC API (out of scope).
2. **Google button is native-looking; OAuth remains on HomeCheff.** Intent `google` is reserved; flow still Studio → HC SSO → Google → HC → Studio session.
3. **Forgot-password** links to HC `/forgot-password` with **no return URL** (HC does not honor one yet).
4. **Growth** native login UX is **not** implemented in this repo (sibling `homecheff-leads`); pattern + docs only.
5. **Live Preview SSO** remains blocked by prior SP.2B Preview protection / env cert — UX code does not unblock that.

---

## Surfaces touched

- `/login` — native Studio presentation
- `/signup` — IdP register deep link when SSO live
- `/welcome` — first Studio visit wizard
- `/auth/sso/start` — optional `email` prefill hop
- `/auth/sso/callback` — first visit → `/welcome`
- `/auth/sso/error` — native CTAs

---

## Duplicate-registration prevention

- Legacy Studio signup/login APIs remain **gated** when `LEGACY_STUDIO_LOGIN_ENABLED` is false / identity required.
- SSO path creates/links Studio profile via existing resolve/JIT (`centralUserId`) — no second password store for new IdP users.
- Welcome wizard never asks name/email/password/Google.

---

## Verdict

| Item | Status |
|------|--------|
| Studio login feels native (UI) | **PASS** (code) |
| Architecture still HC-only IdP | **PASS** |
| No Studio Google OAuth | **PASS** |
| Silent password validation on Studio | **FAIL** (requires HC API — accepted gap) |
| Growth parity | **DEFERRED** (sibling) |
| Live Preview UX E2E | **PENDING** (depends on SP.2B Preview GREEN) |

**GO for UX code review / Preview smoke when SSO Preview is available.**  
**NO-GO FOR SP.2C** until SP.2B live Preview SSO + this UX layer are certified.
