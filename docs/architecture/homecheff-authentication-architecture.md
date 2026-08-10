# HomeCheff Authentication Architecture — Forensic Truth (SP.2A)

**Status:** READ-ONLY · 2026-08-10  
**Mode:** Discover only

---

## Ecosystem authentication inventory

### HomeCheff (`homecheff-app`)

| Capability | Status | Notes |
|------------|--------|-------|
| Email/password | **EXISTS** | NextAuth Credentials |
| Google OAuth | **EXISTS** | `GoogleProvider` + Prisma `Account` |
| Session | **EXISTS** | NextAuth JWT ~30d; cookie `next-auth.session-token`; prod often `Domain=.homecheff.eu` |
| Logout | **EXISTS** | NextAuth signOut |
| Email verification | **PARTIAL** | `emailVerified` field / flows in HC |
| Forgot / reset password | **EXISTS** (HC product) | Not Studio |
| Magic links | Not audited as primary | |
| SSO issuer | **EXISTS (flagged)** | `/auth/sso/start`, `/api/identity/v1/sso/{authorize,exchange}` |

### Growth (`Homecheff-Growth` / `homecheff-leads`)

| Capability | Status | Notes |
|------------|--------|-------|
| Email/password | **EXISTS** | bcryptjs; optional after central link |
| Google OAuth (local) | **ABSENT** | Design: Google only on HomeCheff |
| Session | **EXISTS** | jose HS256 → `growth_session` host-only, ~7d |
| Legacy cookie | Dual-read `hc_session` JWT only | Clears shared-domain legacy |
| SSO consumer | **EXISTS (flagged)** | `/auth/sso/*`; `CENTRAL_SSO_ENABLED` default OFF in prod docs |
| Forgot / reset | Present in Growth model | Product-local |

### Studio (`homecheff-motion`)

| Capability | Status | Path |
|------------|--------|------|
| Email/password login | **EXISTS** | `POST /api/auth/login` |
| Signup | **EXISTS** | `POST /api/auth/signup` (invite optional) |
| Logout | **EXISTS** | `POST /api/auth/logout` → `clearSession` |
| Session probe | **EXISTS** | `GET /api/auth/session` |
| Password crypto | **EXISTS** | scrypt in `src/server/auth/session.ts` |
| Google OAuth login | **ABSENT** | Vision OCR key only |
| Session refresh / rotate | **ABSENT** | Fixed 30d maxAge HMAC cookie |
| Remember me | **ABSENT** | Implicit 30d cookie only |
| Forgot / reset password | **ABSENT** | No routes |
| Email verification | **ABSENT** | No `emailVerified` |
| Magic links | **ABSENT** | |
| SSO client | **ABSENT** | Seam doc only |

---

## Studio auth flow (proven)

```
Signup/Login (email+password)
  → verifyPassword / hashPassword (scrypt)
  → createSession(userId)
  → Set-Cookie: studio_session = base64url({userId,nonce}).hmacHex
       HttpOnly; SameSite=lax; path=/; host-only; maxAge=30d
  → getAuthenticatedUser() → prisma.user.findUnique
  → requireActiveUser / requireAdmin
```

UI: `src/components/auth/auth-form.tsx` — email/password only.

---

## Password portability

| From → To | Compatible? |
|-----------|-------------|
| Growth bcrypt ↔ HomeCheff bcrypt | Design-compatible |
| Studio scrypt → HomeCheff / Growth | **No** without password reset or SSO-only login |

---

## Middleware

Studio `src/middleware.ts`: **no auth gate** on pages (CORS / logging).  
Hard login enforced in route handlers via `requireUser` / `requireActiveUser` / `requireAdmin` for APIs and selected pages (`/account`, `/admin`, `/mijn-verbruik`).

---

## Env (Studio auth)

| Var | Role |
|-----|------|
| `AUTH_SECRET` | HMAC signing |
| `COOKIE_SECURE` | Secure flag override |
| `VERCEL` / public HTTPS URLs | Infer Secure |
| `AUTH_CHECK_LOG` | Debug logging |
| `E2E_SESSION_COOKIE` | Playwright inject |

**Absent in Studio:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CENTRAL_SSO_*`, NextAuth session package.
