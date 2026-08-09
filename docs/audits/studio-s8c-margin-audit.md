# S.8C — Margin Audit

**Date:** 2026-08-09 · **Read-only**  
**Calculator:** `computeActionPricingProfitability` + registry `actualCostEstimateUsd`  
**FX:** 1.08 · **€/credit worst-for-us:** 0.006249 (pack_8000) · **best-for-us:** 0.00998 (pack_500)

---

## Billable action registry (complete)

| actionType | credits | reserved $ | actual $ | provider label | runtime | Job | cache/free | margin% pack_8000 | margin% pack_500 | internal% |
|------------|--------:|-----------:|---------:|----------------|---------|:---:|------------|------------------:|-----------------:|----------:|
| ai_analysis | 3 | 0.005 | 0.003 | openai | openai | no | — | 85.0 | 90.6 | 80.0 |
| storyboard_generation | 10 | 0.02 | 0.02 | openai | openai? | no | wiring unclear | 70.4 | 81.5 | 60.0 |
| prompt_improvement | 4 | 0.008 | 0.008 | openai | openai | no | — | 70.4 | 81.5 | 60.0 |
| voice_suggestion | 3 | 0.005 | 0.005 | openai | **UNWIRED** | no | — | 75.4* | 84.6* | 66.7 |
| music_suggestion | 3 | 0.005 | 0.005 | openai | **UNWIRED** | no | — | 75.4* | 84.6* | 66.7 |
| character_generation | 20 | 0.04 | 0.04 | openai | openai image | gate | — | 70.4 | 81.5 | 60.0 |
| location_generation | 20 | 0.04 | 0.04 | openai | openai image | gate | — | 70.4 | 81.5 | 60.0 |
| prop_generation | 20 | 0.04 | 0.04 | openai | openai image | gate | — | 70.4 | 81.5 | 60.0 |
| world_generation | 25 | 0.05 | 0.05 | openai | openai image | gate | — | 70.4 | 81.4 | 60.0 |
| scene_generation | 30 | 0.06 | 0.06 | openai | openai_image | **yes** | — | 70.4 | 81.4 | 60.0 |
| voice_generation | 15 | 0.03 | 0.03 | elevenlabs | elevenlabs_tts | **yes** | preview cache | 70.3 | 81.4 | 60.0 |
| voice_clone | 400 | 1.0 | 1.0 | elevenlabs | elevenlabs_clone | **yes** | — | **63.0** | 76.8 | 50.0 |
| subtitle_transcription | 10 | 0.02 | 0.02 | elevenlabs | elevenlabs_stt | **yes** | STT TBD | 70.4 | 81.5 | 60.0 |
| music_generation | 40 | 0.08 | 0.08 | elevenlabs | elevenlabs_music | **yes** | CACHE_HIT | 70.4 | 81.4 | 60.0 |
| sfx_generation | 20 | 0.04 | 0.04 | elevenlabs | elevenlabs_sfx | **yes** | CACHE_HIT | 70.4 | 81.5 | 60.0 |
| assistant_interpret | 2 | 0.003 | 0.003 | openai | openai | no | — | 77.6 | 86.0 | 70.0 |
| ocr_scan | 4 | 0.008 | 0.008 | vision | openai/google | no | — | 70.4 | 81.5 | 60.0 |
| vision_analysis | 5 | 0.01 | 0.01 | openai | openai_vision | cap | — | 70.2 | 81.4 | 60.0 |
| premium_vision_analysis | 5 | 0.025 | 0.024 | openai | openai | no | — | **28.9** | **55.5** | **4.0** |
| motion_render | 450 | 0.9 | 0.7 | vidu | vidu_motion | track | — | 77.0 | 85.6 | 68.9 |
| publish_photo_story | 10 | 0.02 | 0.02 | ffmpeg | ffmpeg | no | — | 70.4 | 81.5 | 60.0 |
| publish_slideshow | 15 | 0.03 | 0.03 | ffmpeg | ffmpeg | no | — | 70.3 | 81.4 | 60.0 |
| publish_voice_message | 10 | 0.02 | 0.02 | ffmpeg | ffmpeg | no | — | 70.4 | 81.5 | 60.0 |
| publish_poster_export | 8 | 0.015 | 0.015 | ffmpeg | ffmpeg | no | — | 72.2 | 82.6 | 62.5 |
| publish_mp4_export | 20 | 0.04 | 0.04 | ffmpeg | ffmpeg | no | — | 70.4 | 81.5 | 60.0 |
| translation_export | 25 | 0.05 | 0.05 | openai | openai_translate | **yes** | — | 70.4 | 81.4 | 60.0 |
| image_generation | 20 | 0.04 | 0.04 | openai | openai | cap | — | 70.4 | 81.5 | 60.0 |
| image_edit | 15 | 0.03 | 0.03 | openai | openai_image | cap | — | 70.3 | 81.4 | 60.0 |
| fusion_render | 25† | 0.04 | 0.04 | openai | openai_image | **yes** | intent map | 76.3† | 85.2† | 68.0 |
| transformation_session | 30 | 0.06 | 0.06 | replicate | replicate | no | — | 70.4 | 81.4 | 60.0 |
| studio_orchestrator_production | 50 | 0.12 | 0.08 | openai | openai+prod | no | prod bypass | 76.3 | 85.2 | 68.0 |

