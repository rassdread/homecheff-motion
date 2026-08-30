# Product Inventory — HomeCheff Studio

**Audit date:** 2026-08-30  
**Production:** https://studio.homecheff.eu  
**Live SHA (at audit):** `3c9ff58c29c640fbd512c755191f2931f1912c5f`  
**Method:** Route inventory + Production HTTP probes + prior cert evidence (no code changes)

## Front doors

| Surface | Route | Notes |
|---|---|---|
| Marketing home | `/` | SEO/marketing; Create CTA ecosystem |
| Studio home | `/studio` | Unified intents (Slice 1A) when no storyboard query |
| Story Workspace | `/studio?storyboardId=` | Human stages Verhaal→…→Afronden |
| Create / Maak | `/create` → `/maak` → `/` | **Diverges** from Studio home IA |
| Projects | `/projects` | S2H Mijn projecten (canonical) |
| Pricing | `/pricing` | Plans + credit catalog |

## Creation entry points (current)

| Intent | Route | Free path? | Credits? |
|---|---|---|---|
| Quick video | `/studio/photo-video` | Yes (FREE_LOCAL) | No for catalog/local export |
| Image / design | `/editor/start` | Partial | Often paid AI |
| AI video | `/studio/experience` | No | Yes |
| Animation | `/motion/start` → Instant | No | Yes |
| HC listing handoff | `/studio/from/homecheff/…` | Quick Video yes | Depends |
| Advanced stories | `/studio/storyboards` | No | Yes |

## Major workspaces

| Domain | Primary surface |
|---|---|
| Quick Video | Photo-video composer |
| Story | Workspace + Director V2 |
| Motion | `/animate/instant` (+ hub `/motion`, legacy `/animate`) |
| Image | `/editor` |
| Finish | S2G Finish hub (`stage=finish`) |
| Projects | `/projects` |
| Motion outputs | `/videos` |
| Assets | `/studio/assets` |
| Free Music | Inside Quick Video (public ON, 55 tracks) |

## Parallel / secondary surfaces (still reachable)

`/studio/storyboards/[id]/classic`, `/production`, `/movie-builder`, `/studio/providers`, `/videos`, `/library`, `/publish`, `/animate`, `/studio/account` vs `/account`

## Admin / internal

`/admin/**` — layout gated; not consumer product.

## Security note (post-inventory)

`POST /api/test-blob` — **no auth**, public blob upload on Production (**P0**). See `SECURITY-EXPOSED-TEST-ROUTES.md`.

## Free Music (observation)

FUNCTIONALLY COMPLETE; Phase 4 observation time windows may still be open — **not** a product missing-feature.
