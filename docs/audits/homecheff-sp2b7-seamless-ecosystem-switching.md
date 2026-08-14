# SP.2B.7 — Seamless HomeCheff Ecosystem Switching

**Date:** 2026-08-14  
**Status:** Code shipped — **Human SW-1…SW-8 PENDING**  
**Unified Branding / SP.2C:** **NO-GO** until SW matrix PASS

## Root cause (Production)

**Failure class A:** Ontdek HomeCheff destinations are public product origins (`https://studio.homecheff.eu`, `https://growth.homecheff.eu`). Those roots never invoked silent SSO, so a valid HomeCheff central session did not create `studio_session` / `growth_session`. Users saw marketing + Login.

Silent SSO, JIT, and product-session minting on **private** entry (`/login`, `/growth`, `/account`, …) were already correct.

## Fix

| Product | Change |
|---|---|
| Studio | Public `/` → one-shot `maybeSilentHydratePublicStudio` → `/auth/sso/silent?mode=public` |
| Growth | Public `/` → one-shot `maybeSilentHydratePublicGrowth` → same |
| Both callbacks | `login_required` + public returnTo → stay on public page (not `/login`) |
| Both silent routes | `mode=public` failures return to public returnTo |

Public marketing remains public. No shared product-session cookie. Security (PKCE, audience, allowlists) unchanged.

## Intended logout timing

- Product logout → clear product session + `*_skip_silent_sso` (~15 min)
- Within skip window: visiting `/` does **not** auto silent-SSO
- After skip expires (or interactive HomeCheff continue): intentional ecosystem nav may silent-SSO again

## Human matrix

| Test | Status |
|---|---|
| SW-1…SW-8 | PENDING |

Do **not** declare SP.2B CENTRAL IDENTITY COMPLETE until SW-1…SW-8 human PASS.
