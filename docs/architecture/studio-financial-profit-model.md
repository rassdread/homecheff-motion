# Studio Financial Profit Model (S.8C)

**Status:** CANONICAL P&amp;L MODEL (calculated from code; read-only)  
**Date:** 2026-08-09  
**Assumptions fixed for this model:** FX = **1.08** EUR→USD (admin default); customer €/credit unless noted = **pack_8000 €0.006249** (worst-for-us) or **pack_500 €0.00998** (best-for-us).

---

## Designed economics

| Layer | Rule | Result |
|-------|------|--------|
| Credit mint vs reserved | ×2.5 | 60% internal gross if actual = reserved |
| Pack sale vs designed provider budget | `credits × 0.005 / 2.5` USD | Pack designed margins **70–81%** |
| Target | `TARGET_GROSS_MARGIN` | **65%** |

### Pack designed P&amp;L (all credits burned at formula)

| Pack | Revenue € | Designed provider budget $ | Cost € @1.08 | Designed margin |
|------|----------:|---------------------------:|-------------:|----------------:|
| pack_500 | 4.99 | 1.00 | 0.93 | **81.4%** |
| pack_1250 | 9.99 | 2.50 | 2.31 | **76.8%** |
| pack_3000 | 19.99 | 6.00 | 5.56 | **72.2%** |
| pack_8000 | 49.99 | 16.00 | 14.81 | **70.4%** |

Loss threshold: if average actual COGS per credit-burned exceeds ≈ `€/credit × FX` × (1 − target). For pack_8000 at 65% target, max provider ≈ €0.006249 × 0.35 × 1.08 ≈ **$0.00236**/credit consumed — close to designed `$0.002`/credit (`0.005/2.5`).

---

## Contribution by action class

| Class | Credits (typ.) | Actual $ (registry) | Margin @ pack_8000 | Notes |
|-------|---------------:|--------------------:|-------------------:|-------|
| Formula OpenAI/EL/FFmpeg | formula | = reserved | ~70% | Core SAFE band |
| Fusion default | 25 | 0.04 | 76.3% | Intent 15cr → 60.5% |
| Voice clone | 400 | 1.00 | 63.0% | Thin SAFE |
| Motion | 450 | 0.70 | 77.0% | Actual &lt; reserved |
| Premium vision | 5 | 0.024 | **28.9%** | Override breaks ×2.5 |
| Orchestrator production | 50 | 0.08 | 76.3% | May skip wallet on prod txn |

---

## Subscription contribution

Subscriptions add **€ fee with $0 monthly credit liability**.

| Scenario | Income | Provider spend | Margin character |
|----------|--------|----------------|------------------|
| Best case | Sub fee + little pack use | Near $0 | Near **100%** on sub fee |
| Normal | Sub + occasional packs | Pack-driven | Sub fee + ~70% pack margin − discount leakage |
| Heavy | Sub + large packs / ATU | High | Pack margins dominate; discount reduces margin ~3–9 pts on usage |
| Worst | Enterprise 25% + pack_8000 + thin actions | High | Still usually &gt;50% except premium_vision / clone shocks |

### Discount leakage vs sub fee (scene_generation)

Leak = credits not charged × pack_8000 €/cr:

| Plan | Fee | Leak/scene | Scenes until leak = fee |
|------|----:|-----------:|------------------------:|
| creator | €7.99 | €0.0187 | ~426 |
| pro | €24.99 | €0.0250 | ~1000 |
| studio | €79.99 | €0.0375 | ~2134 |

Interpretation: subscription fees more than cover usage-discount leakage for realistic volumes; break-even for “discount paid by sub” is hundreds–thousands of scenes.

---

## Heavy-use portfolio simulations

Registry actuals; no cache; free plan (0% discount); FX 1.08.

| Workload | Credits | Provider $ | Customer € (pack_8000) | Margin | Customer € (pack_500) | Margin |
|----------|--------:|-----------:|-----------------------:|-------:|----------------------:|-------:|
| 100 scene_generation | 3,000 | 6 | 18.75 | 70.4% | 29.94 | 81.4% |
| 1,000 scene_generation | 30,000 | 60 | 187.46 | 70.4% | 299.40 | 81.4% |
| 500 motion_render | 225,000 | 350 | 1,405.97 | 77.0% | 2,245.50 | 85.6% |
| 200 voice_generation | 3,000 | 6 | 18.75 | 70.4% | 29.94 | 81.4% |
| 500 subtitle_transcription | 5,000 | 10 | 31.24 | 70.4% | 49.90 | 81.4% |
| 100 music_generation | 4,000 | 8 | 25.00 | 70.4% | 39.92 | 81.4% |
| 100 fusion_render (25) | 2,500 | 4 | 15.62 | 76.3% | 24.95 | 85.2% |
| 50 voice_clone | 20,000 | 50 | 124.97 | 63.0% | 199.60 | 76.8% |

### Mixed workload example

Assume per month: 200 scenes + 20 motion + 50 voice + 20 music + 10 fusion(25) + 2 clones.

| Line | Credits | Provider $ |
|------|--------:|-----------:|
| scenes | 6,000 | 12.0 |
| motion | 9,000 | 14.0 |
| voice | 750 | 1.5 |
| music | 800 | 1.6 |
| fusion | 250 | 0.4 |
| clones | 800 | 2.0 |
| **Total** | **17,600** | **31.5** |

Customer € @ pack_8000 ≈ **€110**; cost € ≈ **€29.2**; margin ≈ **73%**.  
Plus optional Pro sub €24.99 → total revenue higher; usage credits drop ~15% → slightly more generations for same pack spend.

With **50% music cache hit rate**: music provider $ halves (−$0.8) → portfolio margin rises ~0.5–1 pt.

---

## Promotional credits

Promotional balance spends **first**. Margin on promo grants:

- Revenue from grant = **€0**
- Provider spend = full actual  
→ **Negative contribution** until offset by later purchased packs / subscription.

Risk scales with `newUserGrantCredits` / campaigns (defaults **0** in policy — verify DB).

---

## Auto Top-Up P&amp;L

Each ATU success ≡ pack_500 (default) sale: **+€4.99**, **+500 credits**, designed provider budget **$1**.

Increases top-line and COGS together; does not inherently destroy margin. Abuse limited by consent + 3/hour + plan gate (S.8B certified).

---

## Loss modes (ranked)

1. **`premium_vision_analysis`** underpack priced (5 cr / $0.024) — already LOW_MARGIN; negative at +50% COGS.  
2. **Promotional / admin / production bypass** — COGS without customer EUR.  
3. **Provider price shock +50%** on formula actions → below 60% target on pack_8000.  
4. **Enterprise 25% + thin fusion intents (15→12 cr)** → ~50.7% (LOW_MARGIN).  
5. **Unmetered / mislabeled Google Vision** — P&amp;L blind spot.  
6. **Dual PCE / dual EUR narratives** — analytics over/under-count.

---

## Model limits

- Registry `actualCostEstimateUsd` ≠ live invoice.  
- TTS/STT true COGS scale with characters/minutes; flat reserved may under/over.  
- Vidu actual can exceed $0.70 on long/pro presets.  
- FX dual (0.92 vs 1.08) moves reported margins.  
- DB pricing overrides can invalidate this model overnight.
