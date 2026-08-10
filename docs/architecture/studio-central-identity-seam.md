# HomeCheff Studio — Central Identity Seam (SP.2B)

**Status:** IMPLEMENTED (flag-gated) — 2026-08-10  
**Yields from:** `docs/architecture/studio-architecture.md`  
**Canonical identity law:** Growth `homecheff-central-identity.md` + Studio `homecheff-central-identity.md`

## Current

| Item | Value |
|------|--------|
| Cookie | `studio_session` (host-only) |
| Legacy dual-read | `hc_session` Studio HMAC only (Growth JWT rejected) |
| Local Prisma `User` | email + optional `passwordHash` + optional `centralUserId` |
| SSO client | `/auth/sso/start` · `/auth/sso/callback` · `/auth/sso/error` |
| IdP | HomeCheff only (Credentials + Google) |
| Google on Studio | **Never** — CTA is “Continue with HomeCheff” |

## Flags (SAFE/OFF defaults)

| Flag | Default |
|------|---------|
| `CENTRAL_IDENTITY_ENABLED` | false |
| `CENTRAL_SSO_ENABLED` | false |
| `CENTRAL_SSO_JIT_PROVISIONING` | false |
| `LEGACY_STUDIO_LOGIN_ENABLED` | true |
| `CENTRAL_IDENTITY_REQUIRED` | false |

Live SSO = identity **and** SSO enabled.  
`CENTRAL_IDENTITY_REQUIRED` forces SSO redirect from `/login` and disables legacy password APIs.

## Mapping

| Concept | Owner |
|---------|--------|
| Login / SSO / Google | HomeCheff Central Identity |
| Local product user id | Studio `User.id` |
| Link | `User.centralUserId` (UUID, unique) + `centralLinkedAt` |
| Credits / wallet | Studio-scoped (`StudioAccount` / `StudioWallet`) |

## JIT / link rules (when JIT flag on)

1. Resolve by `centralUserId`
2. Else link unlinked Studio user by email (clear local password)
3. Else create Studio user with `passwordHash = null` + `ensureStudioAccount`
4. Email already linked to another central id → `IDENTITY_EMAIL_COLLISION`

## Rules

- Do not reintroduce `Domain=.homecheff.eu` on Studio session cookies
- Do not treat Growth JWT as Studio session
- Do not add Google OAuth inside Studio
- Product logic depends on `SessionUser` / `requireActiveUser`, not raw cookie parsing
