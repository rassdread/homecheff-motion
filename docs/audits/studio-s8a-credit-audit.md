# S.8A — Credit Audit

**Date:** 2026-08-09 · **Read-only**

## Pipeline (canonical)

`evaluateCreditPolicy` → `reserveStudioCredits` → execute → `captureStudioCredits` | `refundStudioReservation`

## Policy outcomes (proven)

| Reason | Meaning |
|--------|---------|
| `admin_bypass` | Role admin → 0 required credits |
| `free_account_provider_action` | Free account, provider action, insufficient available |
| `insufficient_credits` | Any account, balance too low |
| `unknown_action` | Action not in registry and no resolved cost |
| confirmationRequired | Above `confirmAboveCredits` or auto-charge off |

## Consumed vs free

**Consumed:** all `STUDIO_ACTION_TYPES` when captured via billed routes/Jobs.  
**Free by registry:** `FREE_STUDIO_ACTIONS` in `free-action-registry.ts`.  
**Free by cache:** music/SFX `CACHE_HIT_NO_CHARGE`; voice preview cache hit.

## Dual / drift sources

1. Registry vs `StudioPricingRule` DB overrides  
2. Fusion intent map vs `fusion_render` default 25  
3. `USD_PER_CREDIT` vs `CREDIT_USD` (same 0.005, two files)  
4. StudioWallet vs AnimationUsageLedger estimated credits  
5. StudioWallet vs Vidu provider balance  
6. Client `hc_editor_user_credits` localStorage  
7. Display credit constants vs charged reserved USD  

## Security-relevant credit facts

- Double capture prevented on Job via `chargeFinalized`  
- Double charge possible without idempotency key (fallback unique)  
- Bare routes lack Job replay protection  

## Status

**PASS as Product Truth** — no implementation.
