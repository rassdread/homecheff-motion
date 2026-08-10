# SP.2B.1 — Preview certification (UX layer)

**Date:** 2026-08-10  
**Depends on:** SP.2B Preview SSO live (see `studio-sp2b-preview-unblock-report.md`)

---

## Checklist

| Check | Expected | Status |
|-------|----------|--------|
| Studio Preview `/login` shows HomeCheff Studio brand + Welcome back | No “Continue with HomeCheff” primary CTA | **CODE READY** / live **PENDING** |
| Google button present | Starts `/auth/sso/start` (not Studio Google OAuth) | **CODE READY** |
| Email form present | Prefills HC via email hint | **CODE READY** (hop to HC login) |
| Create account | HC register with Studio SSO callback | **CODE READY** |
| Forgot password | HC forgot-password | **CODE READY** (no return URL) |
| First Studio visit | `/welcome` then product | **CODE READY** |
| Returning welcome | Skip wizard when cookie set | **CODE READY** |
| Live E2E against Preview aliases | Full SSO round-trip | **BLOCKED** until Preview protection / SP.2B live GREEN |

---

## Certification verdict

**PREVIEW UX: CODE GO · LIVE PENDING**

Do not mark SP.2B.1 Preview **PASS** until a human smoke on Preview aliases confirms the table above with SSO flags ON.
