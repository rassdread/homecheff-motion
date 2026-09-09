# Studio — All Ages Capability Model (Phase 3)

**Status:** Technical certification (engineering documentation)  
**Product:** HomeCheff Studio (`studio.homecheff.eu`)  
**Checkout:** `/Users/sergioarrias/HomeCheffProjects/homecheff video ai` (`homecheff-motion.git`)  
**Principle:** ALL AGES BY DEFAULT · FUNCTION-SPECIFIC RESTRICTIONS ONLY · NO GLOBAL DOB

This document is **not** Terms of Service, Privacy Policy, or AI provider Terms. It does not conclude that minors may legally use any paid/provider feature. Provider age rules remain **PROVIDER_TERMS_REVIEW_REQUIRED**.

---

## Invariants (code)

| Invariant | Value |
|---|---|
| `STUDIO_GLOBAL_AGE_GATE` | `NONE` |
| `STUDIO_DOB_REQUIRED` | `NO` |
| `STUDIO_ACCOUNT_AGE_GATE` | `NONE` |
| `STUDIO_STRIPE_REQUIRED_FOR_FREE` | `NO` |
| `STUDIO_STRIPE_REQUIRED_FOR_PAID` | `YES` |

Constants: `src/lib/capabilities/all-ages-invariants.ts`  
Regression: `src/lib/capabilities/all-ages-phase3.test.ts`

---

## Capability layers

| Layer | Meaning in Studio | Typical gate today |
|---|---|---|
| `GENERAL_USE` | Account / shell | Auth + `User.isActive` |
| `FREE_USE` | Free plan, free-action registry, CRUD/upload/browse | **Not Stripe** |
| `PAID_USE` | Creator / Pro / Studio / packs | Subscription / credits |
| `STRIPE_CUSTOMER` | Checkout / Billing payer | Lazy at paid checkout |
| `STRIPE_CONNECT` | Cash payout (ecosystem rails) | Outside free Studio use |
| `AFFILIATE_PROMOTION` | Referral cookie / bind | Central identity — **no age gate in Studio** |
| `AFFILIATE_PAYOUT` | Cash commission | Ecosystem / Connect — separate |
| `AI_PROVIDER_ENTITLEMENT` | Paid provider spend | Credits / plan — **≠ global account age** |

### Explicit separations

```
PAYMENT_ELIGIBILITY ≠ ACCOUNT_ELIGIBILITY
PAYOUT_ELIGIBILITY ≠ GENERAL_PRODUCT_ELIGIBILITY
PROVIDER_ENTITLEMENT ≠ GLOBAL_ACCOUNT_AGE
```

HomeCheff does not currently impose an additional product-level age gate in:

- signup (`src/app/api/auth/signup/route.ts`);
- free plan creation (`ensureStudioAccount`);
- free actions (`src/server/studio-account/free-action-registry.ts`);
- creative project create (`src/app/api/studio/creative-projects/route.ts`);
- affiliate referral bind (`src/app/api/me/affiliate/bind-referral/route.ts`).

Provider spend may still require credits or a paid plan. That is **entitlement**, not an account age gate.

---

## AI providers

OpenAI, ElevenLabs, Vidu, Kling, Runway, and other registered providers: Studio code does not invent HomeCheff minimum-age gates for them.  
Official provider Terms must be reviewed separately: **PROVIDER_TERMS_REVIEW_REQUIRED**.

Do not remove existing provider safety / moderation mechanisms.

---

## Legal hold (out of Phase 3 scope)

| Topic | Status |
|---|---|
| Studio Terms minimum-age policy | `LEGAL_REVIEW_REQUIRED` |
| Minor upload / likeness / AI content involving children | `LEGAL_REVIEW_REQUIRED` |
| AI provider minimum-age requirements | `PROVIDER_TERMS_REVIEW_REQUIRED` |
| Ecosystem Privacy vs Marketplace “under 16” copy | `ECOSYSTEM_AGE_COPY_INCONSISTENCY = LEGAL_REVIEW_REQUIRED` |

Do **not** resolve these by adding a platform-wide 16+/18+ code gate or global DOB in Studio.

---

## Safety note

“All ages” does **not** mean allowing illegal child-related content, bypassing provider safety, bypassing Stripe KYC, or weakening Marketplace commercial delivery 18+ rules.
