# S.8C — Commercial Readiness

**Date:** 2026-08-09 · **Read-only** · Recommendations only (no implementation)

---

## Financial scores (0–5)

| Dimension | Score | Rationale |
|-----------|------:|-----------|
| Billing architecture | **4** | Stripe packs/subs/ATU certified; dual TS/DB catalog residual |
| Credit architecture | **4** | Reserve/capture/refund solid; some bare routes |
| Provider pricing | **3** | Estimates + drifts (OCR, Replicate, Google) |
| Margin visibility | **3** | Admin profitability tools exist; FX dual; thin SKU opacity |
| Subscription profitability | **4** | monthlyCredits=0 is structurally sound |
| Credit pack profitability | **4** | Designed 70–81% margins |
| Provider profitability | **3** | Core SAFE; premium_vision / clone thin; Google blind |
| Security | **4** | S.8B financial security GREEN |
| Abuse resistance | **3** | Wallet hard-stop + ATU limits; promo/admin paths |
| Telemetry | **3** | Broad PCE; motion partial; dual events |
| Correlation | **3** | Job wraps improved S.8B; not universal |
| Future scalability | **3** | Planned providers unwired; Vidu absolute $ grows fast |
| **Overall commercial readiness** | **3.5 → 4*** | Ready to operate &amp; optimize; not ready to ignore thin SKUs |

\* Rounded presentation: **4 / 5** for GO posture with documented non-blocking risks; raw average ≈ 3.5.

---

## Commercial recommendations (do not implement in S.8C)

| # | Recommendation | Expected margin impact | Risk if ignored | Priority | Complexity |
|---|----------------|------------------------|-----------------|----------|------------|
| 1 | Revisit `premium_vision_analysis` credit override (raise toward ×2.5 of $0.025 ≈ 13 cr) | +25–40 pts on that SKU | Silent loss leader | **P0** | Low |
| 2 | Meter Google Vision as distinct provider + unit cost | Visibility; correct P&amp;L | Blind COGS | **P0** | Med |
| 3 | Unify Replicate $0.012 vs $0.02; pick one SoT | ±few pts accuracy | Wrong admin signals | P1 | Low |
| 4 | Unify FX for margin reports (0.92 vs 1.08) | Report consistency | Bad decisions | P1 | Low |
| 5 | Enforce STT cache / reuse (close TBD) | +margin on subtitle volume | Rebill / waste | P1 | Med |
| 6 | Expand Job wrap / idempotency to remaining bare image improve/bulk | Prevent double COGS+charge | Abuse/retry loss | P1 | Med |
| 7 | Monitor voice_clone at +10% EL prices | Early warning | Thin → LOW | P1 | Low (ops) |
| 8 | Cap or fair-use enterprise 25% on thin intents | Protect ~50% floor | Margin erosion | P2 | Med |
| 9 | Prefer ATU default pack_500 (already) in marketing | Keeps high unit €/cr | If switched to pack_8000 | P2 | Low |
| 10 | Keep monthlyCredits=0 (do not add allotments without model) | Preserves sub structure | New liability | P0 policy | n/a |
| 11 | Promo grant defaults stay 0 unless funded | Avoid negative burn | Campaign loss | P1 | Low |
| 12 | Bundle “cache-friendly audio” messaging | Behavioral +margin | Missed savings | P2 | Low |
| 13 | Before enabling Kling/Runway/Suno: registry+credits+PCE | Prevent leaks | Unmetered spend | P0 when building | High |
| 14 | Align publish_* reserved to real FFmpeg COGS (customer fairness) | May ↓ revenue slightly | Overcharge perception | P3 | Low |
| 15 | Dual narrative: hide or correlate Vidu EUR vs wallet in admin UI | Operator clarity | Wrong SoT | P2 | Med |

Every item is **advisory**. S.8C does not change prices or code.

---

## Definition of commercial readiness

| Criterion | Result |
|-----------|--------|
| Provider costs known | PASS (with gaps listed) |
| Customer prices known | PASS |
| Margins calculated | PASS |
| Packs/subs modeled | PASS |
| Leaks inventoried | PASS |
| Security residual known | PASS |
| Pricing changes shipped | **N/A — forbidden** |
| Ready for S.8D optimization work | **GO** (see final report) |

---

## Status

**PASS**
