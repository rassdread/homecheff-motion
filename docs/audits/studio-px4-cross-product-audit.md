# PX.4 — Cross-product audit (read-only) and smallest safe architecture

**Phase:** PX.4 — HomeCheff → Studio contextual creation  
**Date:** 2026-08-17  
**Mode:** Audit first. Implementation follows this document.  
**PX.3 law (preserved):** ONE STUDIO → ONE FRONT DOOR → INTENT FIRST → TOOLS SECOND

This is **not** a Studio redesign. HomeCheff supplies listing context. Studio keeps **Wat wil je maken?**

---

## 1. Surfaces audited

### HomeCheff (`/Users/sergioarrias/Homecheff-app git`, production `https://homecheff.eu`)

| Surface | Finding |
|---------|---------|
| Public listing | `/product/{id}` via `ListingDetailPage` + `loadListingDetail`. Live object is **`Product`**, not legacy `Listing`. |
| Owner listing CTA | `ProductSalePrimaryActions` when `isOwner`: only **Product bewerken**. No Studio CTA. |
| Ownership UI | Client `isOwner` = session `user.id === seller.User.id`. |
| Listing manage | `/product/[id]/edit`, seller hub `/verkoper` → `/verkoper/dashboard`. |
| Media | `Image.fileUrl` (typically Vercel Blob). Ordered by `sortOrder`. |
| Public API | `GET /api/products/[id]` is unauthenticated and returns product + images + seller User. **Do not use as PX.4 owner API** (also returns price / commerce fields; does not prove Studio identity). |
| Auth | HomeCheff session is the IdP. Studio maps `User.centralUserId` = HomeCheff `User.id`. |
| SSO | `/auth/sso/start`, Studio callbacks in `lib/identity/sso/client-registry.ts`. Shared `STUDIO_SSO_CLIENT_SECRET`. |
| Ecosystem CTA | Ontdek already: `https://studio.homecheff.eu/auth/sso/silent?mode=ecosystem&returnTo=%2F` with benefit **Maak content met creatieve AI.** |
| CORS | `*.homecheff.eu` may match Studio in the browser. PX.4 must **not** browser-fetch HomeCheff APIs. |

### Studio (`homecheff-motion`, production `https://studio.homecheff.eu`)

| Surface | Finding |
|---------|---------|
| `/` | PX.3 Home: **Wat wil je maken?** → `/studio/experience`. |
| `/studio/experience` | PX.3 intent chooser + secondary packs. Public-ish marketing funnel; no listing context. |
| `/editor/start` | Image intent. |
| `/studio/start` | Video intent (orchestrator). |
| `/studio/storyboards/new` | Story intent. |
| `/motion/start` | Animation intent. |
| `/projects` | Continue / edit intent. |
| Library ingest | Existing Studio library; no HomeCheff listing import. |
| `hcProject` | Internal Studio project package — **not** a marketplace listing. |
| SSO / returnTo | `validateStudioReturnTo` **strips all query strings** except `/studio?storyboardId=`. Pathnames under `/studio/…` are kept. |
| Silent SSO | Unauthenticated private → `/auth/sso/silent?returnTo=…`. Pending cookie `studio_sso_pending` holds validated `returnTo`. |
| Session | Host-only `studio_session`. No shared `.homecheff.eu` cookie. |
| Credits | Navigation does not spend. Generation spends after explicit action. |

---

## 2. BEFORE integration map

```
HomeCheff owner listing
  → Product bewerken only
  → (user must leave marketplace)

Ontdek / marketing
  → silent SSO → Studio Home `/`
  → Wat wil je maken? (no listing)

Studio `/studio/experience`
  → Beeld / Video / Verhaal / Animatie / Bewerken
  → existing engines
  → no HomeCheff source, no photos, no title
```

There is **no** authorized listing projection from HomeCheff → Studio today.

---

## 3. AFTER integration map (chosen)

```
HomeCheff owned Product
  → CTA “Maak content” (owner only)
  → https://studio.homecheff.eu/studio/from/homecheff/product/{uuid}

Studio (no product session)
  → silent SSO, returnTo = that PATH (query-safe)
  → studio_session minted via existing PKCE

Studio (session exists)
  → same path directly

Studio server
  → centralUserId from Studio User
  → HMAC request to HomeCheff internal projection
  → owner check: Product.seller.User.id === centralUserId
  → small projection (title, description, images[0..8], category, display name, return URL)

Studio UI
  → listing preview
  → unchanged PX.3 “Wat wil je maken?”
  → existing intent routes
  → no project / no credits on entry

Cancel / invalid context
  → normal `/studio/experience`
```

