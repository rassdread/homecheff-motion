# S.8B — Billing & Credit Foundation

**Date:** 2026-08-09  
**Branch:** `feat/studio-s8b-billing-credit-foundation`  
**Audit baseline:** `9dc255fb` (S.8A freeze)

## Delivered

| Item | Status |
|------|--------|
| Ownership boundaries | PASS |
| Auto Top-Up CONFIG_ONLY → opt-in + idempotent checkout | PASS |
| Pack webhook idempotency | PASS |
| Generation idempotency (no random paid keys) | PASS |
| STT GenerationJob | PASS |
| Translation GenerationJob | PASS |
| Provider label drift (openai image paths) | PASS |
| CREDIT_USD → USD_PER_CREDIT | PASS |
| Fusion precedence explicit | PASS |
| productionReservationId forgery closed | PASS |
| Carry honesty (UNLIMITED only in prod claim) | PASS |
| S.8C margin input registry | PASS |
| Prices / monthlyCredits unchanged | PASS |

## Remaining classified risks (non-blocking)

- Bulk/improve image bare routes (idempotency classified; not all migrated)
- Motion EUR CustomerBillingEvent parallel narrative (documented; wallet remains SoT)
- Suggestion actions UNWIRED
- Off-session card charge not inventified — Checkout used for SCA safety

## Gates (local)

| Gate | Result |
|------|--------|
| lint | PASS |
| build | PASS |
| test | 4781/4781 |
| tsc --noEmit | PASS |

## Preview / Production

Pending PR Preview deploy + controlled smoke. Do **not** declare GO for S.8C until Preview GREEN and production smoke PASS.

## Final decision (pre-Preview)

**NO-GO FOR S.8C** until Preview certification + production smoke complete.