\* Theoretical only (UNWIRED).  
† Intent overrides 15–50 credits — see below.

### Free registry (0 credits, not in margin table)

`assistant_execute_plan/step`, `consistency_analysis`, `correction_preview`, `crud_read/write`, `upload`, `browse`, `voice_preview_cache_hit` — `free-action-registry.ts`.

---

## Fusion intent margins (actual $0.04, pack_8000)

| Intent credits | Margin free | Margin enterprise 25% |
|---------------:|------------:|----------------------:|
| 15 | 60.5% SAFE/edge | **50.7% LOW** |
| 20 | 70.4% | 60.5% |
| 25 | 76.3% | 68.8% |
| 35 | 83.1% | 78.1% |
| 50 | 88.2% | 84.4% |

---

## After plan discounts (scene_generation 30 → …)

| Plan | Credits | Margin pack_8000 |
|------|--------:|-----------------:|
| free | 30 | 70.4% |
| creator 10% | 27 | 67.0% |
| pro 15% | 26 | 65.8% |
| studio 20% | 24 | 62.9% |
| enterprise 25% | 23 | 61.3% |

All remain ≥ 60% SAFE for scene_generation at registry actuals.

### premium_vision after discounts

| Disc | Credits | Margin pack_8000 | Status |
|-----:|--------:|-----------------:|--------|
| 0–15% | 5 | 28.9% | LOW_MARGIN |
| 20–25% | 4 | 11.2% | LOW_MARGIN |

---

## Margin after cache / ATU / promo / purchased

| Effect | Direction |
|--------|-----------|
| Cache hit | Provider $0 → effective margin 100% on that request; portfolio ↑ |
| ATU | Same pack unit economics; volume ↑ |
| Purchased credits | Full pack contribution as designed |
| Promotional credits | Revenue €0 on grant burn → **negative** contribution until packs bought |
| Admin / production bypass | COGS without wallet capture |

---

## Loss risk / abuse risk (per action)

| actionType | Loss risk | Abuse risk |
|------------|-----------|------------|
| premium_vision_analysis | **High** | Medium (cheap credits vs COGS) |
| voice_clone | Medium (thin) | Medium (400 cr confirm helps) |
| motion_render | Low–med if Vidu spikes | Medium (450 + confirm) |
| fusion 15-cr intents + enterprise | Medium | Medium |
| music/sfx without cache | Low | Medium (retry spam) |
| UNWIRED suggestions | n/a live | Speculative if wired without gate |
| publish_* | Low (COGS tiny) | Low |
| scene_generation | Low at list; med at +50% COGS | Medium (bulk/improve bare) |

---

## Status

**PASS** — margins calculated from code; `premium_vision_analysis` is the primary commercial outlier.
