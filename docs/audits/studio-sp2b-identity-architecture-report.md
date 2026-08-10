# SP.2B — Identity Architecture Report

**Date:** 2026-08-10  
**Repos:** `homecheff-motion` (Studio) + `homecheff-app` (IdP)

---

## Law (unchanged)

HomeCheff owns identity + authentication + Google.  
Studio / Growth own product sessions + product data only.

---

## Implemented architecture

```
HomeCheff (NextAuth + Google)
  → SSO authorize code (product=studio|growth)
  → Product callback
  → product session (studio_session | growth_session)
```

| Layer | Owner | Artifact |
|-------|-------|----------|
| Identity | HomeCheff | `User.id` = `centralUserId` |
| Auth | HomeCheff NextAuth | Credentials + GoogleProvider |
| Google | HomeCheff only | Prisma `Account` |
| Studio link | Studio | `User.centralUserId` + `centralLinkedAt` |
| Studio session | Studio | host-only `studio_session` HMAC |
| Growth session | Growth | host-only `growth_session` jose |
| Billing | Studio | `StudioAccount` / wallet on Studio `User.id` |

---

## Note on cookie naming

Product law sometimes calls the HomeCheff session `hc_session`.  
**Runtime truth:** HomeCheff uses `next-auth.session-token`.  
`hc_session` is **legacy** (Growth JWT / Studio HMAC dual-read only).
