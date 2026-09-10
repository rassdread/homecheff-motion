# Scenario A — Rode loper (Authenticated Production)

**Classification:** `RODE_LOPER` → **BLOCKED**  
**Date:** 2026-08-22  

## Budget

| Cap | Planned |
|-----|--------:|
| MAX_OPENAI_IMAGE | 2 |
| MAX_VIDU | 1 |
| MAX_FINAL_RENDER | 1 |

## Input audit (preset requirements)

From `action-preset-requirements.ts`:

- **Required:** `person_character` (single person photo)  
- **Optional:** red_carpet, paparazzi, luxury_outfit, luxury_background, music  
- No duplicate person slot; outfit not required for generative preset  

## Execution

1. Authenticated wizard opened with `prefillId` + sessionStorage prefill for `red_carpet_moment`  
2. **PASS:** Wizard shows Rode loper preset copy  
3. Person fixture uploaded via Production `/api/uploads/images` → 200  
4. `POST /api/instant-premium/create-and-generate` (2-image transition payload, test mode) → **403**

```json
{
  "code": "free_account_provider_action",
  "creditGate": true,
  "preview": {
    "requiredCredits": 450,
    "reason": "free_account_provider_action",
    "balanceAfter": 0
  }
}
```

## Gates

| Gate | Result |
|------|--------|
| Wizard understandable | **PASS** (preset visible) |
| Real Vidu | **NOT_RUN** |
| Image prep | **PARTIAL** (upload OK; generation blocked) |
| Continue in Studio | **NOT_RUN** |
| Finish / Projects | **NOT_RUN** (depends on A completion) |

## Provider calls

| Expected | Actual |
|----------|-------:|
| OpenAI image | 0 |
| Vidu | 0 |

## Notes

- Motion hub deep link sets URL param `prefill=` but instant wizard reads `prefillId=` — automation uses explicit `prefillId` injection.  
- `INSTANT_PREMIUM_MODE=test` does not bypass Production credit policy for non-admin Studio users.
