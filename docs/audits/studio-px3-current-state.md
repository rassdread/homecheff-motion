# PX.3 — Current-state audit (BEFORE)

Status: **READ-ONLY MAP** · 2026-08-17  
Production: `studio.homecheff.eu` · HEAD at start: `d815d600` (PX.2 merge)  
PX.2 terminology: **do not undo**. No implementation in this file.

## Verdict (before)

PX.2 made labels honest. The front door still presents **five internal products as equals**. A normal creator must still pick Beelden / Verhalen / Animatie / Video afronden / Bibliotheek before (or instead of) answering “Wat wil je maken?”.

## Production snapshot

| Path | Status | Notes |
|------|--------|-------|
| `/` | 307 → `/auth/sso/silent?returnTo=%2F&mode=public` | SSO unchanged |
| Silent SSO | 302 → `homecheff.eu/auth/sso/start` `interaction=silent` | Unchanged |
| `/studio` `/studio/experience` `/editor` `/motion` `/publish` `/library` `/projects` `/account/credits` | 200 | Public landings / credits live |

Anonymous chrome on product pages: **Home · Beelden · Verhalen · Animatie · Video afronden · Bibliotheek** (Projecten hidden until signed in).

## BEFORE Home hierarchy

**Priority is inverted.** Tools and destinations compete.

1. Globe/orbit: five planets (BEELDEN / VERHALEN / ANIMATIE / AFRONDEN / BIBLIOTHEEK) → product landings  
2. Hero primary: **Wat wil je maken?** → `/studio/experience`  
3. Hero secondary: Library (signed-in) or pricing (signed-out)  
4. Getting started: Wat wil je maken? + Beelden bewerken + Bibliotheek  
5. Mobile chips: Beelden, Verhalen, Instant (`/animate/instant`), Help  
6. Recent projects / assets (shell-first; library `recent?limit=8`)  
7. `/studio` dashboard: orchestrator first, then 7 quick-creates, then continue, then usage dashboard  

## BEFORE navigation

| Surface | Items | Equal? |
|---------|-------|--------|
| Suite chrome (default ON) | Home, Beelden, Verhalen, Animatie, Video afronden, Projecten, Bibliotheek, Prijzen | Yes — pipeline as tabs |
| Mobile drawer | Same + billing/help | Crowded |
| Planet orbit | 5 products | Yes |
| `/studio/experience` | 5 P0 **packs** (restaurant, HomeCheff, LinkedIn, animation, outfit) | Pack catalog, not intents |

Flag: `NEXT_PUBLIC_HOMECHEFF_PRODUCT_SUITE_NAV` unset → suite nav **on**.

## BEFORE prominent CTAs

| Surface | Label | Href |
|---------|-------|------|
| Home hero primary | Wat wil je maken? | `/studio/experience` |
| Home hero secondary (in) | Bibliotheek openen | `/library` |
| Home hero secondary (out) | Bekijk abonnementen | `/pricing` |
| Getting started | Wat wil je maken? / Beelden bewerken / Bibliotheek | `/studio/experience` `/editor` `/library` |
| `/studio` landing | Nieuw verhaal | `/studio/storyboards/new` |
| `/editor` landing | Start met bewerken | `/editor/start` |
| `/motion` landing | Animatie starten | `/motion/start` |
| `/publish` landing | Video afronden | `/publish/start` |
| `/studio` dashboard quick | Nieuw verhaal, Video maken, personage/object/locatie/stijlwereld, bestanden | mixed tools |
| Continue | “Verder werken aan” **below** quick links | `view=shell` continueWorking |

## Experience chooser (before)

`/studio/experience` empty state = `P0_EXPERIENCE_PACKS` via Director pack UI.  
Deep links `?experience=` still open the existing funnel. **No** Beeld/Video/Verhaal/Animatie/Bewerken intent layer.

## Continue / performance (before)

- `/` recent projects: client snapshot (no insights API)  
- `/` recent assets: `fetchRecentLibraryAdditions(8)` (SP.2D-F)  
- `/studio`: `view=shell` then `view=dashboard`  
- Accepted: Home warm usable p50 ≈ 340 ms / worst ≈ 674 ms  

## Smallest safe PX.3 change

1. **Global chrome:** Home · Projecten · Bibliotheek. Product routes stay in **Meer**.  
2. **Chooser:** intent cards over existing engines; packs remain secondary.  
3. **Home:** one dominant create CTA; signed-in secondary **Ga verder** → `/studio` (existing continue list; no new Home API).  
4. **Dashboard:** create CTA + continue above orchestrator; entity quick-creates behind Meer opties.  
5. **Mobile:** drop equal product chips; keep 44px primary CTA.  

Not in PX.3: route renames, listing import, editor redesign, SSO/credits/providers, collapsing the globe into a new engine.