---

## 4. Answers to the 20 questions

1. **Best CTA location:** Owner product detail, in `ProductSalePrimaryActions` next to **Product bewerken**. Not on other people’s listings. Dashboard tiles deferred (avoid scatter).

2. **Wording:** **Maak content** — already used in Ontdek (“Maak content met creatieve AI.”). Generic. Does not skip PX.3 by saying “promotievideo”.

3. **One generic CTA** on the listing. Outcome is chosen in Studio.

4. **Safe useful fields:** title, description (truncated), image URLs (capped), category / marketplaceCategory, seller display name, public return URL `/product/{id}`.

5. **Fetch server-side:** all of (4). URL carries only `source` (path), `type`, opaque `id`.

6. **Ownership:** HomeCheff server: `Product.seller.User.id ===` Studio `centralUserId` (HomeCheff `User.id`). Do not trust query seller ids.

7. **Unpublished / private:** yes, **owner only**, via the internal projection. Public `GET /api/products/[id]` is not the contract.

8. **Public listing, not owner:** no CTA. Tampered Studio URL → no owner projection → graceful PX.3 chooser (no private leak).

9. **No Studio session:** existing silent SSO (then login if needed). `returnTo` is the path under `/studio/from/…`.

10. **SSO preserves context:** path-based deep link. Query-based `?source=&id=` would be **stripped**. Do not put listing fields in the URL.

11. **HC signed in, Studio not:** silent SSO JIT/links existing Studio user; then chooser with context.

12. **Cannot resolve listing:** soft message + normal PX.3 chooser. No raw 404 as primary UX.

13. **No images:** chooser still shown; preview without photo.

14. **Many images:** cap **8** (same spirit as SP.2D-F recent limits).

15. **Media:** **reference** `fileUrl` values. Copy only later if a provider requires a Studio-owned blob (not PX.4 entry).

16. **Project creation:** after the user chooses an intent and starts work in that engine — **not** on CTA click.

17. **Cancel:** link to `/studio/experience` (normal Studio). No DB objects to roll back.

18. **Remember source:** path while on the chooser; `sessionStorage` key with `{source, type, id}` only (no PII) for later PX.5. No schema migration.

19. **Return to listing:** `returnTarget = https://homecheff.eu/product/{id}` shown as a simple link. No listing mutation.

20. **Other objects later:** path is `/studio/from/homecheff/{type}/{id}`. PX.4 implements `type=product` only; unknown types unresolved.

---

## 5. Security architecture

```
REFERENCE (opaque product UUID in path)
  → VERIFY (Studio session + centralUserId)
  → FETCH (server HMAC to HomeCheff)
  → NORMALIZE (small StudioSourceContext)
```

- Reuse `STUDIO_SSO_CLIENT_SECRET` (+ `_PREVIOUS`) for HMAC. **No second identity system.**
- HMAC body: `{timestamp}\n{centralUserId}\n{type}\n{id}`. Skew 60s.
- HomeCheff responds 404 for missing **and** non-owner (no private existence leak beyond UUID guessing, which the public page already allows for public products).
- No title/description/media/price in query params.
- No shared subdomain session cookie.
- PKCE / `validateStudioReturnTo` unchanged except tests proving the new path survives.

### PUBLIC vs OWNER context (PX.4)

PX.4 ships **owner context only**. Public-listing-as-anyone is deferred (would still need a public projection without private fields). Tampering another seller’s id never returns their unpublished description/images through this API.

---

## 6. Explicitly out of scope (unchanged)

Growth, favicon, SP.2D, PX.3 redesign, central auth redesign, pricing, credits, Stripe, providers, autosave, publish/export, marketplace payments, listing schema migration, automatic listing mutation.

---

## 7. Deploy order

1. Studio receiver + chooser live on `studio.homecheff.eu`
2. Production verify receiver (invalid id → graceful chooser)
3. HomeCheff CTA + internal API
4. Production owner E2E
5. STOP — no PX.5
