# SP.2B — Security Verification

**Date:** 2026-08-10

| Control | Status |
|---------|--------|
| PKCE S256 | **PASS** |
| State HMAC + TTL | **PASS** |
| One-time HC authorization code | **PASS** (issuer) |
| Exact redirect URI allowlist | **PASS** (issuer registry) |
| Bearer client secret (Studio) | **PASS** |
| Claims `aud=studio` enforced | **PASS** |
| No Studio Google OAuth | **PASS** |
| No shared product session cookie | **PASS** |
| Email collision → hard fail | **PASS** (`IDENTITY_EMAIL_COLLISION`) |
| JIT gated by flag | **PASS** (default OFF) |
| Legacy login disable when required | **PASS** |
| Open redirect on returnTo | **PASS** (allowlist) |
| Server revoke list | Still ABSENT (pre-existing) |
| Cross-product Single Logout | Still ABSENT (out of scope) |

Defaults keep Production behavior unchanged until flags + secrets are explicitly enabled.
