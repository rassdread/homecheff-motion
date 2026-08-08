# Studio S.4 — AI Pipeline Audit (CERTIFIED)

**Branch:** `refactor/studio-s4-generation-orchestration`  
**Base:** `21a759c6`  
**PR:** #5

## Studio DB identity

| Field | Value |
|-------|-------|
| Neon org | `org-weathered-flower-15652984` |
| Neon project | `homecheff-motion` / `lively-hill-12198672` |
| Neon branch | `production` / `br-summer-unit-alsnfcyd` |
| Database | `neondb` |
| Endpoint | `ep-wild-morning-alynrf2i.c-3.eu-central-1.aws.neon.tech` |
| Postgres | 17.10 |
| Preview = Production DB | YES (shared `DATABASE_URL`) |

## PITR

| Field | Value |
|-------|-------|
| Instant Restore | **YES** |
| History retention | 86400s (1 day) |
| Oldest restorable (est.) | ~`current_utc − 1 day` |
| Confirmed via | `neonctl` authenticated API (`history_retention_seconds`) |
| Checkpoint UTC (pre-migrate) | `2026-08-08T21:20:42.516Z` |

## Migration drift

| Item | Detail |
|------|--------|
| Classification | **A. DB-applied migration missing locally** |
| Migration | `20260624120000_studio_asset_intelligence_cache` |
| DB state | finished successfully; checksum `df7aeeaa…afae57e7` |
| Schema objects | `StudioAssetIntelligenceCache` + indexes present |
| Root cause | Applied from WIP stash (`s3-preserve-unrelated-wip` / `6f5e4aa1`) not committed to branch |
| Resolution | Restored exact `migration.sql` from stash; checksum match; no `migrate resolve` needed |
| Commit | `fb9b0f3c` |

## GenerationJob migration

| Field | Value |
|-------|-------|
| Name | `20260808120000_studio_generation_job` |
| SQL | Additive CREATE TABLE + indexes + FK only |
| Applied | `2026-08-08T21:20:42Z` → `21:20:44Z` via `prisma migrate deploy` |
| Result | success; Prisma status: up to date |
| Rows after apply | 0 |
| Business counts | preserved (users 7, projects 43, storyboards 20, scenes 104, images 54, wallets 7, balance sum 103400) |

## Preview certification

| Gate | Result |
|------|--------|
| Deploy | `dpl_9GVeNvSxih7i23kKbQQWgiQVs98H` Ready |
| URL | https://homecheff-motion-13msekhow-sergio-s-projects-f7b64ee1.vercel.app |
| Image E2E | PASS |
| Voice E2E | PASS |
| Video/async fake path | PASS |
| Fusion validation + render prereq | PASS |
| Refresh/resume | PASS |
| Navigation resume | PASS |
| Concurrent jobs | PASS |
| Failure recovery / after charge | PASS |
| Idempotency / double-charge | PASS |
| Security (invalid + cross-user) | PASS |
| Credit E2E | PASS (wallet 500 → 380; delta 120 explained) |
| Performance | ACCEPTABLE |
| Preview gate | **GREEN** |

### Billing fix during cert

Storyboard-scoped `billProviderAction` wrote `ProviderCostEvent.projectId` with a non-`AnimationProject` id → FK P2003 after successful generation. Fixed by resolving AnimationProject FK (else metadata `studioProjectRef`) and never failing the paid path on telemetry write (`10909750`).

## Live adapter coverage

| Capability | Status |
|------------|--------|
| IMAGE_GENERATE | Live (Preview cert used `STUDIO_SCENE_IMAGE_PROVIDER=mock`) |
| VOICE_TTS | Live (mock body for TTS) |
| VIDEO_GENERATE | Vidu adapter + fake async harness |
| FUSION_RENDER | GenerationJob semantics |
| RENDER | Prerequisites + Motion link |

## Legacy StudioJob

**ADAPT** — keep bulk UI; bill per step; do not remove until full parity.

## Current gate

Preview GREEN. Proceed merge → production smoke for S.4 DoD completion.
