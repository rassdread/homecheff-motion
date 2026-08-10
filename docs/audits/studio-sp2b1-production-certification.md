# SP.2B.1 — Production certification (UX layer)

**Date:** 2026-08-10  

---

## Rules

- Production SSO flags remain **OFF** until SP.2B Production enablement is explicitly approved.
- Shipping native login UI with SSO **off** falls back to legacy `AuthForm` when legacy login is enabled.
- Enabling Production SSO without Preview UX + SSO GREEN is **forbidden**.

---

## Production checklist (when enabling)

| Check | Status |
|-------|--------|
| Preview SP.2B SSO GREEN | PENDING |
| Preview SP.2B.1 UX smoke PASS | PENDING |
| No Studio Google OAuth client in Production | PASS (by design) |
| Legacy signup disabled when identity required | PASS (gated) |
| Forgot-password return URL (optional HC follow-up) | NOT REQUIRED for enablement |

---

## Verdict

**PRODUCTION UX ENABLEMENT: NOT LIVE**

Safe to merge UX code behind existing flags; **do not** flip Production SSO solely for this phase.
