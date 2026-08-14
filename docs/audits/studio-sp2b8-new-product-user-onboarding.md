# SP.2B.8 — Studio: new product user + SSO failure classification

**Date:** 2026-08-14  
**Companion:** Growth audit in Homecheff-Growth `docs/audits/homecheff-sp2b8-new-product-user-onboarding.md`

## Production SW-1 forensic

- Callback logged `centralUserIdPrefix` **before** failure → HomeCheff exchange **succeeded**.
- Immediate `sso_failure` code `EXCHANGE_FAILED` was a **misclassification**: Prisma could not reach Neon during resolve.
- User saw hardcoded English Sign-in problem UI.

## Code changes (this repo)

- `mapUnknownStudioCallbackFailure` + split callback phases
- i18n `/auth/sso/error`
- `/welcome` Welkom copy + start intents (`/maak`, `/studio`) + skip
- ensureStudioAccount failure after JIT → `RETRY_LATER`

## DoD

Human Production SW-1A/B/C required. Until then: **NO-GO** Unified Branding.
