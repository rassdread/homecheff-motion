# Studio Cost Instrumentation Report

Report date: 2026-06-06  
Scope: instrumentation + aggregation only — no billing engine, subscriptions, Stripe, pricing, or UX changes.

**Codebase:** `main` + this sprint  
**Method:** Extend existing `ProviderCostEvent` ledger; `skipBillingSync` for studio rows.

---

## Current Metering Coverage

### Fully Metered (before → after)

| Provider / action | Before | After |
|-------------------|--------|-------|
| Vidu render (balance delta) | **VERIFIED** | Unchanged |
| OpenAI OCR (Instant Premium) | **VERIFIED** | Unchanged |
| Language / video export / text rerender / blob | **VERIFIED** | Unchanged |

### Partially Metered → Now Instrumented

| Feature | Provider | Action type | Status |
|---------|----------|-------------|--------|
| Scene image generate/regen/bulk | OpenAI | `openai_scene_image` | **NEW** |
| Vision QA (scene + storyboard) | OpenAI | `openai_vision` | **NEW** |
| Character reference analysis | OpenAI | `openai_character_analysis` | **NEW** |
| Language export translation | OpenAI | `openai_translation` | **NEW** |
| Voice preview / narration / multi | ElevenLabs | `elevenlabs_tts` | **NEW** |
| Subtitle transcribe | ElevenLabs | `elevenlabs_stt` | **NEW** |
| Voice clone | ElevenLabs | `elevenlabs_clone` | **NEW** |

### Not Metered (unchanged)

| Item | Reason |
|------|--------|
| Voice catalog metadata (`GET /v1/voices`) | No per-call cost |
| Director / prompt heuristics | $0 provider |
| Google Vision OCR | Separate path; not Studio |
| Mock providers | Dev/test only |

---

## OpenAI Coverage

| Call | Model (default) | Logged | Unit cost basis |
|------|-----------------|--------|-----------------|
| Scene image | `dall-e-3` | Yes | $0.04/image (**VERIFIED** OpenAI) |
| Vision QA | `gpt-4o-mini` | Yes | $0.012 + $0.003/extra image (**DERIVED**) |
| Character ref analysis | `gpt-4o-mini` | Yes | Same vision estimate |
| Translation | `gpt-4o-mini` | Yes | Token heuristic from response |

**Files:** `studio-scene-image-service.ts`, `studio-vision-service.ts`, `analyze-reference-images/route.ts`, `language-export-service.ts`

**Metadata:** `feature`, `storyboardId`, `sceneId`, `model`, `imageCount`, `estimatedCostUsd`

---

## ElevenLabs Coverage

| Call | Logged | Cost basis |
|------|--------|------------|
| TTS preview (character/draft) | Yes | $0.10/1K chars (multilingual v2) |
| Storyboard narration | Yes | Per call + `feature` |
| Multi-character narration | Yes | Per speaker line |
| STT transcribe | Yes | ~$0.22/min (**DERIVED**) |
| Voice clone | Yes | $1.00 estimate (**UNKNOWN** exact IVC $) |

**Preview dedup hash** stored in metadata (`previewDedupHash`) — measurement only, no cache.

---

## Vision Coverage

All vision flows write `openai_vision` or `openai_character_analysis` events with image-count-based estimates.

---

## Scene Image Coverage

All paths through `runSceneImageGeneration` meter `openai_scene_image` (including bulk + corrections). Mock provider skipped.

---

## Preview Duplication Report

**Source:** `buildPreviewDuplicationReport()` — aggregates `elevenlabs_tts` events where `feature` ∈ preview types and `previewDedupHash` present.

**Admin exposure:** `render-analytics` → `studioCosts.previewDuplication`

| Metric | Description |
|--------|-------------|
| `totalPreviewEvents` | Preview TTS events with hash |
| `uniqueHashes` | Distinct voice+text+lang+model |
| `duplicateEvents` | Extra clicks beyond first per hash |
| `estimatedWasteUsd` | Sum of redundant call costs |

---

## Project Cost Aggregation

**API:** `aggregateProjectCostSummary({ projectId })`  
**Admin video detail:** `loadProjectVideoCostSummary` adds `costByProviderUsd` breakdown.

**Gap:** Studio-only storyboard work without `projectId` on events aggregates via `storyboardId` metadata query — motion-linked projects include Vidu; Studio images may lack `projectId` until handoff.

---

## User Cost Aggregation

**API:** `aggregateUserCostSummary({ userId, since? })`  
**Admin:** `studioCosts.topUsersByStudioCost` (last 30 days)

---

## Feature Cost Aggregation

**API:** `aggregateFeatureCostSummary({ since?, limit? })`  
**Admin:** `studioCosts.featureBreakdown`

---

## Remaining Unknown Costs

| Cost | Why still estimated |
|------|---------------------|
| ElevenLabs IVC clone | No flat API price published |
| OpenAI vision tokens | No `usage` logged from chat completions |
| OpenAI translation | Token count heuristic when `usage` missing |
| Studio events without `projectId` | Storyboard-only work not tied to motion project row |
| Google Vision OCR | Not in Studio scope |
| Infrastructure (Vercel/Railway) | No invoice API |
| Exact ElevenLabs balance | No balance endpoint in app |

---

## Profitability Readiness

| Question | Answer |
|----------|--------|
| Cost per action? | **Yes** — per `ProviderCostEvent` row |
| Cost per project? | **Partial** — full when `projectId` set; storyboard via metadata |
| Cost per user? | **Yes** — `userId` on all studio events |
| Cost per feature? | **Yes** — `metadata.feature` |
| Cost per month? | **Yes** — admin `studioCosts.last30Days` |

**Gaps for Profitability Audit:** clone exact $, vision token precision, storyboard↔project join.

---

## Before vs After

| Metric | Before | After |
|--------|--------|-------|
| Studio OpenAI in `ProviderCostEvent` | 0% | ~100% of call sites wired |
| Studio ElevenLabs in ledger | 0% | ~100% of call sites wired |
| Preview duplicate visibility | None | Hash + waste estimate |
| Admin render analytics | Vidu + OCR only | + `studioCosts` block |
| Customer billing impact | N/A | **None** (`INSTRUMENTATION_ONLY_ACTIONS`) |

---

## What Should NOT Be Rebuilt

- Vidu billing / `video-pricing-config.ts`
- `CustomerBillingEvent` engine
- Stripe checkout
- Credit wallets / subscriptions
- Voice marketplace architecture
- Provider API clients (metering wraps existing calls)

---

## Key Files

| File | Role |
|------|------|
| `src/server/provider-cost/studio-cost-metering.ts` | Record helpers |
| `src/server/provider-cost/studio-cost-aggregation.ts` | Project/user/feature rollup |
| `src/lib/studio-cost-estimates.ts` | Published pricing constants |
| `src/server/admin/studio-cost-analytics.ts` | Admin dashboard block |
| `src/server/provider-cost/cost-event-types.ts` | New action types |

---

*End of report.*
