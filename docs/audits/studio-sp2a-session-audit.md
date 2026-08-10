# SP.2A — Session Audit

**Date:** 2026-08-10 · **Read-only**

---

## Inventory

| Session | Cookie | Scope | Storage | TTL | Refresh |
|---------|--------|-------|---------|-----|---------|
| HomeCheff | `next-auth.session-token` | Often `.homecheff.eu` prod | NextAuth JWT | ~30d | NextAuth |
| Growth | `growth_session` | host-only | jose HS256 | ~7d | Re-login / SSO |
| Studio | `studio_session` | host-only | HMAC signed payload | 30d | **None** (fixed maxAge) |
| Legacy | `hc_session` | was shared domain | JWT or HMAC | — | Dual-read only |

---

## Studio session details

| Property | Value |
|----------|-------|
| Create | `createSession(userId)` — new nonce each login |
| Payload | `{ userId, nonce }` HMAC |
| Invalidate | `clearSession()` clears studio + legacy (+ domain clear) |
| Server revocation list | **ABSENT** — logout = cookie clear only |
| Cross-tab | Same host cookie shared |
| Cross-domain | **No** — host-only by design |
| Cross-product login | **No** automatic |
| Cross-product logout | **No** — Studio logout ≠ HC/Growth |

---

## Does session architecture support one ecosystem?

| Need | Supported? |
|------|------------|
| Isolated product sessions after SSO | **Yes** (target + Growth pattern) |
| One shared cookie for all products | **No — correctly forbidden** |
| Studio participate today | **No SSO handoff** |
| Silent cross-subdomain Studio login | **No** (and should not via shared cookie) |

**Session Architecture Score: 3.5 / 5** — containment correct; ecosystem handoff incomplete for Studio.
