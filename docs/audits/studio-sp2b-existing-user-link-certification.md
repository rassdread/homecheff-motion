# SP.2B — Existing-user link certification

**Date:** 2026-08-10  
**Branch:** `feat/sp2b-studio-sso-consumer`  
**JIT:** `CENTRAL_SSO_JIT_PROVISIONING=false` (unchanged for this cert)

---

## Policy

After **strong** HomeCheff authentication (SSO claims):

```
existing Studio User (centralUserId null)
+ authenticated HC User.id
→ Studio.centralUserId + centralLinkedAt
```

Email match alone is insufficient without authenticated HC identity (claims from exchange).

| Case | Result |
|------|--------|
| Match by `centralUserId` | Reuse Studio user |
| Unlinked Studio email + HC claims | Controlled link; `passwordHash` cleared; `ensureStudioAccount` |
| Studio email already linked to different `centralUserId` | **DENY** `IDENTITY_EMAIL_COLLISION` |
| Duplicate `centralUserId` rows | **DENY** `IDENTITY_MAPPING_CONFLICT` |
| No Studio user + JIT off | **DENY** `IDENTITY_NOT_LINKED` |
| No Studio user + JIT on | Create (separate JIT test — not this cert) |

Preserved on link: `StudioAccount`, wallet, ledger, billing, projects, assets, characters/audio (same Studio `User.id`).

---

## Code change

`src/lib/identity/sso/resolve-user.ts`: existing-user email link is **no longer gated by JIT**. JIT only gates **create**.

---

## Controlled identities (safe refs)

| Ref | Notes |
|-----|-------|
| Controlled HC user | Existing Production HC identity (read-only verify at smoke time). Do not log email in telemetry labels. |
| Controlled Studio user | Existing Studio owner with `centralUserId = null` matching HC email after auth. |

Exact emails/IDs are recorded only in private smoke notes — not in this repo doc.

---

## Live certification matrix

| Check | Status |
|-------|--------|
| Existing-user SSO link | **CODE READY** / live **PENDING** |
| No duplicate Studio user | **CODE READY** / live **PENDING** |
| Wallet / projects continuity | **CODE READY** / live **PENDING** |
| Google E2E same `centralUserId` | **PENDING** |
| Email/password E2E via HC | **PENDING** |
| centralUserId conflict DENY | **CODE READY** (unit/path) / live **PENDING** |
| Ambiguous collision DENY | **CODE READY** / live **PENDING** |

---

## Verdict

**CODE GO for link rules · LIVE NO-GO until human Preview smoke.**
