# SP.2A — SSO Audit

**Date:** 2026-08-10 · **Read-only**

---

## Capability matrix

| Capability | HomeCheff | Growth | Studio |
|------------|-----------|--------|--------|
| Single Sign-On (issuer) | Flagged EXISTS | — | — |
| Single Sign-On (client) | — | Flagged EXISTS | **ABSENT** |
| Single Logout | Local only | Local only | Local only |
| Shared identity (`centralUserId`) | Owns | Linked | **ABSENT** |
| Return URLs / `returnTo` | SSO start params | Allowlisted | **ABSENT** |
| Deep links (identity) | Product launcher patterns | After callback | Creative only |
| Cross-product navigation | Brand / links | Brand / links | Suite-internal only |
| Login redirects | NextAuth | Local + SSO | `/login` local |
| Auth handoff | Code exchange | Consumes | **Missing** |

---

## Production readiness note

Growth Phase I docs: `CENTRAL_SSO_ENABLED` **default OFF** in production; Preview controlled enable.  
Studio has **zero** SSO client surface — independent of Growth flag state.

---

## Missing for Studio (do not implement in SP.2A)

See `docs/architecture/homecheff-sso-architecture.md` — eight concrete gaps (schema link, routes, allowlist, exchange, JIT/link policy, UX, signup policy, optional SLO).

---

## Product integration (identity only)

| Concern | Shared today? |
|---------|---------------|
| Users | **No** (three DBs) |
| Authentication | **No** for Studio |
| Authorization | Product-local |
| Profile | **No** |
| Billing identity | Studio-local Stripe/`userId` |
| Subscriptions / credits | Studio-local |
| Workspace / Growth memberships | N/A to Studio |
| Studio memberships | Role string only |
| Role / permission mapping across products | **ABSENT** |

---

## SSO Readiness

| Product | Score |
|---------|-------|
| HomeCheff | **4 / 5** (issuer present; prod gate) |
| Growth | **3.5 / 5** (client present; prod OFF) |
| Studio | **1 / 5** (docs/seam only) |
