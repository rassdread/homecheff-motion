# PX.2 — Information architecture & terminology

Status: implemented. Input: `docs/audits/studio-px1-product-experience-audit.md`.

## Scope

Copy, labels, CTA vocabulary, and presentation hierarchy.  
**Not** PX.3 home funnel, PX.4 guided engine, PX.5 listing import, route/API/credit/SSO changes, or deletion of advanced tools.

## Contract

- Glossary: `src/lib/studio-px2-terminology.ts`
- Tests: `src/lib/studio-px2-terminology.test.ts`

## Destinations preserved (law 12)

| CTA meaning | Label (NL) | Destination |
|-------------|------------|-------------|
| Choose intent | Wat wil je maken? | `/studio/experience` |
| New story | Nieuw verhaal | `/studio/storyboards/new` |
| Edit images | Beelden bewerken | `/editor` (getting-started) / `/editor/start` (landing) |
| Start animation | Animatie starten | `/motion/start` |
| Finish video | Video afronden | `/publish/start` |
| Open library | Bibliotheek openen | `/library` |

Home primary CTA destination remains `/studio/experience`. Product landings keep their existing `/start` and storyboard hrefs.

Signed-in Home no longer says “Ga verder” while still opening the experience chooser. The label now matches the destination: **Wat wil je maken?**

## Navigation hierarchy

**Before (normal user):** Home, Editor, Studio, Motion, Publish, Projecten, Library — five internal products as peers, plus Universe / Motion Studio naming.

**After (labels only; hrefs unchanged):** Home, Beelden, Verhalen, Animatie, Video afronden, Projecten, Bibliotheek.

Planet chrome: BEELDEN / VERHALEN / ANIMATIE / AFRONDEN / BIBLIOTHEEK.

Suite nav remains the default (`NEXT_PUBLIC_HOMECHEFF_PRODUCT_SUITE_NAV` unset → true). Collapsing the five-product orbit into a true intent-first Home is PX.3.

## Simple vs advanced

Normal chrome uses outcomes (Hulp, Suggesties, Objecten, Stijlwereld, Bestanden, Kenmerken, Zelfde stijl).

Advanced remains reachable:

- Director (expert mode label kept)
- Adaptive Workspace / Classic editor
- Worlds, memory, consistency engines
- Copilot decision routing
- Instant, orchestrator, movie-builder
- Providers, generation controls, brand kits, language exports

## Routes explicitly preserved

`/`, `/maak`, `/studio`, `/studio/start`, `/studio/experience`, `/studio/storyboards/*`, `/editor*`, `/motion*`, `/animate*`, `/publish*`, `/library*`, `/projects`, `/videos`, `/account`, `/account/credits`, `/auth/sso/silent`.

No route migration. No SSO/credit/editor/save/publish logic change.

## Deferred to PX.3+

- Collapse five-product orbit into a true intent-first Home
- Merge experience vs story vs Instant into one guided creation
- HomeCheff listing context import / return
- Workspace progressive disclosure redesign
- Route renames (`/motion`, `/publish`, `/animate/instant`)
- Remaining advanced copy such as “AI-regisseur” inside Director V2 notes
