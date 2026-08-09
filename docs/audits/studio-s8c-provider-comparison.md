# S.8C — Provider Comparison

**Date:** 2026-08-09 · **Read-only**

---

## Comparison matrix

| Dimension | OpenAI | ElevenLabs | Vidu | Replicate | Google Vision | FFmpeg/Internal |
|-----------|--------|------------|------|-----------|---------------|-----------------|
| Live Studio wallet | Yes | Yes | Yes | Editor segment | OCR path | Publish |
| Credit coverage | Broad | Audio/STT/clone | motion_render | transformation_session | ocr_scan | publish_* |
| COGS confidence | High (images) / med (LLM) | Med (char/min scale) | High when balance delta | **Low** (drift) | **None labeled** | Low compute, high reserved |
| Typical margin @ pack_8000 | ~70% | ~70% (clone 63%) | ~77% | ~70%* | unknown true | ≥70% listed |
| Cache leverage | Low | **High** (music/SFX/preview) | None | None | None | n/a |
| Job wrap maturity | Strong (S.8B) | Strong (S.8B) | Partial track-only | Weak | None | Weak |
| Retry cost control | Idempotency key | Same | Segment retry billed | Route-specific | Route-specific | Low |
| Scaling fitness | Good for images | Good if cache/library used | Costly at volume | Niche | Must fix metering | Cheap |
| Unsuitable if | Image API +50% sustained | Clone/STT spikes + TTS abuse | Vidu credits spike &gt; reserve | Price unknown | Blind P&amp;L | Never (compute) |

\* If actual segment is $0.02 not $0.012, margin compresses ~few points still SAFE at 30 credits.

---

## Relative profitability (registry actuals)

**Best effective margins:** Vidu motion (actual &lt; reserved), fusion default 25, ai_analysis (actual &lt; reserved), orchestrator override.  
**Core band:** OpenAI image/vision + ElevenLabs formula ≈ 70% @ pack_8000.  
**Thin:** voice_clone 63%.  
**Weak:** premium_vision 29%.  
**Blind:** Google Vision true COGS.

---

## Provider shock ranking (+50% COGS, pack_8000)

| Rank | Provider / action | Result |
|-----:|-------------------|--------|
| 1 | premium_vision (OpenAI) | **Negative** |
| 2 | voice_clone (ElevenLabs) | 44% CRITICAL/LOW |
| 3 | Formula OpenAI/EL image-audio | ~56% LOW_MARGIN |
| 4 | motion (Vidu) | ~65% still near SAFE |
| 5 | fusion 25 | ~64% SAFE/edge |

---

## Mix recommendations (advisory only — no implementation)

| Goal | Prefer | Avoid overuse |
|------|--------|---------------|
| Protect margin | Library/cache audio; Job replay | Bare regenerate loops |
| Scale video | Keep motion reserve buffer; monitor Vidu balance | Ignoring dual EUR ledger |
| Scale images | OpenAI metered path | Mislabeling as Replicate |
| OCR truth | Distinct Google metering | openai-labeled Google calls |
| Enterprise | Watch 15-cr fusion + premium vision | Assuming 25% discount is free |

---

## Planned providers (future)

Suno/Udio/Kling/Runway/Azure — `costTrackingEnabled` mostly true in registry metadata, but **no wallet SKU wiring**. Adding them without extending `STUDIO_ACTION_COST_REGISTRY` + metering would create leaks.

---

## Status

**PASS**
