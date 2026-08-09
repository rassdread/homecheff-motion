# S.8C — Final Report — Provider Cost, Pricing & Margin Audit

**Phase:** S.8C — Billing, Credits & Financial Audit  
**Mode:** STRICTLY READ-ONLY  
**Date:** 2026-08-09  

---

## FINAL REPORT

| Field | Value |
|-------|-------|
| **Repository** | `homecheff video ai` |
| **Branch** | `main` |
| **HEAD** | `0e8fe056fd1374ec77563efa8b92dc8e39a9ac4f` |
| **Actions audited** | **31** billable (`STUDIO_ACTION_COST_REGISTRY`) + **9** free (`FREE_STUDIO_ACTIONS`) + fusion intent map (15–50) |
| **Providers audited** | OpenAI, ElevenLabs, Vidu, Replicate, Google Vision, FFmpeg/Internal, Mock, planned (Kling/Runway/Suno/Udio/Azure/…) |
| **Subscriptions audited** | free, creator (€7.99), pro (€24.99), studio (€79.99), enterprise (custom) — all `monthlyCredits: 0` |
| **Credit packs audited** | pack_500/1250/3000/8000 (€4.99–€49.99) |
| **Provider cost model** | Estimates + observed Vidu/OpenAI staging; `ProviderCostEvent` + `studio-cost-metering`; drifts documented |
| **Customer pricing model** | Credits via `reservedUsd × 2.5 / $0.005`; packs EUR; plan usage discounts 0–25%; ATU = pack Checkout |
| **Margin model** | Designed internal 60%; pack designed 70–81%; effective ~70% @ pack_8000 for formula actions; see architecture docs |
| **Heavy-use simulations** | 100/1000 scenes, 500 motion, 200 voice, 500 STT, 100 music, fusion/clone, mixed month — all healthy at list COGS |
| **Subscription profitability** | Structurally strong (no monthly credit mint); discount leakage ≪ fee at realistic volumes |
| **Credit pack profitability** | All packs PASS TARGET 65% under designed burn; pack_8000 thinnest; pack_500 best / ATU default |
| **Provider comparison** | Vidu & fusion defaults strongest; formula OpenAI/EL solid; clone thin; premium_vision weak; Google blind |
| **Hidden financial leaks** | Google OCR mislabel; Replicate/OCR/FX drifts; dual PCE; motion partial telemetry; bare improve/bulk; STT cache TBD; promo/admin/prod bypasses (intentional) |
| **Security findings** | S.8B controls hold (forged prod IDs, ATU consent, webhook idempotency, localStorage non-auth). Residuals: bare routes, DB pricing power, race scrutiny |
| **Commercial recommendations** | P0: premium_vision credits; Google metering; keep monthlyCredits=0; gate planned providers. See commercial-readiness doc |
| **Financial readiness score** | **4 / 5** (raw dimensional avg ≈ 3.5) |
| **Definition of Done** | All 14 steps covered; 11 docs generated; no code/pricing/commits — **PASS** |
| **Final GO / NO-GO for S.8D** | **GO FOR STUDIO S.8D** |
| **Blocking issues** | **None** for starting S.8D (optimization / metering / visibility). Do **not** treat as approval to change prices without explicit product decision |
| **Non-blocking risks** | premium_vision LOW_MARGIN; Google Vision blind COGS; provider +50% → formula LOW_MARGIN; enterprise × thin fusion; dual catalogs/FX; STT cache TBD |
| **Recommended next step** | S.8D: implement **visibility &amp; metering fixes** first (Google PCE, FX unify, Replicate SoT); separately decide (product) whether to reprice premium_vision — **out of band from silent code changes** |

---

## Document index

| Doc | Role |
|-----|------|
| `docs/architecture/studio-provider-margin-model.md` | Margin formulas &amp; provider bands |
| `docs/architecture/studio-commercial-model.md` | Packs, plans, money loops |
| `docs/architecture/studio-financial-profit-model.md` | P&amp;L scenarios &amp; sims |
| `docs/audits/studio-s8c-provider-cost-audit.md` | Provider COGS inventory |
| `docs/audits/studio-s8c-margin-audit.md` | Per-action margins |
| `docs/audits/studio-s8c-subscription-profitability.md` | Plan P&amp;L |
| `docs/audits/studio-s8c-credit-pack-profitability.md` | Pack P&amp;L |
| `docs/audits/studio-s8c-provider-comparison.md` | Cross-provider |
| `docs/audits/studio-s8c-financial-risk-analysis.md` | Sensitivity, leaks, security |
| `docs/audits/studio-s8c-commercial-readiness.md` | Scores &amp; recommendations |
| `docs/audits/studio-s8c-final-report.md` | This document |
| `docs/audits/studio-s8c-margin-input-registry.md` | S.8B input pointer (pre-existing) |
| `src/lib/studio-s8c-margin-input-registry.ts` | Machine-readable Job/cache coverage |

---

## Canonical numbers (traceable)

| Constant | Value | Source |
|----------|------:|--------|
| USD_PER_CREDIT | 0.005 | `studio-credit-constants.ts` |
| CREDIT_MARGIN_MULTIPLIER | 2.5 | same |
| Pack €/cr | 0.00998 → 0.006249 | `studio-credit-packs.ts` |
| Creator / Pro / Studio monthly | 7.99 / 24.99 / 79.99 | `studio-subscription-prices.ts` |
| Plan discounts | 0 / 10 / 15 / 20 / 25% | `studio-plan-config.ts` |
| voice_clone credits | 400 | registry override |
| motion_render credits | 450 (min 180) | registry |
| premium_vision credits | 5 | registry override |
| TARGET_GROSS_MARGIN | 0.65 | `studio-production-pricing-observed.ts` |

---

## Absolute product law (reaffirmed)

Billing owns money. Credits own consumption. GenerationJobs own execution tracking. Provider adapters own SDK calls. Telemetry owns cost logging. Financial Audit owns verification.

**Nothing in S.8C invented pricing. Nothing estimated without a source. No implementation. No commits.**

---

## GO statement

# GO FOR STUDIO S.8D

Commercial model is understood, margins are largely healthy, packs/subs are profitable under designed economics, and S.8B security/foundation is in place. S.8D may proceed on **metering, correlation, and optional product-approved pricing decisions** — not silent price edits.
