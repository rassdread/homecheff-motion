# SP.2D-C1 — Studio authenticated bootstrap dedupe

**Status:** Implementation in progress → ship + re-measure  
**Scope:** Studio only · no SSO protocol / Growth / HC / favicon / region / Neon changes

## Phase 1 — Call origins (before)

### `/api/me/studio-account` on `/` after SSO (S3 measured ×4)

| # | Source | Client | Trigger |
|---|--------|--------|---------|
| 1 | `GlobalCreditIndicator` → `useStudioWalletSummary` | client | mount when `session.user` |
| 2 | `AppShellUserBar` → second `GlobalCreditIndicator` | client | mount (desktop + mobile bars both in DOM) |
| 3 | `LowCreditBanner` → `useStudioWalletSummary` | client | mount when authenticated |
| 4 | `ConversionSurface` / `useConversionSurface` **or** `HomeCheffAssistantProvider` billing effect | client | mount when authenticated |

Proven: parallel independent hooks — not StrictMode-only (Production HAR). No shared cache before C1.

### `/api/auth/session` (S3 measured ×1)

Already single-flighted via `auth-session-client.ts` (5s cache). Many `useAuthSession()` instances; one HTTP.

### `/api/studio/library-consistency/query` (S3 measured ×2)

| # | Source | Input | Trigger |
|---|--------|-------|---------|
| 1 | `UniverseHomeSections` | `limit: 8` | authenticated home |
| 2 | `HomeCheffAssistantProvider` | `limit: 500` | authenticated + every pathname |

Not identical payloads; both unfiltered list reads. Read-only (no mutation/repair). Admin audit/repair separate.

## Phase 2 — Ownership / blocking

| Datum | Owner | Blocking? |
|-------|-------|-----------|
| Session | `/api/auth/session` | Before authenticated UI |
| Studio account + wallet | `/api/me/studio-account` | Credit chip / conversion (shell can paint skeleton) |
| Ledger | same endpoint full view | Account pages only — **not** shell |
| Library list | library-consistency query | Home “recent assets” small; assistant context — **deferrable** |

## Phase 3–7 — Changes

1. `src/lib/studio-account-client.ts` — single-flight + 5s cache (`summary` / `full`)
2. `useStudioWalletSummary` + assistant billing → shared client (`?view=summary`)
3. `GET /api/me/studio-account?view=summary` → `loadStudioAccountSummary` (skips ledger)
4. `library-consistency-client` — bootstrap coalescing (unfiltered limits share one `limit=500` POST) + keyed single-flight for filtered queries
5. Assistant library load deferred via `requestIdleCallback` (timeout 1.5s) so home/shell paint first; then hits bootstrap cache

## Targets

- studio-account HTTP: 4 → **1** (initial burst)
- library-consistency HTTP: 2 → **1** (home+assistant coalesced)
- auth/session: stay **1**
