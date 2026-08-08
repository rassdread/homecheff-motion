# Studio S.4 — AI Pipeline Audit (in progress)

**Branch:** `refactor/studio-s4-generation-orchestration`  
**Base:** `21a759c6` (S.3 GO on main)

## Inventory summary

See explore inventory in phase kickoff. Live providers: OpenAI (image/vision), ElevenLabs (voice/music/SFX/STT), Vidu (motion), ffmpeg (publish). Registry lists Replicate for some image actions but runtime uses OpenAI.

## Fragmentation (top)

| Item | Class | S.4 action |
|------|-------|------------|
| StudioJob bulk unbilled generate | RISKY | Fixed — bill per step |
| Dual fusion/variant paths | DUPLICATE | Document; share adapter later |
| Orphan registry keys | LEGACY | Leave catalog; no fake routes |
| Planned provider registry | LEGACY | Not runtime |
| Scene image sync vs job vs bulk | DUPLICATE | Canonical job on sync route first |

## Implemented this slice

- `StudioGenerationJob` schema + migration (additive)
- Status / errors / capability registry (SHARED_PURE)
- Orchestrator + job service + fake adapter
- Image POST route wired to orchestrator + idempotency
- Generation job GET (owner-scoped)
- Bulk job runner credit gate for generate/improve
- ADRs 006–008 + architecture docs
- Unit/contract tests

## PITR / migration

Additive table only. Before production migrate: confirm PITR/restore per HomeCheff governance. Checkpoint: pre-migrate `main` tip.

## Remaining for full S.4 DoD

- Voice/music/SFX/fusion/video adapters migrated
- Centralized polling hook
- Preview E2E refresh/resume/concurrency
- Production certification

## Current gate

**NO-GO FOR S.5** until Preview GREEN + production smoke for full DoD.
