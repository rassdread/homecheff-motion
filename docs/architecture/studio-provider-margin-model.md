# Studio Provider Margin Model (S.8C)

**Status:** CANONICAL FINANCIAL MODEL (read-only discovery)  
**Date:** 2026-08-09  
**Branch:** `main` @ `0e8fe056fd1374ec77563efa8b92dc8e39a9ac4f`  
**Mode:** No pricing changes · No implementation

---

## Ownership

| Layer | Owns | Does not own |
|-------|------|--------------|
| Billing | Stripe money-in (packs, subscriptions, ATU Checkout) | Per-action COGS |
| Credits | Wallet reserve/capture/refund; credit costs | Provider SDK calls |
| GenerationJobs | Execution + charge finalize (when wired) | Pack prices |
| Provider adapters | Runtime API execution | Customer EUR |
| Telemetry | `ProviderCostEvent` / metering estimates | Charging users |
| Financial Audit (S.8C) | Verification + margin math from code | Changing prices |

---

## Unit economics constants (proven)

| Constant | Value | Source |
|----------|------:|--------|
| `USD_PER_CREDIT` | **$0.005** | `src/lib/studio-credit-constants.ts` |
| `CREDIT_MARGIN_MULTIPLIER` | **2.5** | same |
| Credit formula | `ceil(reservedUsd × 2.5 / 0.005)`, min floor | `usdToCredits()` |
| Designed internal margin (actual = reserved) | **60%** | `(2.5−1)/2.5` |
| Pack €/credit (pack_500 → pack_8000) | **€0.00998 → €0.006249** | `studio-credit-packs.ts` |
| Admin FX default | **1.08** EUR→USD | `margin-simulation.ts` |
| Pricing floor FX | **0.92** EUR→USD | `studio-production-pricing-observed.ts` |
| Target gross margin | **65%** | `TARGET_GROSS_MARGIN` |
| SAFE threshold (admin classifier) | **≥ 60%** | `classifyMarginPercent` |

### Naming clarity (critical)

| Symbol in code | Meaning |
|----------------|---------|
| `getWorstPackEurPerCredit()` | **Min** €/credit = pack_8000 — *worst revenue for HomeCheff* |
| `WORST_CASE_EUR_PER_CREDIT` | **Max** €/credit = pack_500 — *worst price for customer* |

S.8C tables use **worst-for-us** (`pack_8000`, €0.006249/cr) unless labeled “best pack”.

---

## Margin formulas (canonical)

```
internalRevenueUsd = credits × 0.005
internalGrossMargin% = (internalRevenueUsd − actualProviderUsd) / internalRevenueUsd

customerRevenueEur = credits × eurPerCredit   // pack unit price
providerCostEur    = actualProviderUsd / FX
effectiveMargin%   = (customerRevenueEur − providerCostEur) / customerRevenueEur
```

Plan discount (usage only, not pack EUR):

```
chargedCredits = max(1, ceil(baseCredits × (1 − creditDiscountPercent/100)))
```

Cache / replay: providerUsd = 0 → margin = 100% on that request (no capture).

---

## Provider cost sources

| Provider | Primary COGS source | Unit | Confidence |
|----------|---------------------|------|------------|
| OpenAI images | `OPENAI_DALLE3_IMAGE_USD = $0.04` | /image | Published estimate |
| OpenAI vision | `$0.012` + `$0.003`/extra image | /call | Estimate |
| OpenAI OCR | `$0.012` mapping / `$0.008` route hardcode | /call | **Drift** |
| OpenAI translation | `$0.000002`/token heuristic | /token | Estimate |
| ElevenLabs TTS | `$0.10` or `$0.05` / 1K chars | /char | Published |
| ElevenLabs STT | `$0.22`/min | /sec | Estimate |
| ElevenLabs clone | `$1.00` | /call | Planning estimate |
| ElevenLabs music/SFX | `$0.08` / `$0.04` | /request | Registry estimate |
| Vidu | `$0.005`/provider credit; balance delta when available | /credit | Observed + live |
| Replicate segment | `$0.012` mapping vs `$0.02` inventory | /request | **Drift** |
| Google Vision | *No distinct USD constant* — billed as OpenAI OCR | — | **Gap** |
| FFmpeg / internal | `$0.001` merge; publish registry reserved | /op | Estimate |

