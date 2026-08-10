# SP.2B.3 — Central SSO account selection & login fix

**Date:** 2026-08-10  
**Repos:** NO-GO FOR SP.2C until human Production smoke (Parts 15–19) is green.

## Root cause (proven)

HomeCheff `GET /auth/sso/start` (`app/auth/sso/start/route.ts`): when `auth()` already had `session.user.id`, the issuer issued an authorization code and redirected to Studio **without** re-auth or account selection. Studio did not send an `interaction` intent. Claim confirmation was only a local `window.confirm`, and the callback linked whatever central identity the existing HC session produced.


## Fix summary

### HomeCheff IdP

- `interaction=silent|login|select_account|claim`
- Missing → `silent` (Growth returning SSO unchanged)
- Interactive + existing session → `/auth/sso/continue` (Continue as… / Use another account)
- `/auth/sso/switch` clears HC auth cookies only, then login with `prompt=select_account`
- Google web login passes `prompt=select_account` when SSO interactive

### Studio consumer

- Login / Google / email → `interaction=select_account`
- Claim → `interaction=claim`
- Callback claim **stages** confirmation at `/account/claim/confirm` (no silent link)
- `IDENTITY_NOT_LINKED` recovery: Try another account / Return to login / Link this Studio account

## Flags (unchanged)

- `CENTRAL_IDENTITY_REQUIRED=false`
- `CENTRAL_SSO_JIT_PROVISIONING=false`
- Legacy Studio login remains available

## Human smoke required before SP.2C

See mission Parts 15–19 / 26.
