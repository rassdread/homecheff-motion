# HomeCheff Universe V3 Report

## Public Universe Landing

- Root `/` and `/maak` render `UniverseHomePage` for **all** visitors when suite nav is enabled (`home-page.tsx`).
- Signed-out users see the full universe (globe, planets, quick actions, value copy) without personal data.
- Signed-out CTAs: **Start creating** (→ signup/login with redirect) and **Sign in**.
- `resolveUniverseWelcomeMessagesPublic` returns public headline only when unauthenticated; dynamic rotating welcome runs signed-in only.

## Real HomeCheff Globe V3

- `universe-globe.tsx`: 1:1 aspect sphere with layered ocean, SVG continents, clouds, ecosystem routes, surface light points, atmosphere rim, glass reflection, and terminator shadow.
- CSS class `universe-globe-spherical` enforces circular silhouette (no vertical capsule stretch).
- Globe is larger in orbit system (`max-w` increased to 880px).

## Planet Identity Rings

- `universe-planet-identity-ring.tsx`: SVG `textPath` orbit labels (EDITOR · STUDIO · …) with slow rotation.
- Mobile degrades to static label bands.
- Always-visible title under orbit planets.

## Living Planet Detail

- `universe-planet-world.tsx`: product-specific floating fragments (editor assets, studio story cards, motion trails, publish frames, library stacks) in HomeCheff green/blue palette.

## First Screen Copy

- Signed-out: **HomeCheff AI Suite** + subheadline + Start creating / Sign in.
- Signed-in: **Welcome back, {name}** + **What will you create today?** + Continue creating.
- i18n keys added in EN and NL under `universe.public.*` and `universe.welcome.signedInHeadline`.

## Auth Aware Routing

- `universe-public-landing.ts`: `resolveUniversePlanetHref`, `resolveUniversePlanetHrefs`, `resolveSuiteNavHref`, CTA href helpers.
- Signed-out planet/nav clicks → `/login?next=<product>` via `loginHref`.
- Signed-in → direct product routes.

## Public Navigation

- `app-shell-primary-nav.tsx`: suite products visible when signed out; protected links use `resolveSuiteNavHref`.
- `app-shell-user-bar.tsx`: signed-out shows Sign in + Start creating (no Usage/Admin/email).

## Mobile Universe V3

- `universe-mobile-stack.tsx`: globe-first layout, orbital cards with visible names, capability chips, public CTAs.

## Visual Quality Pass

- Brighter background tint in `universe-background.tsx`.
- Orbit system sizing tuned for hero globe.
- Planet rings readable without hover; hover still brightens ring and expands preview.

## Tests / Build Status

- `src/lib/universe-public-landing.test.ts`: auth routing, globe class, labels, nav hrefs, welcome messages.
- Run validation: `npx prisma validate`, `npx prisma generate`, `npm run lint`, `npm run build`, `npm run test`.
