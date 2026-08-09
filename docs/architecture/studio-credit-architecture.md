# Studio Credit Architecture — Product Truth (S.8A)

**Status:** FORENSIC PRODUCT TRUTH (read-only)  
**Date:** 2026-08-09  
**ADR:** ADR-STUDIO-002 (credit source of truth), ADR-STUDIO-008 (idempotency)

---

## Canonical model

```
StudioAccount  →  StudioWallet (balance, purchased, promotional, reserved)
               →  StudioLedgerEntry (immutable mutations)
```

**Available credits** = `balance - reservedBalance`.

---

## Credit calculation

1. Resolve action type → `getActionCost` / `resolveActionCreditCost` (DB rule may override)
2. Optional `overrideCredits` (fusion intents via `studio-credit-constants.ts`)
3. Optional plan pack discount applied at purchase (not at every spend for action registry defaults)
4. Display constants (`SCENE_GENERATION_DISPLAY_CREDITS`, etc.) must track reserved USD — drift risk if only one side changes

**Constants (SHARED_PURE):** `src/lib/studio-credit-constants.ts`  
**Registry (SERVER):** `src/server/studio-account/studio-action-cost-registry.ts`

### Registry action types (customer-billable keys)

`ai_analysis` · `storyboard_generation` · `prompt_improvement` · `voice_suggestion` · `music_suggestion` · `character_generation` · `location_generation` · `prop_generation` · `world_generation` · `scene_generation` · `voice_generation` · `voice_clone` (400) · `subtitle_transcription` · `music_generation` · `sfx_generation` · `assistant_interpret` · `ocr_scan` · `vision_analysis` · `premium_vision_analysis` · `motion_render` · `publish_photo_story` · `publish_slideshow` · `publish_voice_message` · `publish_poster_export` · `publish_mp4_export` · `translation_export` · `image_generation` · `image_edit` · `fusion_render` · `transformation_session` · `studio_orchestrator_production`

---

## Deduction lifecycle

| Step | Function | Ledger |
|------|----------|--------|
| Evaluate | `evaluateCreditPolicy` | — |
| Authorize | `authorizeStudioAction` | calls reserve |
| Reserve | `reserveStudioCredits` | `usage_reservation` (Δ balance 0; bumps reserved) |
| Capture | `captureStudioCredits` | `usage_capture` (Δ −n) |
| Refund reservation | `refundStudioReservation` | `usage_refund` or `failed_generation_refund` |

There is **no** separate `release` / `rollback` API — release ≡ refund of reservation.

---

## Where credits ARE consumed

Any route going through `billProviderAction` / `runBilledProviderRoute` / `withStudioCreditGate` / GenerationJob `executeBilled` with successful capture.

See static inventory: `src/lib/credit-enforcement-audit.ts`.

---

## Where credits are NOT consumed (by design)

| Path | Evidence |
|------|----------|
| Free action registry | `free-action-registry.ts` (CRUD, upload, browse, assistant navigate, local consistency, voice preview cache hit) |
| Cache hit skipCapture | Music/SFX library cache; voice preview cache |
| GenerationJob replay | Succeeded job + output → return prior result, no rebill |
| Technical recover | Same paid attempt / storage reattach — no recharge |
| Subtitle edit PATCH | Local metadata — no STT charge |
| Planning-only UI | Creative Director orchestration without provider call |

---

## Where credits SHOULD NOT be consumed (product law)

- Library reuse / approved asset replay  
- Continuity planning metadata  
- Prompt Matrix assembly without execution  
- Adaptive presentation rendering  
- Idempotent resume of in-flight or completed jobs  

---

## Where credits may be accidentally bypassed / double-spent

| Risk | Reality |
|------|---------|
| Admin role | Intentional `admin_bypass` (0 credits) |
| Production-chain IDs | `productionTransactionId` / `productionReservationId` → 0 wallet capture |
| Missing Idempotency-Key | Fallback key uses timestamp/random → **double-click can double-charge** |
| Bare STT / translation routes | No Job replay table → medium duplicate-charge risk |
| Client editor localStorage credits | `editor-generation-gate.ts` — **not** StudioWallet |
| Bulk image / improve routes | Same `scene_generation` action as Job path but bare — no Job replay |
| Motion charge at project create | Job start often `chargeOnThisJob: false` — correlation gap |

---

## Ledger action types

`credit_purchase` · `subscription_grant` (legacy type; monthly grant removed) · `admin_grant` · `promotional_grant` · `usage_charge` (typed; live path prefers reserve/capture) · `usage_reservation` · `usage_capture` · `usage_refund` · `failed_generation_refund` · `bonus_grant` · `expiration_adjustment` · `manual_adjustment`

---

## Telemetry / sync

- Wallet analytics: `studio-billing-analytics-service.ts`
- Cost events may sync to `CustomerBillingEvent` via `sync-billing-from-cost.ts` (not for all instrumentation)
- Job fields `creditsCharged` / `chargeFinalized` are **observability**, not a second ledger
