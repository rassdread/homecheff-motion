# SP.2B — Native credential UX fix

**Date:** 2026-08-10  
**Branch:** `feat/sp2b-studio-sso-consumer`  
**Related:** [homecheff-central-login-experience.md](../architecture/homecheff-central-login-experience.md)

---

## Defect (frozen)

Studio collected a password on `/login`, then discarded it (`void password`) before redirecting to HomeCheff. That is forbidden.

There is **no** secure Studio→HomeCheff central credential API in this phase.

---

## Chosen honest pattern

**Hosted HomeCheff login flow** (not a fake Studio password field):

| Control | Behavior |
|---------|----------|
| Continue with Google | → `/auth/sso/start?intent=google` → HC IdP → Google |
| Continue with email | Optional email hint → `/auth/sso/start` → HC `/login?email=` collects password |
| Create account | → HC `/register` |
| Forgot password | → HC `/forgot-password` |
| Legacy Studio scrypt | Details disclosure only when `CENTRAL_IDENTITY_REQUIRED=false` |

---

## Code

- `src/components/auth/login-page-content.tsx` — removed password input; email is optional hint only.
- `src/app/auth/sso/start/route.ts` — comments clarify password never accepted by Studio.
- i18n: `auth.login.continueEmail`, `continueEmailHint`, `emailHintPlaceholder` (en/nl).

---

## Acceptance

| Check | Status |
|-------|--------|
| No discarded-password field | **CODE PASS** |
| Google remains HC-routed | **CODE PASS** |
| Email password collected only on HC | **CODE PASS** |
| Live Preview visual smoke | **PENDING** (Deployment Protection) |
