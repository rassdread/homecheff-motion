# SP.2B.5 — Automatic cross-product silent SSO

**Date:** 2026-08-10  
**Verdict:** NO-GO for Unified Branding until human Production smoke.

## Behavior

| Mode | When |
|---|---|
| silent | Private product entry / login hydration; HC session → auto handoff |
| select_account | Explicit Continue with Google/email / Use another account |
| claim | Dual-proof legacy claim only |

## HC IdP

`interaction=silent` + no session → `redirect_uri?error=login_required&state=…` (no login UI).

## Studio

- `/auth/sso/silent` + private layouts / StudioAuthGate / `/login` hydration
- Loop: `studio_silent_sso_attempt`
- Post-logout: `studio_skip_silent_sso` (Studio logout ≠ global HC logout)
- Public marketing routes untouched

## Growth

- Proxy: no `growth_session` → `/auth/sso/silent` when allowed
- Same interaction contract + skip/attempt cookies
- No Growth JIT (linked `centralUserId` still required)
