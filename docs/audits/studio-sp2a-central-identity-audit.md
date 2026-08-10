# SP.2A — Central Identity Audit

**Date:** 2026-08-10 · **Read-only**  
**Studio HEAD:** `2434dd1d`

---

## PART 1 findings

| Question | Finding |
|----------|---------|
| Canonical User model | **HomeCheff** `User` (UUID) — target & HC runtime |
| `centralUserId` | HC = User.id · Growth = linked column · **Studio = ABSENT** |
| Identity provider | HomeCheff (NextAuth) |
| Identity mapping | `AuthIdentityLink` on HC; Growth `centralUserId`; Studio none |
| Email identity | Unique per product DB today; not globally federated for Studio |
| Google identity | HC `Account` only |
| Password identity | HC + Growth (bcrypt) + Studio (scrypt, required) |
| Profile ownership | Marketplace/HC profile ≠ Studio creative profile |
| Account creation | Three independent signup paths possible |
| Account linking | Growth↔HC via SSO/migration; Studio none |
| Account merge | **ABSENT** across products |
| Duplicate prevention | Per-DB email unique only |
| Deleted / disabled | Studio: `isActive`; no cross-product disable sync |

---

## Duplicate identity risk

**HIGH** if same human signs up independently on HomeCheff, Growth, and Studio with the same email — three `User` rows, no automatic merge.

Growth mitigates via `centralUserId` uniqueness when linked.  
Studio creates a **parallel identity island**.

---

## What can be reused

- HomeCheff as sole IdP + Google  
- Growth SSO client pattern + `centralUserId` column  
- Studio host-only session after handoff  

## What must not be reused

- Shared `hc_session` / `.homecheff.eu` product session writes  
- Copying Google OAuth into Studio as a second IdP  

---

## Score contribution

**Shared Identity Readiness (Studio): 1.5 / 5** — seam documented; schema/runtime link missing.
