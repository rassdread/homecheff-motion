# Mobile & Cross-Browser QA Report

**Date:** 2026-06-17  
**Scope:** HomeCheff Studio mobile polish + Safari / Chrome / Edge compatibility  
**Status:** PASS (automated gates + code audit)

---

## Breakpoints tested (code audit + layout tokens)

| Breakpoint | Target device |
|------------|---------------|
| 375px | iPhone SE / small mobile |
| 390px | iPhone 14/15 |
| 430px | iPhone Pro Max |
| 768px | Tablet |
| 1024px | Small laptop / iPad landscape |
| 1280px | Desktop |
| 1440px | Large desktop |

Responsive behavior is enforced via Tailwind breakpoints (`md:` 768px, `lg:` 1024px) and CSS custom properties (`--studio-header-height`).

---

## Browsers covered

| Platform | Browser | Notes |
|----------|---------|-------|
| macOS | Safari | Safe-area insets, `100dvh`, backdrop-filter fallback |
| macOS | Chrome | Same CSS baseline |
| Windows | Chrome | `overflow-x: clip`, table scroll, no `100vw` overflow |
| Windows | Edge | Chromium — same as Chrome |
| iOS | Safari | Header `env(safe-area-inset-top)`, drawer `safe-area-inset-bottom` |
| Android | Chrome | Touch targets 44px, horizontal scroll on tables |

---

## Pages audited

| Route | Mobile fixes applied |
|-------|----------------------|
| `/` | Omniverse + Space Gallery hidden below `md`; mobile quick actions CTA |
| `/studio` | Shared app shell + page overflow tokens |
| `/editor` | Growth sidebar mobile FAB (existing) |
| `/animate/instant` | Existing bottom-sheet safe-area patterns |
| `/projects` | Product page shell padding |
| `/studio/assets` (Library) | Scroll-safe layout audit |
| `/pricing` | Plan cards stack (existing grid) |
| `/help` | Standard content width |
| `/account/billing` | Tab bar wrap, table `hc-table-scroll`, promo stack |
| `/account/billing?tab=*` | Same billing dashboard |
| `/mijn-verbruik` | Product shell |
| `/admin/billing/*` | Product shell + forms |
| `/admin/examples` | Admin chrome |

---

## Issues found & fixed

### Phase 1 — Mobile home

| Issue | Fix |
|-------|-----|
| Heavy Omniverse orbit + mobile stack crowded homepage | `home-universe-zone` hidden below `md` |
| Space Gallery visually heavy on mobile | `UniverseHomeSpaceShowcase` wrapped in `hidden md:block` |
| No mobile-first CTA after removing universe | Added `UniverseHomeMobileQuickActions` with primary/secondary CTAs + quick links |

### Phase 2 — Mobile header / menu

| Issue | Fix |
|-------|-----|
| Logo text + user pill + menu overlapped on narrow screens | Logo text hidden below 400px; compact user avatar on mobile |
| Mobile drawer clipped inside header row | Fixed-position drawer + backdrop overlay |
| Missing Help / Billing in mobile nav | Added mobile-only links in drawer |
| Tap targets too small | Menu button `min-h/w 44px`; nav links `studio-mobile-nav-link` |
| iPhone safe area | `studio-header-safe` + drawer bottom inset |

### Phase 3–4 — Responsive / forms

| Issue | Fix |
|-------|-----|
| Horizontal overflow risk | `overflow-x: clip` on `html`, `body`, app shell |
| Billing promo row cramped | `flex-col` on mobile, `min-h-[44px]` inputs/buttons |
| Transaction table overflow | `hc-table-scroll` wrapper |

### Phase 7–8 — Cross-browser

| Issue | Fix |
|-------|-----|
| Backdrop blur unsupported | Solid navy fallback in `mobile-polish.css` |
| `100vh` mobile browser chrome | `min-height: 100dvh` on body |
| Windows scrollbar layout shift | `hc-viewport-width` uses `100%` not `100vw` |

---

## Known limitations

1. **Manual device QA recommended** — Automated tests verify structure/CSS; visual pass on real iPhone/Android still advised before marketing push.
2. **Instant wizard bottom sheets** — Existing safe-area handling retained; complex Motion flows may need per-device spot checks.
3. **Admin data tables** — Horizontal scroll enabled; very wide columns still require swipe on small phones (by design).
4. **Playwright e2e** — Not run in this pass; `npm run test:e2e` available for staging.

---

## Automated verification

```bash
npm run build   # PASS
npm run test    # PASS — 3803/3803
```

New regression tests: `src/lib/mobile-cross-browser-polish.test.ts`

---

## Files changed (summary)

- `src/components/suite/universe/universe-home-page.tsx`
- `src/components/suite/universe/universe-home-mobile-quick-actions.tsx` (new)
- `src/components/layout/app-shell.tsx`
- `src/components/layout/app-shell-primary-nav.tsx`
- `src/components/layout/app-shell-user-bar.tsx`
- `src/components/account/studio-billing-panel.tsx`
- `src/components/account/studio-unified-billing-dashboard.tsx`
- `src/lib/studio-visual-tokens.ts`
- `src/app/mobile-polish.css` (new)
- `src/app/globals.css`
- `src/i18n/locales/en.ts`, `nl.ts`
- `src/lib/mobile-cross-browser-polish.test.ts` (new)
