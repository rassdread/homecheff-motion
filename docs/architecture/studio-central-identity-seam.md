# HomeCheff Studio — Central Identity Seam (documentation only)

**Status:** SEAM DOCUMENTED — not implemented (S.1)  
**Yields from:** `docs/architecture/studio-architecture.md`  
**Canonical identity product doc (future):** `homecheff-central-identity.md`

## Current (unchanged in S.1)

- Cookie: `studio_session` (host-only)
- Legacy dual-read: `hc_session` Studio HMAC only (Growth JWT rejected)
- Local Prisma `User` with email/password

## Future mapping (no schema in S.1)

| Concept | Owner |
|---------|--------|
| Login / SSO | HomeCheff Central Identity |
| Local product user id | Studio `User.id` |
| Optional link | `centralUserId: string | null` (later phase) |
| Credits / wallet | Remain Studio-scoped unless billing federation is designed |

## Rules

- Do not reintroduce `Domain=.homecheff.eu` on Studio session cookies
- Do not treat Growth JWT as Studio session
- Product logic should depend on `SessionUser` / `requireActiveUser`, not raw cookie parsing
