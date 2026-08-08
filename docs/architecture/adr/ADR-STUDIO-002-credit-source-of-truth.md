# ADR-STUDIO-002 — Credit Source of Truth

**Status:** Accepted (S.1)  
**Date:** 2026-08-08

## Context

Fusion intent credits lived in `FUSION_RENDER_CREDITS` while `STUDIO_ACTION_COST_REGISTRY.fusion_render` held a single default (25). UI/server both needed USD_PER_CREDIT from the server registry, creating a client→server leak and drift risk.

## Decision

1. **Canonical shared constants:** `src/lib/studio-credit-constants.ts`  
   - `USD_PER_CREDIT`, `CREDIT_MARGIN_MULTIPLIER`, `usdToCredits`  
   - `FUSION_INTENT_RENDER_CREDITS` + `fusionIntentRenderCredits`  
   - `FUSION_RENDER_ACTION_DEFAULT_CREDITS` (25) aligned with registry default  
2. **Server registry** remains authoritative for action types and non-override charges.  
3. **Fusion deductions** continue to use **intent map via `overrideCredits`** (unchanged amounts).  
4. Client must never decide charged amounts; server validates.

## Financial behavior

**Unchanged.** Intent values and registry defaults preserved. Any future price change requires an explicit decision record.

## Consequences

- One place to edit fusion intent prices.
- Registry imports shared constants (no duplicated USD math).
- Display code can import SHARED_PURE without pulling billing services.
