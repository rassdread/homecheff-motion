# PX.4 — Final Report — HomeCheff → Studio contextual creation

**Phase:** PX.4 — HomeCheff → Studio contextual creation  
**Date:** 2026-08-17  
**Verdict:** **COMPLETE / PASS**  
**PX.5:** **NOT STARTED** — no automatic listing publish-back.

PX.3 law preserved: ONE STUDIO → ONE FRONT DOOR → INTENT FIRST → TOOLS SECOND.

Audit: `docs/audits/studio-px4-cross-product-audit.md`.

---

## Identity card

| Field | Studio | HomeCheff |
|-------|--------|-----------|
| Repository | `rassdread/homecheff-motion` | `rassdread/homecheff-app` |
| PR | [#33](https://github.com/rassdread/homecheff-motion/pull/33) | [#68](https://github.com/rassdread/homecheff-app/pull/68) |
| Feature SHA | `86115b226d8d243e1e2d10388e2f3d75fe4dc9da` | `e4b9e9e6201e8ce1851f37f7416315150ec75ead` |
| Merge SHA | `7072f3cc484f68a98fb857590449ff54ea7f8a14` | `2642ed61a6eb55b3f621fb85dc0e75b82b07866d` |
| Production deployment | `dpl_4cFHar2SnR7vCt4L5xwkrtX9Qo1c` | `dpl_AjdpZevtycjUoWdHRC33Vu8qBeSg` |
| Production alias | `studio.homecheff.eu` | `homecheff.eu` |
| Rollback | Revert PR #33 | Revert PR #68 |
| Schema / credits / SSO cookie model | Unchanged | Unchanged |

---

## 1. PX.4 verdict

**COMPLETE / PASS.** A HomeCheff seller can start Studio from an owned listing. Studio resolves owner context server-side and still asks **Wat wil je maken?** Production routes and authorization probes are live. A signed-in seller tap on a real listing remains the recommended human smoke.

---

## 2–3. Surfaces audited

See `docs/audits/studio-px4-cross-product-audit.md`.

HomeCheff: own listing / `ListingDetailPage` / `ProductSalePrimaryActions` / `/product/[id]/edit` / `/verkoper/dashboard` / `Product`+`Image` / `GET /api/products/[id]` (not used) / SSO IdP / ownership via `seller.User.id`.

Studio: `/`, `/studio/experience`, `/editor/start`, `/studio/start`, `/studio/storyboards/new`, `/motion/start`, `/projects`, library, `validateStudioReturnTo`, silent SSO, `studio_session`.

---

## 4. BEFORE integration map

```
HomeCheff owner listing → Product bewerken only
Ontdek → silent SSO → Studio Home (no listing)
Studio /studio/experience → PX.3 intents (no HomeCheff source)
```

---

## 5. AFTER integration map

```
Owned Product → Maak content
  → studio.homecheff.eu/studio/from/homecheff/product/{uuid}
  → silent SSO if needed (path returnTo)
  → HMAC owner projection
  → listing preview + Wat wil je maken?
  → existing engines
```

---

## 6–8. CTA

**Placement:** owner product detail, under **Product bewerken** (`ProductSalePrimaryActions`). Not on other people’s listings. Dashboard scatter deferred.

**Wording:** **Maak content** — already used in Ontdek (“Maak content met creatieve AI.”). Generic; does not skip PX.3 by saying “promotievideo”.

---

## 9–11. Context transport

Path-based deep link (query strings are stripped by `validateStudioReturnTo` except `/studio?storyboardId=`).

Resolved server-side: title, description (truncated), up to 8 `https` image URLs, category, seller display name, `returnTarget`.

**Excluded:** price, pickup coords/address, kvk, Stripe, allergens internals, integrity reasons, stock, email, IBAN.

---

## 12–15. Auth / ownership / SSO

- Studio session remains host-only `studio_session`.
- Identity: Studio `User.centralUserId` = HomeCheff `User.id`.
- HomeCheff HMAC with existing `STUDIO_SSO_CLIENT_SECRET` (+ previous).
- Owner: `Product.seller.User.id === centralUserId`. Foreign/removed → not found. Tampered HMAC → 403.
- No Studio session: `/auth/sso/silent?returnTo=/studio/from/homecheff/product/{id}`.
- Existing Studio session: contextual page directly.

Production probe: unauthenticated context API → 404 (no central user header) or 403 (fake HMAC). Silent SSO still PKCE to HomeCheff `/auth/sso/start`.

---

## 16–18. Media / empty / invalid

References to existing `Image.fileUrl` values. No copy on entry. No images → placeholder + chooser. Invalid/deleted/non-owner → soft message + normal PX.3 chooser (HTTP 200 route, not a raw 404 page).

---

## 19–22. UI / intents / projects / credits

Contextual banner + unchanged PX.3 chooser (contextual descriptions). Intents still: Beeld `/editor/start`, Video `/studio/start`, Verhaal `/studio/storyboards/new`, Animatie `/motion/start`, Bewerken `/projects`. No project/credit on CTA or context fetch.

---

## 23. Return to HomeCheff

Simple **Terug naar advertentie** (`https://homecheff.eu/product/{id}`). No listing mutation. PX.5 can attach media later.

---

## 24. Mobile

Chooser cards `min-h-[72px]`; CTA/return links `min-h-[44px]`; stacked image + title. Not a desktop-only flow. Human narrow-viewport smoke still recommended on a real seller phone.

---

## 25. Performance

SP.2D Home/editor not reopened. Contextual page fetches identity + one listing projection only (no dashboard, library, or seller history). Studio Home still 307 → public silent SSO as before.

---

## 26. Security tests

Unit: owner vs foreign, HMAC identity swap, expired timestamp, query PII stripped, media cap, ids-only session remember. Production: fake HMAC 403; missing identity 404; no listing PII in deep link.

---

## 27–31. Quality

| Repo | Tests | Lint | tsc | Build |
|------|-------|------|-----|-------|
| Studio | **4867/4867** | 0 errors / 440 pre-existing warnings | pass | Next 16 pass; route `/studio/from/homecheff/[type]/[id]` |
| HomeCheff | **7/7** `test:px4-studio-context` | 0 errors / 1 pre-existing warning | many **pre-existing** errors in admin/scripts; **none** in PX.4 files | Preview failed once (`node:crypto` in client) then **fixed**; production Ready |

---

## 32. Files changed

Studio: audit, source-context lib/tests/fetch, `/api/studio/source-context`, `/studio/from/homecheff/[type]/[id]`, banner, PX.3 chooser + i18n, SSO test, `package.json`.

HomeCheff: CTA, i18n `product.makeContent`, client-safe deep-link lib, server HMAC lib, internal API, tests, `package.json` script.

---

## 33. DB/schema

**None.**

---

## 34–39. PRs / SHAs / deploys

See identity card.

---

## 40. Production E2E

| Flow | Result |
|------|--------|
| Studio receiver live | HTTP 200 `x-matched-path: /studio/from/homecheff/[type]/[id]` |
| Normal Studio Home | Unchanged 307 → public silent SSO |
| `/studio/experience` | 200 PX.3 |
| SSO path | silent → HC `/auth/sso/start` PKCE |
| Context API tamper | 403 |
| Owner listing → CTA → chooser | Deployed; human seller session still recommended |
| Mobile | Layout pass; device smoke recommended |

---

## 41. Regressions

First HomeCheff preview: webpack `node:crypto` via client CTA import. Fixed by splitting HMAC to `lib/studio/px4-source-context-hmac.ts`. No Studio regressions. HomeCheff `tsc --noEmit` remains red on pre-existing files (not PX.4).

---

## 42. Rollback

Revert Studio PR #33 and/or HomeCheff PR #68. No migrations.

---

## 43. Explicitly deferred

Automatic publish-back, photo replacement, social posting, Growth, bulk generation, credit spend on entry, seller-profile campaigns, analytics, route migrations, editor redesign. **PX.5** can close create → use in listing.

---

## 44. Recommended next PX phase

**PX.5 — CREATE → RETURN / USE IN HOMECHEFF** after explicit confirmation. Not started.