---

## Provider profitability bands (effective margin @ pack_8000, FX=1.08)

Computed from `STUDIO_ACTION_COST_REGISTRY.actualCostEstimateUsd` via `computeActionPricingProfitability`.

| Provider | Representative actions | Effective margin | Band |
|----------|------------------------|-----------------:|------|
| OpenAI (formula) | scene, image, edit, vision | ~70% | SAFE |
| OpenAI (override thin) | `premium_vision_analysis` | **28.9%** | LOW_MARGIN |
| OpenAI fusion intents | 15–50 cr @ ~$0.04 | 60.5–88.2% | SAFE → edge |
| ElevenLabs formula | voice, music, sfx, STT | ~70% | SAFE |
| ElevenLabs clone | 400 cr @ $1.00 | **63.0%** | SAFE (thin vs peers) |
| Vidu motion | 450 cr @ $0.70 actual | **77.0%** | SAFE |
| Replicate | transformation_session | ~70% (if mapping cost used: higher) | SAFE* |
| FFmpeg publish | publish_* | ~70% (COGS often ≪ reserved) | SAFE / overpriced vs real COGS |

\* Replicate inventory `$0.02` vs mapping `$0.012` — margin visibility unreliable until unified.

---

## Sensitivity (provider COGS shock, pack_8000)

| Action | −20% | −10% | +5% | +10% | +20% | +50% |
|--------|-----:|-----:|----:|-----:|-----:|-----:|
| scene_generation | 76.3 | 73.3 | 68.9 | 67.4 | 64.4 | **55.6** LOW |
| motion_render | 81.6 | 79.3 | 75.8 | 74.6 | 72.3 | 65.4 SAFE |
| voice_clone | 70.4 | 66.7 | 61.1 | **59.3** LOW | 55.6 | 44.4 |
| premium_vision | 43.0 | 35.9 | 25.3 | 21.8 | 14.4 | **−6.7** NEG |
| music_generation | 76.3 | 73.3 | 68.9 | 67.4 | 64.4 | 55.6 |
| fusion_render (25) | 81.1 | 78.7 | 75.1 | 73.9 | 71.6 | 64.4 |

**Loss-making first:** `premium_vision_analysis` at ≈+40–50% COGS under worst pack.  
**Becomes LOW_MARGIN (&lt;60%):** most formula actions at **+50%** provider; `voice_clone` already at +10%.

---

## Cache / reuse margin effect

| Mechanism | Provider spend | Credit capture | Margin impact |
|-----------|----------------|----------------|---------------|
| Music/SFX `CACHE_HIT_NO_CHARGE` | $0 | skipCapture / refund | **+100%** on hit vs miss |
| Voice preview cache | $0 | free action | Saves full TTS COGS |
| GenerationJob replay | $0 | no rebill | Full COGS avoided |
| Idempotent recover | $0 | no recharge | Full COGS avoided |
| STT cache | TBD | TBD | Unrealized savings |

Cache does **not** change list prices; it improves *effective* portfolio margin and reduces abuse cost from retries.

---

## Auto Top-Up margin effect

- ATU sells the **same packs** at the same EUR (`pack_500` default).
- Usage discounts still apply after grant → slightly more generations per € than undiscounted free users.
- ATU increases **top-line pack revenue** and **provider spend** proportionally; designed pack margins hold (~70–81% at designed budget).
- Abuse: max 3 attempts/hour; consent required; free plan ineligible (S.8B certified).

---

## Do not invent

- There is **no** `CREDIT_EUR_VALUE` constant.
- Customer EUR is pack/subscription derived, not ledger `$0.005`.
- Parallel Motion EUR (`CustomerBillingEvent` / `video-pricing-config.ts`) is a second narrative — not StudioWallet SoT.
