# Studio Profitability Dashboard Report

Built on existing systems only — no new provider, billing engine, credits, subscriptions, Stripe products, or schema migrations.

## Cost Sources

| Source | ProviderCostEvent actions | Notes |
|--------|---------------------------|-------|
| OpenAI | `openai_scene_image`, `openai_vision`, `openai_character_analysis`, `openai_translation`, `openai_ocr` | Studio instrumentation uses `skipBillingSync` |
| ElevenLabs | `elevenlabs_tts`, `elevenlabs_stt`, `elevenlabs_clone` | Voice previews tracked via `metadata.feature` |
| Vidu | `vidu_render` | Linked to CustomerBillingEvent when billed |
| Storage | `storage_upload`, `vercel_blob` provider | Blob upload metering |
| Cache | `voice_preview_cache_hit` | $0 cost events for cache hits |

**Aggregation:** `src/server/admin/studio-profitability.ts` — full COGS per project/user from all `ProviderCostEvent` rows.

## Revenue Sources

| Source | CustomerBillingEvent | Notes |
|--------|---------------------|-------|
| Motion renders | `vidu_render` / story / transition / full_rerender | Priced via Motion Billing (`quoteVideoPrice`) |
| Language exports | `language_export` | Flat pricing rule |
| Text rerenders | `text_rerender` | Flat pricing rule |
| Video exports | `video_export` / `full_export` | When logged |
| Studio features | — | **€0 revenue** (instrumentation only) |

**Stripe `InstantPremiumPendingOrder`:** not in billing ledger — excluded from profitability totals.

## Missing Links (addressed vs remaining)

| Gap | Status |
|-----|--------|
| Billing analytics margin used linked cost event only | **Fixed** — profitability uses full project COGS |
| No unified platform P&L | **Fixed** — `buildStudioProfitabilityReport()` |
| Studio costs not in admin UI | **Fixed** — `StudioProfitabilitySection` in render analytics |
| No feature-level P&L | **Fixed** — feature profitability table |
| No subscription simulation | **Fixed** — Creator €19 / Pro €49 / Studio €99 (read-only) |
| No unit economics dashboard | **Fixed** — cost per action/project/user |
| Stripe revenue not in ledger | **Remaining** — documented gap |
| Video cost analytics €2.99 reference | **Unchanged** — separate from actual `netPriceEur` P&L |

## Provider Breakdown

Admin dashboard shows per-provider costs for 7d / 30d / 90d / 365d with 30d share %:

- OpenAI
- ElevenLabs
- Vidu
- Storage
- Other

## Project Profitability

Per project: Revenue, OpenAI, ElevenLabs, Vidu, Storage, Other, Total Cost, Profit, Margin %.

Example (from unit tests):

| Project | Revenue | OpenAI | ElevenLabs | Vidu | Storage | Profit | Margin |
|---------|---------|--------|------------|------|---------|--------|--------|
| Demo | €4.99 | $0.42 | $0.18 | $1.21 | $0.03 | ~€3.15 | ~63% |

## User Profitability

Per user: lifetime revenue, cost, profit, margin; period rollups at **30d / 90d / 365d** (`last30Days`, `last90Days`, `last365Days` on each row); top profitable / top cost / negative-margin users; power users (top decile activity); warnings for negative margin, low margin, cost spike.

Platform period rollups in executive summary: 7d, 30d, 90d, 365d, all-time.

## Feature Profitability

| Feature | Revenue source | Cost source |
|---------|----------------|-------------|
| Voice previews | €0 | ElevenLabs TTS + cache hits |
| Voice clones | €0 | ElevenLabs clone |
| Scene images | €0 | OpenAI scene image |
| Asset references | €0 | OpenAI scene image (wizard) |
| Vision QA | €0 | OpenAI vision / character analysis |
| Translations | €0 | OpenAI translation |
| Motion renders | CustomerBillingEvent | Vidu render |
| Language exports | CustomerBillingEvent | — |
| Text rerenders | CustomerBillingEvent | — |

## Unit Economics

- Cost per action (avg per feature)
- Cost per project
- Cost per active user
- Revenue per project / per active user

## Negative Margin Analysis

Warnings:

- `negative_margin` — profit < 0
- `low_margin` — margin < 20% with revenue > 0
- `cost_spike` — 7d cost > 2× weekly average (90d)

Surfaced in admin **Negative margin & warnings** table (projects, users, features).

## Subscription Readiness

Simulation only — no product implementation.

| Plan | Monthly price | Analysis |
|------|---------------|----------|
| Creator | €19 | Users with 30d COGS < €19 = profitable at plan |
| Pro | €49 | Same |
| Studio | €99 | Same |

Shows: profitable user count, loss-making user count, avg margin, break-even %.

## Executive Summary

`profitability.executiveSummary` in render analytics report:

- Revenue, cost (USD/EUR), profit, margin %
- Project count, user count, event counts
- Periods: 7d, 30d, 90d, 365d, all-time

## User Studio Insights (Phase 7)

**API:** `GET /api/me/studio-insights`

Shows this month (no internal margins):

- Projects created
- Scene images, asset references, voice previews, voice clones
- Motion renders, language exports, text rerenders, translations
- Estimated provider actions
- `withinLimits` placeholder for future quota UX

## What Should NOT Be Rebuilt

Extend only:

- `ProviderCostEvent` / `recordCostEvent`
- `Studio Cost Instrumentation` (`studio-cost-metering.ts`)
- `Motion Billing` (`customer-billing-events.ts`, `video-pricing.ts`)
- `Render Analytics` (`render-analytics.ts`)
- `studio-cost-aggregation.ts`
- `billing-analytics.ts`, `video-cost-analytics.ts`, `margin-simulation.ts`
- Voice marketplace & asset generation cost tracking

**New layer (additive):**

- `src/types/studio-profitability.ts`
- `src/server/admin/studio-profitability.ts`
- `src/server/studio/user-studio-insights.ts`
- `src/components/admin/render-analytics/studio-profitability-section.tsx`
- `src/app/api/me/studio-insights/route.ts`

## Tests

`src/server/admin/studio-profitability.test.ts` covers:

- Project profitability (full COGS)
- User profitability / negative margin
- Feature keys & billing mapping
- Provider aggregation by period
- Subscription simulation
- Unit economics

## Admin Access

Render analytics dashboard → **Studio profitability** sections (integrated into `/admin/render-analytics`).
