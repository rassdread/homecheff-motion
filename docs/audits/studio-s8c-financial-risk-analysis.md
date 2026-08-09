# S.8C — Financial Risk Analysis

**Date:** 2026-08-09 · **Read-only**  
Covers: sensitivity, heavy-use, cache, ATU, security, hidden leaks.

---

## 1. Provider price sensitivity

Shocks applied to registry `actualCostEstimateUsd`; customer revenue @ pack_8000; FX 1.08.

| Action | +5% | +10% | +20% | +50% | −10% | −20% |
|--------|----:|-----:|-----:|-----:|-----:|-----:|
| scene_generation | 68.9 | 67.4 | 64.4 | **55.6** | 73.3 | 76.3 |
| motion_render | 75.8 | 74.6 | 72.3 | 65.4 | 79.3 | 81.6 |
| voice_clone | 61.1 | **59.3** | 55.6 | 44.4 | 66.7 | 70.4 |
| premium_vision | 25.3 | 21.8 | 14.4 | **−6.7** | 35.9 | 43.0 |
| music_generation | 68.9 | 67.4 | 64.4 | 55.6 | 73.3 | 76.3 |
| fusion_render 25 | 75.1 | 73.9 | 71.6 | 64.4 | 78.7 | 81.1 |

**Become loss-making first:** premium_vision (~+40–50%).  
**Plans at risk:** Enterprise (25% discount) on thin SKUs.  
**Packs at risk:** pack_8000 cushion thinnest; premium_vision-heavy burn.  
**Providers unsuitable under +50%:** OpenAI premium vision path; ElevenLabs clone economics tighten; formula image/audio miss 65% target.

---

## 2. Heavy-use simulation summary

| Simulation | Provider $ | Customer € pack_8000 | Margin | Break-even note |
|------------|-----------:|---------------------:|-------:|-----------------|
| 100 images (scene) | 6 | 18.75 | 70% | Healthy |
| 1000 images | 60 | 187 | 70% | Healthy; cash + ops load |
| 500 videos (motion) | 350 | 1,406 | 77% | Large absolute COGS |
| 200 voice | 6 | 18.75 | 70% | Healthy if TTS ≤ reserved |
| 500 subtitles | 10 | 31 | 70% | STT duration may exceed flat |
| 100 music (no cache) | 8 | 25 | 70% | Cache would cut COGS |
| Continuous music (abuse) | unbounded | pack-limited | →0 if promo | Wallet hard-stop bounds prepaid |
| Mixed month ~17.6k cr | 31.5 | ~110 | ~73% | See profit model |

Loss only if thin SKUs / promos / bypasses dominate — not at list formula mix.

---

## 3. Cache / reuse / idempotency savings

| Mechanism | Savings | Margin impact |
|-----------|---------|---------------|
| Music/SFX CACHE_HIT_NO_CHARGE | Full provider $ per hit | +100% on hit |
| Voice preview cache | Full TTS preview $ | Portfolio ↑ |
| Job replay | Full action COGS | Prevents double charge |
| Technical recover | Full COGS | Same |
| Duplicate protection (idempotency) | Prevents N× charge+COGS | Critical for margin &amp; trust |
| Library reuse | Avoid regenerate | Product-law savings |
| STT cache | **TBD — unrealized** | Gap |

**Estimate:** At 30% music/SFX cache hit rate, those lines’ provider spend drops 30% → portfolio margin +1–3 pts depending on mix. Not a substitute for pricing discipline.

---

## 4. Auto Top-Up financial impact

| Aspect | Impact |
|--------|--------|
| Extra revenue | +pack EUR per successful Checkout |
| Extra provider spend | When granted credits burned |
| Subscription interaction | Eligible plans only; discount still on usage |
| Margin impact | Neutral on unit economics; increases volume |
| Abuse | Consent + 3/h + plan gate (S.8B CERTIFIED) |
| Residual | `thresholdCredits` unused; `hasPaymentMethod` hardcoded true on attempt path |

---

## 5. Security financial analysis

| Threat | Status after S.8B | Residual |
|--------|-------------------|----------|
| Free generation routes | Documented free registry | Intentional |
| Double charging | Job `chargeFinalized`; deterministic keys | Bare routes lower |
| Double refunds | Reservation once | Monitor ledger |
| Duplicate grants | Stripe webhook idempotent (cert) | DB bonus drift |
| Provider mismatch | OpenAI exec vs replicate labels reduced S.8B | OCR Google still mislabeled |
| Incorrect pricing override | DB StudioPricingRule power | Admin process risk |
| Wallet inconsistencies | Reserve model | Parallel race scrutiny ongoing |
| Negative balance | Reserve gates available | Admin/manual grants edge cases |
| Parallel reserve race | reservedBalance | Keep stress tests |
| Ledger mismatch | Immutable entries | Dual EUR narrative |
| Customer/provider mismatch | USD_PER_CREDIT name collision with Vidu | Documentation hazard |
| Forged production IDs | 403 certified | — |
| localStorage credits | Non-authoritative | Must stay so |

---

## 6. Hidden financial leaks (repository search)

| Leak / gap | Evidence | Severity |
|------------|----------|----------|
| Google Vision calls metered as OpenAI | OCR routes / mapping | **High** (blind COGS) |
| `recordOpenAiOcrCostEvent` dead | Unused helper | Med |
| Replicate cost drift $0.012 vs $0.02 | mapping vs inventory | Med |
| Dual PCE on scene images | metering + wallet linked | Med (analytics) |
| Motion Job track-only / partial telemetry | S.8C margin input | Med |
| Bare bulk/improve image routes | S.8A non-blocking | Med (retry charge) |
| STT cache TBD | audio policy | Med (missed savings / rebill) |
| Unwired suggestion actions in registry | voice_/music_suggestion | Low until wired |
| Language/text export $0 PCE + EUR bill | cost-event-types | Med (narrative) |
| Production transaction skip wallet capture | bill-provider-action | Intentional / audit |
| Admin bypass 0 credits | policy | Intentional |
| Promo grants 0€ revenue | policy | Configurable |
| FX 0.92 vs 1.08 | observed vs margin-sim | Med (report drift) |
| DB vs TS catalogs | packs/plans/flags | Med |
| Planned providers without wallet | registry planned | Future leak if enabled raw |
| Client editor credit simulation | localStorage | Contained if server SoT |
| Vidu EUR parallel vs wallet | video-pricing | Narrative risk |
| FFmpeg reserved ≫ true COGS | publish_* | Overcharge risk (customer) not leak |

**No evidence of silent unpaid OpenAI/ElevenLabs main Studio generate paths that skip `billProviderAction` when correctly wired** — residual risk is bare/legacy routes and mis-metering, not wholesale free generation.

---

## Status

**PASS** as risk inventory. Primary commercial risk: **premium_vision_analysis** + **Google Vision metering gap**. Primary operational risk: **provider +50%** on formula actions under pack_8000.
