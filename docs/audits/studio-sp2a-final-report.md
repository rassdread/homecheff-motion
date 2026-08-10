# SP.2A — Final Report — HomeCheff Central Identity & Authentication Audit

**Phase:** SP.2A — Central Identity & Authentication Audit  
**Date:** 2026-08-10  
**Mode:** READ-ONLY — no implementation · no commits · no push · no PR · no auth/session/OAuth/schema changes  

---

## FINAL REPORT

| Field | Value |
|-------|-------|
| **Repository** | `homecheff video ai` → `rassdread/homecheff-motion` |
| **Branch** | `main` |
| **HEAD** | `2434dd1d0cacc8813ae18ac0eb9946ac86a7a602` |
| **Canonical Identity Owner** | **HomeCheff** (`homecheff-app` / `User.id` = `centralUserId`) |
| **Canonical Authentication Owner** | **HomeCheff** (NextAuth Credentials + Google) |
| **Canonical Session Owner** | **Per product** after handoff — HC: NextAuth · Growth: `growth_session` · Studio: `studio_session` |
| **Canonical Google OAuth Owner** | **HomeCheff** (`GoogleProvider` + Prisma `Account`) |
| **Canonical User Model** | HomeCheff `User` (UUID) + product-local users linked by `centralUserId` |
| **Shared Identity Readiness** | **2 / 5** (Growth linked; Studio island) |
| **SSO Readiness** | **HC 4 · Growth 3.5 · Studio 1** / 5 |
| **Studio Readiness** | **1.5 / 5** for central identity |
| **Growth Readiness** | **3.5 / 5** (client + `centralUserId`; prod SSO gated OFF) |
| **HomeCheff Readiness** | **4 / 5** (IdP + Google + SSO issuer) |
| **Google Login Reuse** | **YES via HomeCheff SSO** — **NO** Studio-native Google OAuth |
| **Duplicate Account Risk** | **HIGH** (Studio independent signup) |
| **Session Architecture Score** | **3.5 / 5** |
| **Security Score** | **3 / 5** |
| **Product Experience Score** | **2 / 5** |
| **Final GO / NO-GO for SP.2B** | **GO FOR SP.2B** — Studio central-identity seam + SSO client (Growth pattern); **NO-GO** for Studio-native Google IdP |

---

## Sibling evidence (read-only)

| Product | Path | Remote | Note |
|---------|------|--------|------|
| HomeCheff | `~/Homecheff-app git` | `rassdread/homecheff-app` | NextAuth + Google + SSO issuer |
| Growth | `HomeCheffProjects/homecheff-leads` | `rassdread/Homecheff-Growth` | `centralUserId` + SSO consumer |
| Studio | this repo | `rassdread/homecheff-motion` | Local scrypt + `studio_session` only |

Canonical law also lives in Growth: `docs/architecture/homecheff-central-identity.md`.

---

## Blocking issues

1. Studio has **no `centralUserId`** and **no SSO client** — cannot share HomeCheff identity.  
2. Studio **public signup** creates parallel identities (duplicate risk).  
3. Studio password hashes (**scrypt**) are **not portable** to HC/Growth (bcrypt).  
4. **No Google on Studio** — correct vs central law; UX gap until SSO.  
5. Product Completion CTAs promising Google / one-account **cannot ship honestly** until SP.2B+.

---

## Non-blocking risks

- Stateless Studio sessions (no server revoke list).  
- No Studio forgot-password.  
- Legacy `hc_session` dual-read until sunset.  
- Growth/HC SSO production still flag-gated.  
- `AUTH_SECRET` default if misconfigured.  
- No ecosystem Single Logout.

---

## Definition of Done (SP.2A)

| Criterion | Status |
|-----------|--------|
| Central identity chain discovered | **PASS** |
| Auth / Google / sessions / SSO / security / UX audited | **PASS** |
| Reuse vs rebuild decided (Google → HC SSO) | **PASS** |
| Architecture + audit docs generated | **PASS** |
| No implementation / commits / auth changes | **PASS** |

---

## Recommended next step — SP.2B

**Studio Central Identity Seam Implementation (controlled):**

1. Add nullable unique `centralUserId` (+ link timestamp) — schema only when SP.2B starts.  
2. Register Studio as SSO product on HomeCheff (redirect allowlist).  
3. Implement Growth-pattern `/auth/sso/*` + exchange → issue `studio_session`.  
4. Login UX: “Continue with HomeCheff” (Google happens on HC).  
5. Explicit email-collision / link / JIT policy (copy Growth).  
6. Keep host-only `studio_session`; never shared-domain cookies.  
7. Defer ecosystem Single Logout and billing federation.

Do **not** add Google OAuth provider inside Studio.

---

## Doc index

| Doc |
|-----|
| `docs/architecture/homecheff-central-identity.md` |
| `docs/architecture/homecheff-authentication-architecture.md` |
| `docs/architecture/homecheff-sso-architecture.md` |
| `docs/audits/studio-sp2a-central-identity-audit.md` |
| `docs/audits/studio-sp2a-google-auth-audit.md` |
| `docs/audits/studio-sp2a-session-audit.md` |
| `docs/audits/studio-sp2a-sso-audit.md` |
| `docs/audits/studio-sp2a-security-audit.md` |
| `docs/audits/studio-sp2a-product-experience-audit.md` |
| `docs/audits/studio-sp2a-final-report.md` |
