# SP.2B.1 — Authentication flow (presentation layer)

**Audience:** implementers / certifiers  
**Invariant:** HomeCheff remains sole IdP. This doc describes **user-visible** journeys and the unchanged under-the-hood SSO.

---

## Session model (unchanged)

```
Identity session (HomeCheff NextAuth)
        ↓ SSO exchange
Product session (studio_session | growth_session | …)
```

---

## Studio — Google (native button)

```
Studio /login → [Continue with Google]
  → GET /auth/sso/start?intent=google&returnTo=…
  → HomeCheff /auth/sso/start (product=studio, PKCE)
  → (if needed) HC login / Google OAuth on HomeCheff
  → Studio /auth/sso/callback
  → studio_session
  → optional /welcome (first product visit)
  → returnTo
```

Studio never registers a Google OAuth client.

---

## Studio — Email / password (native form)

```
Studio /login → user enters email + password
  → GET /auth/sso/start?email=…&intent=password&returnTo=…
  → HomeCheff /login?email=…&callbackUrl=/auth/sso/start?…
  → user completes credentials on HomeCheff (password validated by IdP)
  → SSO continue → Studio callback → studio_session
```

**Note:** Password is not sent to Studio. Field exists for UX continuity until HC supports credential-forwarding.

---

## Studio — Create account

```
Studio /signup → [Create account]
  → HomeCheff /register?callbackUrl=https://<studio>/auth/sso/start?returnTo=…
  → HomeCheff User (centralUserId)
  → resume Studio SSO start
  → Studio profile link/JIT
  → /welcome if first Studio visit
```

---

## Studio — Forgot password

```
Studio /login → Forgot password?
  → HomeCheff /forgot-password
  → reset on IdP
  → (manual return to Studio login — no return URL yet)
```

---

## Studio — First visit wizard

Triggered when SSO resolve reports `firstProductVisit` and `studio_welcome_done` cookie is absent.

Asks only Studio prefs: language, creator/business, interests, workspace, optional company.  
Persists to `localStorage` + `studio_welcome_done` cookie (no schema change).

---

## Returning users

If HomeCheff identity session exists, SSO start may complete with minimal friction (IdP session reuse). Studio still mints its own `studio_session`. No second password.

---

## Growth

Same presentation pattern should be applied in `homecheff-leads` (not in this repository). Backend already SSO-consumer shaped.
