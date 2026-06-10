# HomeCheff Studio Rebrand Report

## Product Naming Update

User-facing **HomeCheff AI Suite** / **HomeCheff AI** references are now **HomeCheff Studio**:

- App shell header (`brand.studioProductName`)
- Page metadata title
- Universe welcome, suite label, assets hub eyebrow
- How-it-works and why-studio copy

Internal code identifiers (e.g. `homecheff-product-suite`) unchanged.

## Core Tagline System

| Role | NL | EN |
|------|----|----|
| Primary | Jouw AI productielijn. | Your AI production line. |
| Supporting | Van idee naar video. / Van video naar iedere versie. | From idea to video. / From video to every version. |
| Marketing alt | Create once. Adapt endlessly. | Create once. Adapt endlessly. |

Keys: `universe.hero.tagline`, `universe.hero.leadA/B`, `universe.hero.taglineAlt`, `universe.public.subheadline`.

## Homepage Positioning

Hero (`universe-hero-copy.tsx`) now shows:

- Pipeline: images → stories → scenes → publish worldwide
- One project / unlimited versions
- Adapt-later checklist (voice, music, languages, subtitles, branding, CTAs)
- CTA to `/hoe-werkt-studio`

## Product Flow Repositioning

Planet descriptions, `suite.home.*.example`, and `suite.product.*Desc` aligned to:

Editor → building blocks · Studio → production design · Motion → animate · Publish → versions · Library → keep everything.

Short labels on planets and suite home cards via `universe.planet.*.short`.

## Why HomeCheff Studio Page

New route **`/hoe-werkt-studio`** — `UniverseWhyStudioPage` with six sections: problem, solution, workflow, versions, examples, start CTA.

Hero “how it works” links here (`resolveUniverseHowItWorksHref`). Legacy `/hoe-het-werkt` retained.

## Watermark Language

Standardized i18n keys (for export/preview surfaces):

- `brand.studio.watermark` — Gemaakt met / Made with HomeCheff Studio
- `brand.studio.openIn` — Openen in / Open in HomeCheff Studio
- `brand.studio.editIn` — Bewerken in / Edit in HomeCheff Studio

## Navigation Reinforcement

Suite nav labels unchanged (Editor, Studio, Motion, Publiceren, Bibliotheek). Supporting copy updated in `suite.product.*Desc` and suite home subtitles.

## Differentiation Section

`UniverseDifferentiation` below production line on homepage — workflow visual, adapt-later bullets, closing “one production / unlimited versions”.

## I18N Update

Full NL/EN parity for all new and updated keys under `brand.studio.*`, `universe.hero.pipeline.*`, `universe.differentiation.*`, `universe.whyStudio.*`.

## Tests / Build Status

See latest Riedel run after commit.
