# SP.2B — centralUserId Verification

**Date:** 2026-08-10

| Check | Result |
|-------|--------|
| Schema field `User.centralUserId` | **YES** — nullable unique |
| `User.centralLinkedAt` | **YES** |
| `passwordHash` nullable | **YES** — SSO users have no Studio password |
| Migration | `prisma/migrations/20260810120000_studio_central_userid` |
| Set on SSO link/JIT | **YES** — `resolveStudioUserFromCentralClaims` |
| Unique enforcement | Prisma `@unique` + SQL unique index |
| Billing still on Studio `User.id` | **YES** — unchanged |
| Permissions still on Studio `role` / `isActive` | **YES** |

### Propagation path

```
HC exchange claims.centralUserId
  → resolveStudioUserFromCentralClaims
  → User.centralUserId (link or create)
  → create studio_session(sub = Studio User.id)
```

Product data FKs remain Studio-local IDs — correct per identity ≠ product data.
