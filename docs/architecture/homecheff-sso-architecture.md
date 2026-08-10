# HomeCheff SSO Architecture — Forensic Truth (SP.2A)

**Status:** READ-ONLY · 2026-08-10  
**Protocol detail (Growth):** `homecheff-product-sso-code-exchange.md`  
**Mode:** Discover only — no implementation

---

## Target pattern (ecosystem law)

```
User → HomeCheff login (Credentials | Google)
     → GET /auth/sso/start?product=…&redirect_uri=…&state&PKCE
     → one-time authorization code
     → Product /auth/sso/callback
     → server exchange → claims { centralUserId, email, … }
     → map/link local product User
     → issue host-only product session
```

**No shared long-lived auth cookie across products.**  
Each product keeps its own session after handoff.

---

## Runtime matrix

| Leg | Status |
|-----|--------|
| HomeCheff SSO issuer | **Code EXISTS** (`/auth/sso/start`, `/api/identity/v1/sso/*`) — gated by `CENTRAL_SSO_ENABLED` |
| Growth SSO consumer | **Code EXISTS** (`/auth/sso/start|callback`) — prod docs: **OFF** by default; Preview controlled |
| Studio SSO consumer | **ABSENT** — no `/auth/sso/*`, no client secret, no `centralUserId` |
| Single Logout (ecosystem) | **ABSENT** — each product clears own cookie only |
| Shared identity cookie | **Forbidden** — P0 containment after `hc_session` collision |

---

## Cookies (post-containment)

| Cookie | Product | Domain | Format |
|--------|---------|--------|--------|
| `next-auth.session-token` | HomeCheff | often `.homecheff.eu` (prod) | NextAuth JWT |
| `growth_session` | Growth | host-only | jose HS256 (3-part) |
| `studio_session` | Studio | host-only | HMAC (2-part) |
| `hc_session` | Legacy | was `.homecheff.eu` | Dual-read only; Growth JWT ≠ Studio HMAC |

Studio dual-read: accept `hc_session` **only if** Studio HMAC shape; reject Growth JWT.

---

## What Studio is missing for SSO (exact)

1. `User.centralUserId` (nullable → unique) + link timestamp  
2. Studio product registration on HomeCheff SSO allowlist (`product=studio`, redirect URIs)  
3. Routes: `/auth/sso/start`, `/auth/sso/callback` (or equivalent)  
4. Server exchange client credentials + PKCE  
5. Link / JIT provision policy (email collision rules)  
6. “Continue with HomeCheff” / Google-via-HC UX on Studio login  
7. Optional: deprecate public password signup in favor of central identity  
8. Single Logout strategy (optional later — not required for first SSO)

**Do not** reintroduce `Domain=.homecheff.eu` on `studio_session`.

---

## Deep links & return paths

| Product | Return mechanism |
|---------|------------------|
| Growth | `returnTo` (allowlisted) after SSO |
| Studio | **None for identity** — only creative handoff URLs |

---

## Compatibility verdict

Architecture **already supports** HomeCheff → Growth style SSO.  
Studio can **reuse** the same issuer without duplicating Google OAuth.  
Studio is **not yet a client** — that is the SP.2B+ work, not SP.2A.
