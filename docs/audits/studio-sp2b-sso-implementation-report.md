# SP.2B — SSO Implementation Report

**Date:** 2026-08-10

---

## Reused from Growth

| Growth | Studio port |
|--------|-------------|
| `/auth/sso/start\|callback\|error` | Same routes |
| PKCE S256 + HMAC pending cookie | `studio_sso_pending` |
| Exchange client → HC `/api/identity/v1/sso/exchange` | `product: "studio"` |
| Claims validation | `aud === "studio"` |
| Flag pair `CENTRAL_IDENTITY_ENABLED` + `CENTRAL_SSO_ENABLED` | Same |
| Host-only product session after handoff | Existing `studio_session` writer |

## Studio deltas vs Growth

| Topic | Growth | Studio SP.2B |
|-------|--------|--------------|
| Resolve | Linked `centralUserId` only | Linked + **JIT/link-by-email** when `CENTRAL_SSO_JIT_PROVISIONING` |
| Session format | jose JWT | Existing Studio HMAC (unchanged) |
| Password | Optional legacy | Optional; cleared on central link |
| CTA | Continue with HomeCheff | Same — **never** Continue with Google |

## HomeCheff issuer changes

- `SSO_PRODUCTS` includes `studio`
- `STUDIO_SSO_CLIENT_ID/SECRET/REDIRECT_URI` registry
- Exchange claims `aud` = authenticated client product

## Env (Studio)

See `.env.example` SP.2B block. Defaults **OFF** — production behavior unchanged until flags + secrets are set.
