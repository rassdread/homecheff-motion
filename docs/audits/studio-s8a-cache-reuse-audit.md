# S.8A — Cache & Reuse Audit

**Date:** 2026-08-09 · **Read-only**

## Policies found

| Policy | Token / behaviour | Where |
|--------|-------------------|-------|
| Audio cache hit | `CACHE_HIT_NO_CHARGE` | `studio-audio-ownership.ts`; music/SFX routes `skipCapture` |
| Voice preview cache | free action `voice_preview_cache_hit` | free-action-registry + preview synthesizer |
| GenerationJob replay | Return prior `outputAssetId` — no rebill | orchestrator / audio Job wrapper |
| Technical recover | Same paid attempt | `/generation-jobs/[jobId]/recover` |
| Library reuse (product law) | Reuse ≠ regeneration | S.7C–S.7E contracts; music/SFX library |
| Subtitle/translation reuse | Should be free; edit free | S.7E; STT cache **TBD** |

## When generation / billing / credits occur

| Event | Generation? | Provider call? | Credits? |
|-------|-------------|----------------|----------|
| Fresh generate | Yes | Yes | Reserve → capture |
| Music/SFX cache hit | No new provider | No | skipCapture → refund reserve / 0 charge |
| Job replay | No | No | No |
| Job recover storage | No provider redo | No | No |
| Missing idempotency key + retry | Yes (new job) | Yes | **Yes again** |
| STT second click (bare) | Likely yes | Likely yes | **Likely yes again** |
| Subtitle edit | No | No | No |
| Continuity / Matrix / CD plan | No | No | No |

## Domains

| Domain | Cache/reuse truth |
|--------|-------------------|
| Voice | Preview cache free; TTS Job replay when keyed |
| Music / SFX | Library cache hit free |
| Motion | No CACHE_HIT_NO_CHARGE equivalent found |
| Fusion | Job idempotency when keyed |
| Images | Single scene Job; bulk/improve bare |
| Subtitles / translation | Reuse product law; Job wrap deferred; STT cache TBD |

## Status

**PASS as Product Truth**.
