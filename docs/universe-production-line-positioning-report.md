# HomeCheff Universe Product Positioning Report

## Hero CTA Block

- Top-left premium CTA block via `UniverseHeroCopy`
- Tagline: **Jouw AI productielijn** / **Your AI production line**
- Signed-in: personalized welcome + “Jouw AI productielijn staat klaar.”
- Signed-out: “Welkom bij HomeCheff AI” + lead lines
- Body copy, one-project / unlimited-versions line, six adaptation highlights
- Primary CTA: Start nieuw project (login with `next` when signed out) / Ga door met creëren when signed in
- Secondary CTA: Ontdek hoe het werkt / Bibliotheek openen
- Text quick links for continue + library / start creating + sign in

## Product Flow Copy

- Updated `universe.planet.*.description` and `.short` keys (NL + EN)
- Planet capability keys aligned to production-line language in `universe-home-config.ts`
- Editor → building blocks, Studio → production setup, Motion → animation, Publish → versions, Library → memory

## Planet Hover Texts

- Shorter orbit labels per planet (Foto's, Verhaal, Animatie, Talen, Versies, etc.)
- Keys under `universe.capability.*` updated in NL and EN

## Planet Name Labels

- Product names on glass mini-labels below each planet (`UNIVERSE_PLANET_NAME_LABEL_CLASS`)
- Saturn rings remain decorative only — no `textPath` product names

## Production Line Explanation

- New `UniverseProductionLine` section on homepage
- Title: “Eén productie. Meerdere versies.”
- Adaptation bullet list + Editor → Studio → Motion → Publiceren flow with step labels

## How It Works Page

- Route: `/hoe-het-werkt`
- Component: `UniverseHowItWorksPage`
- Sections: what is HomeCheff, why not a generator, full pipeline, unlimited versions, examples, get started CTAs

## Auth Aware Copy

- `resolveUniverseStartProjectHref`, `resolveUniversePlanetHref` use `loginHref` when signed out
- Signed-in routes go directly to `/editor`, `/studio`, `/library`

## Layout Rebalance

- Hero left, universe orbit right (existing `universe-home-hero-orbit` layout retained)
- Production line section above quick actions with reduced dashboard spacing

## I18N Update

- All new copy via `universe.hero.*`, `universe.productionLine.*`, `universe.howItWorks.*`, updated planet and capability keys
- Full NL/EN parity in `nl.ts` and `en.ts`

## Tests / Build Status

- `universe-production-line-messaging.test.ts` — messaging, auth CTAs, i18n parity, planet labels
- `universe-v8-layout.test.ts` — layout and hover stability
- `universe-v6-visibility.test.ts` — planet icons and decorative rings
- Run: `npm run lint`, `npm run build`, `npm run test`
