# HomeCheff — Central login experience (Studio product surface)

**Status:** SP.2B remediation (identity environment + honest credential UX)  
**Authority:** HomeCheff = sole Identity Provider. Studio is a product consumer.

Related:

- [homecheff-central-identity.md](homecheff-central-identity.md)
- [studio-sp2b-identity-environment-alignment.md](../audits/studio-sp2b-identity-environment-alignment.md)
- [studio-sp2b-native-credential-ux.md](../audits/studio-sp2b-native-credential-ux.md)

---

## Product law (unchanged)

| Owner | Owns |
|-------|------|
| HomeCheff | Central `User`, password (bcrypt), Google OAuth, authentication, `centralUserId` |
| Studio | Studio product profile, projects/assets, `StudioAccount`, wallet, billing linkage, `studio_session` |

One person → one central identity, one password, one Google identity, one `centralUserId`.  
Products may keep independent host-only sessions.

---

## Studio `/login` (honest UX)

**Required presentation when central SSO is live:**

1. **Continue with Google** → Studio `/auth/sso/start?intent=google` → HomeCheff IdP → Google → HC session → Studio SSO callback. Studio never receives Google tokens.
2. **Continue with email** → optional email hint only → Studio `/auth/sso/start` → HomeCheff hosted `/login` collects password → SSO handoff → Studio.
3. **Create account** → HomeCheff `/register` with callback to Studio SSO start → provision/link in Studio DB only.
4. **Forgot password** → HomeCheff `/forgot-password` (single reset system).

**Forbidden:**

- Studio password input whose value is discarded before HomeCheff validation.
- Studio-native Google OAuth provider.
- Studio-local password reset for centralized users.
- Presenting legacy Studio scrypt and central auth as two equal identities.

**Legacy Studio scrypt:** available only when `CENTRAL_IDENTITY_REQUIRED=false` and `LEGACY_STUDIO_LOGIN_ENABLED=true`, under an explicit “legacy” disclosure — migration compatibility only.

---

## Credential validation path

There is **no** Studio-owned central credential API in this phase.

```
Studio (email hint optional)
  → HomeCheff hosted login / Google
  → HomeCheff validates bcrypt / Google
  → SSO authorize + code exchange (product=studio)
  → Studio callback sets host-only studio_session
```

Studio never stores or validates the central password.

---

## Existing-user link vs JIT

| Mode | Flag | Behavior |
|------|------|----------|
| Existing link | always (when SSO live) | Authenticated HC identity + unambiguous unlinked Studio email → set `centralUserId` + `centralLinkedAt` |
| JIT create | `CENTRAL_SSO_JIT_PROVISIONING=true` | No Studio user → create one (`passwordHash` null) + `ensureStudioAccount` |
| JIT off + no Studio user | default for certification | `IDENTITY_NOT_LINKED` |

Conflicting `centralUserId` or ambiguous ownership → **DENY** (no takeover).

---

## Sessions

- Studio: `studio_session` — HttpOnly, Secure, host-only, safe SameSite.
- HomeCheff: owns its own identity session.
- No shared product cookies across `.homecheff.eu`. Cross-product SSO is issuer/handoff only.

---

## Welcome

After first successful Studio provisioning/link, show `/welcome` only if Studio-specific onboarding is incomplete. Do not re-ask name, email, password, or Google identity.
