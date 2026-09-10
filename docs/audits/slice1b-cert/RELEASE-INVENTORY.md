# Slice 1A + 1B Release Inventory

**Release HEAD:** `b9eaf7df`  
**Product commit:** `8210ebf1`  
**Cert commit:** `b9eaf7df`

## Shipped (36 product + 10 cert files)

| Category | Files | Safe to ship |
|----------|-------|--------------|
| **A — Slice 1A** | `studio-unified-home-page.tsx`, `studio-slice1a-home.ts`, `studio-px4-contextual-intent-chooser.tsx`, `quick-video/route.ts`, `studio/start/page.tsx`, `studio-landing-route.tsx`, `homecheff-primary-nav-config.ts`, `studio-product-landing-routes.ts`, `studio-px3-home.ts`, `from/homecheff/.../page.tsx`, related tests | Yes |
| **B — Slice 1B** | `photo-video-context-bar.tsx`, `context-actions.ts`, `use-photo-video-layout-posture.ts`, composer/inspector/strip/preview/text/transition-picker, `video-element.ts`, layout tests | Yes |
| **C — Cert** | `_px4a-cert-helpers.ts`, `_px4a-slice1b-local-cert.ts`, `_px4a62/63/64-prod-visual-cert.ts`, `_px4a7-*-cert.ts`, `e2e/px4a4-public-creator.spec.ts` | Yes |
| **Shared** | `i18n/en.ts`, `nl.ts`, `package.json` (test entries), `.gitignore` | Yes |

## Excluded (UNRELATED — left unstaged)

| File area | Why excluded |
|-----------|--------------|
| `src/app/account/wallet/`, `src/app/api/me/hc-wallet/` | HC wallet UI — billing phase |
| `src/components/hc/`, billing components, account dashboard | Billing/account |
| `src/server/studio-account/*` (wallet, hc-central, reconciliation) | Billing backend |
| `src/server/animation-jobs/motion-credit-settlement.ts` | Motion credit hold |
| Animation/instant-premium API route diffs | Billing integration |
| `app-shell-chrome.tsx` wallet pill (reverted before commit) | Billing UI |

## UNKNOWN — investigated

| Item | Resolution |
|------|------------|
| `homecheff-assistant-flag.ts` | Slice 1A — Growth off on all `/studio/photo-video/*` |
| `growth-sidebar-layout.test.ts` | Slice 1A test update — included |
