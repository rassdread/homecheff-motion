# HomeCheff Central Identity — Forensic Product Truth (SP.2A)

**Status:** READ-ONLY FORENSIC TRUTH (Studio repo copy)  
**Date:** 2026-08-10  
**Studio HEAD:** `2434dd1d0cacc8813ae18ac0eb9946ac86a7a602`  
**Mode:** No implementation · No auth changes  

**Canonical governance (Growth repo):**  
`homecheff-leads/docs/architecture/homecheff-central-identity.md` (Authoritative product law)

This Studio document records **what exists in code today** across the three products, for SP.2A.  
Where runtime differs from Growth’s canonical law, **runtime wins for readiness scoring**; law remains the target.

---

## Vision (target law)

One person → one HomeCheff account → one `centralUserId` → multiple products.  
Products share **identity only**, never business data.

---

## Product map (repos)

| Product | Repo | Remote | Identity role today |
|---------|------|--------|---------------------|
| **HomeCheff** | `~/Homecheff-app git` | `rassdread/homecheff-app` | **Canonical identity provider** (NextAuth + Google + SSO issuer) |
| **Growth** | `homecheff-leads` | `rassdread/Homecheff-Growth` | Product user + `centralUserId` link; local `growth_session`; SSO consumer (flagged) |
| **Studio** | `homecheff video ai` | `rassdread/homecheff-motion` | **Isolated local `User`**; `studio_session`; **no `centralUserId`**; **no SSO client** |

---

## Canonical ownership (target vs runtime)

| Concern | Target owner | Runtime today |
|---------|--------------|---------------|
| Canonical user / `centralUserId` | HomeCheff `User.id` (UUID) | HomeCheff owns; Growth links optionally; **Studio has no link field** |
| Email / password / Google | HomeCheff | HomeCheff: yes · Growth: local password optional · **Studio: local scrypt password only** |
| Profile (marketplace) | HomeCheff | HomeCheff |
| Product profile / creative data | Each product | Studio `User` + Studio* tables |
| Billing / credits | Product-scoped (Studio wallet) | Studio-local `StudioAccount` / `StudioWallet` on Studio `User.id` |
| Growth CRM memberships | Growth | Growth-local |
| Studio roles | Studio | `admin` \| `power` \| `user` on Studio `User.role` |

---

## Studio identity model (proven)

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String   // required — scrypt
  role         String   @default("user")
  isActive     Boolean  @default(true)
  // NO centralUserId
  // NO googleId / Account table
}
```

- Account creation: public signup + optional invite; first user → admin bootstrap.  
- Duplicate prevention: unique email → `EMAIL_IN_USE`.  
- Disabled: `isActive === false` → login/`requireActiveUser` blocked.  
- Deleted: no soft-delete identity workflow audited; Prisma cascade on product rows via relations.  
- Merge / OAuth link: **ABSENT**.

---

## Growth identity model (proven, sibling)

- `User.centralUserId?` `@unique` + `centralLinkedAt?`  
- Local password optional (`legacyLoginEnabled`)  
- Links via SSO / migration — not Studio-shared

---

## HomeCheff identity model (proven, sibling)

- NextAuth + Prisma adapter: `User`, `Account` (Google), sessions  
- Identity tables: `AuthIdentityLink`, `SsoAuthorizationCode`, `SsoAuditEvent`  
- Google via `Account.provider` + `providerAccountId` (no `googleId` column)

---

## Reuse conclusion

| Asset | Reusable for Studio? |
|-------|----------------------|
| HomeCheff SSO authorize/exchange | **Yes — primary reuse path** (Growth pattern) |
| Google OAuth on HomeCheff | **Yes — do not re-implement in Studio** |
| Growth `centralUserId` column pattern | **Yes — Studio needs equivalent seam** |
| Studio local session contract | **Keep** host-only `studio_session` after SSO handoff |
| Shared `.homecheff.eu` cookie | **No — P0 forbidden** |
| Studio password hashes → HC | **No** (scrypt ≠ bcrypt) without reset/SSO |

---

## Rules preserved

1. Do not write Studio session with `Domain=.homecheff.eu`.  
2. Do not treat Growth JWT as Studio session.  
3. Product logic depends on `SessionUser` / `requireActiveUser`, not raw cookies.  
4. Credits remain Studio-scoped until billing federation is designed.
