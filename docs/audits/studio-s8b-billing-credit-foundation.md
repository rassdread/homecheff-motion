# S.8B — Billing & Credit Foundation

**Date:** 2026-08-09  
**Branch:** `feat/studio-s8b-billing-credit-foundation`  
**Audit baseline:** `9dc255fb` (S.8A freeze)  
**Implementation:** `e0a1a1ae`  
**Preview fix:** `8624b07d` (`ensureStudioAccount` email arity)

## Delivered (code)

| Item | Status |
|------|--------|
| Ownership boundaries | PASS |
| Auto Top-Up CONFIG_ONLY → opt-in + idempotent Checkout | PASS (code) |
| Pack webhook idempotency | PASS (code) |
| Generation idempotency (no random paid keys) | PASS |
| STT GenerationJob | PASS (code) |
| Translation GenerationJob | PASS (code) |
| Provider label drift (openai image paths) | PASS |
| CREDIT_USD → USD_PER_CREDIT | PASS |
| Fusion precedence explicit | PASS |
| productionReservationId forgery closed | PASS (code) |
| Carry honesty (UNLIMITED only in prod claim) | PASS |
| S.8C margin input registry | PASS |
| Prices / monthlyCredits unchanged | PASS |

## Preview certification (2026-08-09)

| Field | Value |
|-------|--------|
| Deployment ID | `dpl_8LJdHpA6L3KitqhoSxffsreBCidS` |
| Commit | `8624b07d` |
| URL | https://homecheff-motion-8ynsmexe5-sergio-s-projects-f7b64ee1.vercel.app |
| Status | **Ready** |
| Migration | `20260809180000_studio_s8b_auto_topup` applied via `prisma migrate deploy` |

### Preview evidence

| Check | Result |
|-------|--------|
| Exact PR HEAD Ready | PASS |
| Pages `/` `/studio` `/studio/start` `/studio/experience` `/account/billing` `/pricing` | PASS (200, correct dpl) |
| Product model: monthlyCredits=0, discounts 0/10/15/20/25 | PASS (catalog + `STUDIO_PLANS`) |
| Pack catalog unchanged | PASS |
| Auto Top-Up default OFF | PASS |
| Enable without consent → `CONSENT_REQUIRED` | PASS |
| Enable with consent | PASS |
| Creator trigger → Checkout intent (`cs_live_…`) | PASS (intent only) |
| Parallel POST → `already_pending` same attempt/key | PASS |
| **Stripe TEST successful payment + grant** | **BLOCKED** — Preview/Prod Stripe is **`sk_live`** |
| Webhook replay with paid grant | NOT RUN (blocked by LIVE-only Stripe policy) |
| STT/Translate Job E2E spend | NOT RUN (avoid provider spend; code wrap present) |
| Merge | **NOT DONE** (Preview not fully GREEN) |
| Production deploy of S.8B | **NOT DONE** |

## Remaining classified risks (non-blocking)

- Bulk/improve image bare routes (idempotency classified; not all migrated)
- Motion EUR CustomerBillingEvent parallel narrative (documented; wallet remains SoT)
- Suggestion actions UNWIRED
- Off-session card charge not inventified — Checkout used for SCA safety
- Preview/Production share Neon DB + LIVE Stripe (no isolated TEST billing env)

## Gates (local)

| Gate | Result |
|------|--------|
| lint | PASS (0 errors) |
| build | PASS |
| test | 4781/4781 |
| tsc --noEmit | PASS |

## Final decision

**NO-GO FOR S.8C**

Blocking: Stripe TEST Auto Top-Up payment/grant certification cannot complete while Preview Stripe is LIVE. Do not merge until a safe TEST billing environment exists or an explicitly approved controlled LIVE smoke is authorized.
