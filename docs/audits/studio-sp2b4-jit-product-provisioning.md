# SP.2B.4 — Central identity product provisioning (JIT)

**Date:** 2026-08-10  
**Status:** Code + Production flag rollout; human smoke for admin@ + legacy claim still required for SP.2C.

## Problem

With `CENTRAL_SSO_JIT_PROVISIONING=false`, a valid HomeCheff user (e.g. `admin@homecheff.eu`) authenticated successfully but Studio showed `IDENTITY_NOT_LINKED` because no Studio product profile existed.

## Law

JIT creates a **Studio product profile only** for an already-authenticated HomeCheff identity. It does **not** create HomeCheff identity, passwords, or Google OAuth, and does not guess legacy ownership from mismatched email.

## Resolver order

1. `centralUserId` → reuse  
2. Exactly one unlinked Studio user by normalized email → link  
3. Explicit dual-proof claim (separate path)  
4. Else + JIT on → create Studio User (`centralUserId`, `centralLinkedAt`, `passwordHash=null`) + `ensureStudioAccount`  
5. Else + JIT off → `IDENTITY_NOT_LINKED`

## Production flags

- `CENTRAL_SSO_JIT_PROVISIONING=true` (after tests green)
- `CENTRAL_IDENTITY_REQUIRED=false` (unchanged)
- Legacy Studio login remains available
