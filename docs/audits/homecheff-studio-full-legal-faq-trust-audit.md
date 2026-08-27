# Studio — Full Legal / FAQ / Trust Audit

**Date:** 2026-08-27  
**Production:** https://studio.homecheff.eu

## Executive findings

| Area | Verdict |
|------|---------|
| Dedicated Privacy/Terms/Cookies | Were **404**; operational pages **implemented** |
| Site footer legal | Was missing; **added** |
| Help / Pricing FAQ | Present; schema wrongly claimed monthly credits — **fixed** |
| Plan prices | Creator €7.99 / Pro €24.99 / Studio €79.99 |
| Monthly subscription credits | **0** in Studio plan SSOT (packs separate) |
| Growth catalog HC maps (750/1500/4000) | **CONTRADICTS** Studio live monthlyCredits=0 — **LEGAL_DECISION_REQUIRED / PO** |
| Music library | Empty catalog; do not promote royalty-free stock |
| Studio affiliate payouts | **Not implemented** (creative templates only) |
| AI / IP | Soft notices only — LEGAL_REVIEW_RECOMMENDED |
| Contact | support@homecheff.eu via footer |

## AI / content rights

- User must have rights to uploads.
- Limited processing licence for render/store.
- AI output: errors, non-uniqueness, no universal commercial IP guarantee.
- Failed gen refunds: soft “most” + code refund paths — not a hard SLA.

## Music

- `PHOTO_VIDEO_CATALOG_TRACKS = []`.
- Own-upload consent string only.
- **NO_GO** to commercially promote an in-app royalty-free library until provenance exists.

## P0/P1 implemented

1. `/privacy`, `/terms`, `/cookies`  
2. `StudioSiteFooter` in app shell  
3. `PRICING_FAQ_SCHEMA` aligned with monthlyCredits=0  
4. Tests `src/lib/pre-promotion-legal.test.ts`

## Remaining

- Full Studio CMP / analytics consent parity with Growth  
- Dedicated AI usage terms counsel review  
- Music licence programme if catalog ships  
- PO decision: central HC monthly grants vs Studio pack-only model
