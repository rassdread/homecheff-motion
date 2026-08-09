# S.8C — Provider Cost Audit

**Date:** 2026-08-09 · **Read-only** · **HEAD:** `0e8fe056fd1374ec77563efa8b92dc8e39a9ac4f`

---

## Scope

Inventory every Studio-relevant provider, its runtime use, pricing/metering sources, and GenerationJob/credit coupling. No price changes.

---

## Provider inventory

### OpenAI

| Field | Truth |
|-------|-------|
| Runtime | Images (DALL·E), vision, OCR path (often), translation, assistant interpret, fusion |
| API | OpenAI SDK / image + chat completions |
| Pricing source | `studio-cost-estimates.ts` (published/estimate constants) |
| Metering | `meterOpenAi*`, `billProviderAction` → linked PCE |
| Retry | New attempt = new paid idempotency key (Jobs) |
| Refund | Reservation refund on fail |
| Cache | Limited; premium vision dedupe by providerCallId |
| GenerationJob | IMAGE_GENERATE, IMAGE_EDIT, FUSION_RENDER, TRANSLATE, VISION_ANALYZE |
| Scaling risk | Image volume; dual PCE on scene paths |

### ElevenLabs

| Field | Truth |
|-------|-------|
| Runtime | TTS, STT, clone, music, SFX |
| Pricing source | Per-char TTS, STT $/min, clone $1 est., music $0.08, SFX $0.04 |
| Metering | TTS/STT/clone meters; music/SFX via wallet PCE |
| Cache | Preview + music/SFX `CACHE_HIT_NO_CHARGE`; STT **TBD** |
| GenerationJob | VOICE_TTS, VOICE_CLONE, MUSIC, SFX, SUBTITLE |
| Scaling risk | Long TTS scripts; music continuous regenerate without library reuse |

### Vidu

| Field | Truth |
|-------|-------|
| Runtime | Motion / video render |
| Pricing source | `$0.005`/Vidu credit; balance delta; presets 8–14 credits/s |
| Metering | `ProviderUsageLog` + `begin/completeViduRenderCostEvent` |
| Wallet | `motion_render` 450 cr default (min 180); charge-at-create; Job track-only |
| EUR parallel | `video-pricing-config.ts` CustomerBillingEvent tiers |
| Scaling risk | Heavy video; dual monetization narrative |

### Replicate

| Field | Truth |
|-------|-------|
| Runtime | Editor SAM3 / `transformation_session` (not main Studio image pipeline) |
| Pricing source | Mapping **$0.012** vs inventory **$0.02** (**drift**) |
| Metering | Via `billProviderAction` when gated — no dedicated meter helper |
| GenerationJob | Not full IMAGE_EDIT Job path |
| Scaling risk | Catalog historically labeled replicate while OpenAI executes images |

### Google Vision

| Field | Truth |
|-------|-------|
| Runtime | Preferred OCR when `GOOGLE_VISION_API_KEY` set |
| Pricing source | **None distinct** — PCE labeled `openai` |
| Metering | Gap: `recordOpenAiOcrCostEvent` unused; route hardcode $0.008 |
| Credit | `ocr_scan` (provider label `vision` in registry) |
| Scaling risk | True Google COGS invisible |

### Internal / FFmpeg

| Field | Truth |
|-------|-------|
| Runtime | Publish exports, merge, mux |
| Pricing source | Merge `$0.001`; publish registry reserved $0.015–0.04 |
| Metering | `internal_merge` / `video_export`; some EUR export flats |
| Credits | `publish_*` actions |
| Scaling risk | Over-reserved vs real compute (margin inflated vs true COGS) |

### Mock / fake

Dev/CI adapters only — not commercial live.

### Planned (registry `status: planned`)

Kling, Runway, Suno, Udio, Azure Voice, Artlist, Freesound (costTracking false), etc. — **no live wallet paths**. Live OpenAI/ElevenLabs/Vidu contradict registry “planned” status (known S.8A note).

---

## Unit cost table (code)

| Constant | USD | File |
|----------|----:|------|
| DALL·E 3 image | 0.04 | `studio-cost-estimates.ts` |
| Vision base / extra | 0.012 / 0.003 | same |
| OCR estimate | 0.012 | `render-analytics-cost.ts` |
| Translation / token | 0.000002 | `studio-cost-estimates.ts` |
| EL Multilingual / Flash per char | 0.0001 / 0.00005 | same |
| EL STT / minute | 0.22/60 | same |
| EL clone | 1.00 | same |
| Music / SFX | 0.08 / 0.04 | `studio-action-cost-mapping.ts` |
| Vidu credit | 0.005 | `cost-event-types.ts` |
| Replicate segment | 0.012 (mapping) | same |
| Internal merge | 0.001 | admin/cost helpers |
| Observed scene OpenAI | 0.055 | `studio-production-pricing-observed.ts` |
| Observed Vidu / upload scene | 0.15 | same |

---

## Cost gaps

1. Google Vision unlabeled  
2. Replicate $0.012 vs $0.02  
3. OCR $0.012 vs $0.008 route  
4. Dual PCE on OpenAI scene success  
5. Language/text export PCE $0 vs EUR CustomerBillingEvent  
6. Motion telemetry **partial** (S.8C margin input)  
7. Unwired `voice_suggestion` / `music_suggestion` (no live COGS)  
8. FX 0.92 vs 1.08 inconsistency in reports  

---

## Status

**PASS** — provider cost sources inventoried; drifts documented; no implementation.
