# S.8B — Billing & Credit Foundation

**Date:** 2026-08-09  
**Branch:** `feat/studio-s8b-billing-credit-foundation`  
**Audit baseline:** `9dc255fb` (S.8A freeze)  
**Implementation:** `e0a1a1ae`  
**Preview fix:** `8624b07d` (`ensureStudioAccount` email arity)  
**TEST isolation:** `d4c28b92`, `c5adca81`

## Delivered (code)

| Item | Status |
|------|--------|
| Ownership boundaries | PASS |
| Auto Top-Up CONFIG_ONLY → opt-in + idempotent Checkout | PASS |
| Pack webhook idempotency | PASS |
| Generation idempotency (no random paid keys) | PASS |
| STT GenerationJob | PASS |
| Translation GenerationJob | PASS |
| Provider label drift (openai image paths) | PASS |
| CREDIT_USD → USD_PER_CREDIT | PASS |
| Fusion precedence explicit | PASS |
| productionReservationId forgery closed | PASS (code) |
| Carry honesty (UNLIMITED only in prod claim) | PASS |
| S.8C margin input registry | PASS |
| Prices / monthlyCredits unchanged | PASS |
| Stripe TEST/LIVE fail-closed | PASS |

## Preview certification (2026-08-09) — GREEN

| Field | Value |
|-------|--------|
| Deployment ID | `dpl_AopEUX8ec2oySqrptgUUsDMQXvNQ` |
| Commit | `c5adca81` |
| URL | https://homecheff-motion-na4h9nil3-sergio-s-projects-f7b64ee1.vercel.app |
| Status | **Ready** |
| Migration | `20260809180000_studio_s8b_auto_topup` applied |
| Preview Stripe | **TEST** (`cs_test_…`) |
| Production Stripe | **LIVE** (unchanged) |

### Preview evidence

| Check | Result |
|-------|--------|
| Exact PR HEAD Ready | PASS |
| Product model: monthlyCredits=0, discounts 0/10/15/20/25 | PASS |
| Pack catalog unchanged | PASS |
| Auto Top-Up default OFF | PASS |
| Enable without consent → `CONSENT_REQUIRED` | PASS |
| Enable with consent | PASS |
| Creator trigger → Checkout (`cs_test_…`) | PASS |
| Parallel POST → `already_pending` | PASS |
| Stripe TEST payment + webhook + grant | **PASS** (+500 PURCHASED, one ledger) |
| Webhook replay NO-OP | **PASS** |
| Payment decline (no grant) | **PASS** |
| Discount parity ATU ↔ manual pack | **PASS** |
| STT GenerationJob E2E (mock paid + replay) | **PASS** (`CACHE_HIT_NO_CHARGE`) |
| Live ElevenLabs STT | PARTIAL — Preview key missing `speech_to_text` permission; failed job charged **0** |
| Translate GenerationJob E2E + replay | **PASS** (`user_reviewed` overrides; no OpenAI) |
| Financial correlation IDs | PASS (ATU attempt + stripe_pack session + jobs) |
| Security matrix | PASS (code + webhook replay + parallel ATU); reservation forgery closed in gate |
| Lint / build / tests / tsc | PASS (tests 4784/4784) |

## Remaining classified risks (non-blocking)

- Bulk/improve image bare routes
- Motion EUR CustomerBillingEvent parallel narrative
- Suggestion actions UNWIRED
- Shared Neon DB Preview/Production
- Temporary Stripe TEST sandbox expiry / claim
- SCA/3DS not fully proven in headless Checkout
- ElevenLabs Preview key lacks STT permission

## Gates (local)

| Gate | Result |
|------|--------|
| lint | PASS |
| build | PASS |
| test | 4784/4784 |
| tsc --noEmit | PASS |

## Final decision

**GO FOR STUDIO S.8C — PROVIDER COST & MARGIN AUDIT**  
(contingent on merge of PR #16 + Production LIVE non-spend smoke)
