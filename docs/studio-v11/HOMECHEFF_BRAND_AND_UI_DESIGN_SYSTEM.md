# HomeCheff brand and Studio design system

V11 does not change CSS. This is the rule for the later UI.

## Sources

- One master brand, three product names. HomeCheff, HomeCheff Studio, HomeCheff Growth. Names are not translated. Mark is the globe-man. Studio must not draw a new mascot. Source: `homecheff-leads/docs/architecture/homecheff-unified-brand-system.md` (canonical, 2026-08-14). Upstream mark: `https://homecheff.eu/icon-192.png`.
- Product chrome may differ. Studio may keep a cinematic workspace. The mark and the green family stay global. Same document.
- Mission language lives in `homecheff-app/docs/brand/HOMECHEFF_BRAND_LANGUAGE.md`. It does not define a second palette. Do not restyle Marketplace or Growth from Studio work.
- Studio tokens today: `src/lib/studio-visual-tokens.ts`.

| Token | Value | Use |
|---|---|---|
| Green | `#006D52` | Primary action, active ring |
| Blue | `#0067B1` | Secondary stop of the primary gradient, focus |
| Deep navy | `#041428` | Page and header |
| Mid navy | `#062a4a` | Supporting surface |

Primary buttons are a green-to-blue gradient with white text. Cards on the dark page are either translucent white or near-white (`bg-white/[0.94]`) with zinc text.

## Recommendation: hybrid

**RECOMMENDED.** Keep the dark navy shell (header, sidebar, page) and light cards for forms, scene text, and the media grid. This is already how the library and hub cards work. Video and image previews sit on a dark well so the frame is visible.

**ALTERNATIVE.** All-light workspace. Closer to a document editor, weaker for video review, and a break from the current Studio chrome.

**ALTERNATIVE.** All-dark forms. Worse for long dialogue text and for consistency with Marketplace’s lighter content surfaces.

**REJECTED.** A new filmmaking palette (gold, pure black, or a third brand color).

## Contrast

White text on `#006D52` and on the gradient is the existing primary. Do not put green text on the navy for body copy. Body on navy stays white at about 75–90% opacity as the tokens already do. Body on light cards stays `zinc-900`. Check the quote dialog in both surfaces before shipping it. Focus rings use the green ring already named `cardActive`.

## Components

- One primary button style: `btnGradientPrimary`.
- One secondary: outline on dark, zinc border on light cards.
- Pills for nav, as today.
- Destructive actions are not green. Keep them text buttons with a confirm.
- HC quotes use the light card so the amount is readable, with the primary button as “Approve”.

## Simple and advanced

Same components. Advanced fields are a disclosure inside the properties panel. They do not change color or font.

## Typography and logo

Use the mark file already shipped for Studio (`public/brand` per the brand system). Do not generate a new logo. Do not introduce a new display typeface in the film workspace. Titles stay `font-bold tracking-tight` from the tokens.

## Motion and media

Previews are large and quiet: no autoplay with sound. Playback is an explicit control. Empty states use a short Dutch or English sentence and one primary action, not an illustration set.

## Accessibility

Target visible focus, 44px hit areas on the compact header controls (the user pill and mobile menu already use 44px), and do not encode status by green versus blue alone. Failed jobs need a word, not only a color.
