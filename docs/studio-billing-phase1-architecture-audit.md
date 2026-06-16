# Studio Billing Phase 1 — Architecture Audit

Date: 2026-06-16  
Scope: inventory before Phase 1–8 unified billing work. **Extend existing systems — do not replace.**

## CURRENT (active foundation)

| System | Role | Location |
|---|---|---|
| **StudioWallet** | Per-user credit balance + reserved + lifetime counters | `prisma/schema.prisma`, `studio-wallet-service.ts` |
| **StudioLedgerEntry** | Immutable audit trail for every mutation | `studio-ledger-service.ts` |
| **StudioAccount** | Plan, billing status, Stripe IDs, confirmation prefs | `ensure-studio-account.ts` |
| **studio-action-cost-registry** | Action → credit cost catalog | `studio-action-cost-registry.ts` |
| **withStudioCreditGate** | Reserve → execute → capture/refund | `with-studio-credit-gate.ts` |
| **Stripe checkout** | Subscriptions + credit packs | `stripe-billing.ts` |
| **Stripe webhook** | Purchase grants, subscription sync | `/api/stripe/webhook` |
| **ProviderCostEvent** | Internal COGS ledger | `provider-cost-event.ts` |
| **CustomerBillingEvent** | User-facing EUR usage (motion legacy) | `customer-billing-events.ts` |
| **Admin finance** | Wallet aggregates, margin | `/admin/studio-finance` |
| **Mijn Verbruik** | EUR usage dashboard | `/mijn-verbruik` |

### Wallet-gated routes (CURRENT)

- `POST /api/studio/storyboards/[id]/scenes/[sceneId]/images` → `scene_generation`
- `POST /api/studio/storyboards/[id]/analyze-vision` → `vision_analysis`
- `POST /api/studio/storyboards/[id]/voice` → `voice_generation`
- `POST /api/studio/asset-references/generate` → character/location/prop
- `POST /api/editor/instruction/variant` → `image_generation`
- `POST /api/publish/export` → publish formats
- `POST /api/instant-premium/create-and-generate` → `motion_render` (test/admin)

## LEGACY (parallel / to converge)

| System | Role | Risk |
|---|---|---|
| **AnimationUsageLedger** | Per-render estimated credits | Duplicates wallet semantics |
| **assertUsageAllowed** | Role-based video/monthly quotas | Bypasses StudioWallet |
| **usage-limits.ts** | Free/power/admin caps | Not plan-aware |
| **CustomerBillingEvent** | EUR pricing for motion | Parallel to credits |
| **subscription_grant** on `invoice.paid` | Monthly credit drops | **Removed in Phase 4** — subs grant benefits, not credits |
| **instant-premium Stripe** | Pay-per-video parallel path | Kept for one-off; converges to wallet |

## TO_BE_MIGRATED

| Route / flow | From | To |
|---|---|---|
| `POST /api/animations/projects` | `assertUsageAllowed` + `AnimationUsageLedger` | `withStudioCreditGate` → `motion_render` |
| Assistant cost hints | `assistant-cost-estimate.ts` heuristics | `resolveActionCreditCost` + wallet |
| Plan display | Monthly credits in copy | Benefits: discount, storage, features |
| Pricing changes | TS registry only | `StudioPricingRule` DB + registry fallback |
| Admin grants | `adminAdjustCredits` (no UI) | `/admin/billing` control center |

## Legacy quota enforcement map

```
assertUsageAllowed          → src/app/api/animations/projects/route.ts
AnimationUsageLedger.create → same route (after project create)
getAnimationUsageStatus     → src/app/api/animations/usage/route.ts
getUsageCountsForUsers      → src/app/api/admin/users/route.ts
```

## Phase 1–8 additions (this sprint)

- `StudioBillingPolicy` — carry mode, new-user grant, plan benefits JSON
- `StudioPromotion` + redemptions
- `StudioPricingRule` — admin-editable costs
- Wallet `purchasedBalance` / `promotionalBalance` + ledger `creditOrigin`
- Unified `/account/billing` dashboard
- `/admin/billing` control center
- Stripe Customer Portal
- Assistant billing awareness via unified cost engine
