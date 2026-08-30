# Phase 3R — Pilot User Resolution (Steve Brown)

**Date:** 2026-08-28

## Code proof: allowlist field

Free Music pilot gating compares **`user.id`** from `requireActiveUser()` — not `centralUserId`, not email.

```17:17:src/app/api/studio/free-music/catalog/route.ts
  if (!isStudioFreeMusicCatalogEnabledForUser(user.id)) {
```

```43:48:src/lib/free-music/flag.ts
export function isStudioFreeMusicCatalogEnabledForUser(userId: string | null | undefined): boolean {
  // ...
  return pilot.includes(userId);
}
```

## Production identity resolution

| Field | Value |
|---|---|
| Display name (PO) | Steve Brown |
| Resolution method | Production DB lookup: unique `steve` email match |
| Studio `User.id` (**allowlist value**) | `cmszybweq0000jl046b7qqvt5` |
| Email | `steve@homecheff.eu` |
| `centralUserId` | `c54bbbcf-1323-4539-8e30-c2a6b7f95662` (SSO; **not** used for allowlist) |
| `role` | `user` |
| `invitedById` | `null` |
| `studioAccount.accountType` | `creator` |
| `isActive` | `true` |

## Hierarchy / billing isolation

| Check | Result |
|---|---|
| Sergio → Steve hierarchy created | **NO** |
| Subaccount / workspace / team mutation | **NO** |
| Billing ownership change | **NO** |
| HC wallet change | **NO** |
| New subscription / checkout | **NO** |

## Production pilot env (temporary)

Used during certification only:

```
STUDIO_FREE_MUSIC_CATALOG_ENABLED=false
STUDIO_FREE_MUSIC_PILOT_ENABLED=true
STUDIO_FREE_MUSIC_PILOT_USER_IDS=cmszybweq0000jl046b7qqvt5
```

Deployment with pilot active: `dpl_HGoT6oiWZ6WMVX4mJmewjYFNg2Sg`

## Safe-end restore (in progress)

`STUDIO_FREE_MUSIC_PILOT_*` variables **removed** from Vercel Production (defaults OFF). Fresh Production deploy requested to flush warm instances.

**Do not use `c54bbbcf-1323-4539-8e30-c2a6b7f95662` in `STUDIO_FREE_MUSIC_PILOT_USER_IDS`** — it would not match `user.id`.
