# SP.2B — Session Verification

**Date:** 2026-08-10

| Concern | Studio behavior |
|---------|-----------------|
| Creation after SSO | `applyStudioSessionToResponse` — new nonce, 30d maxAge |
| Creation after legacy login | `createSession` — unchanged |
| Refresh / rotate | Still **none** (fixed maxAge) — same as pre-SP.2B |
| Expiration | Cookie maxAge 30 days |
| Logout | `clearSession` — Studio cookies only (not HC / Growth) |
| Cross-product login | Via HC SSO handoff when flags ON |
| Cross-product logout | **Not implemented** (each product clears own session) |
| Permissions | `requireActiveUser` / `requireAdmin` unchanged |
| Billing identity | Still Studio `userId` |

### Validation matrix (code-level)

| Flow | Status |
|------|--------|
| Existing Studio login (legacy ON) | Preserved |
| Existing Growth login | Untouched (sibling repo) |
| Existing HomeCheff login | Untouched except Studio product allowlist |
| SSO → studio_session | Implemented |
| Token expiration (pending / code) | Pending 10m · HC code ~60s · session 30d |
