# Product Suite Naming Refinement Report

## Naming Audit

| Term | Locations updated | Internal id kept |
|------|-------------------|------------------|
| Presentation → **Publish** | Suite nav, product defs, billing label, docs | `presentation` |
| Assets → **Library** | Suite nav, legacy nav, hub titles, breadcrumbs | `assets` |
| `/studio/assets` | Unchanged (stable internal route) | — |
| `/videos` | Publish entry (via `/publish` alias) | — |
| `/library`, `/publish`, `/presentation` | New redirects in `next.config.ts` | — |

**Still uses "presentation" internally:** `HomeCheffProductId`, `homecheff-presentation-suite.ts`, `homecheff-presentation-foundation.ts` (render/overlay code — not user-facing).

---

## Navigation Update

**Suite nav (flag on):** Editor · Studio · Motion · **Publish** · **Library** · Pricing

**Legacy nav (default):** Create · Studio · **Library** · Motion · Videos · Pricing · About

Flag: `NEXT_PUBLIC_HOMECHEFF_PRODUCT_SUITE_NAV=true`

Config: `src/lib/homecheff-primary-nav-config.ts`

---

## Route Alias Plan

| User-facing | Redirects to | Purpose |
|-------------|--------------|---------|
| `/library` | `/studio/assets` | Library hub alias |
| `/library/:path*` | `/studio/assets/:path*` | Section aliases |
| `/publish` | `/videos` | Publish entry |
| `/presentation` | `/publish` | Legacy name redirect |

No existing routes broken.

---

## I18N Update

**EN:** Publish, Library + new descriptions per spec  
**NL:** Publiceren, Bibliotheek + new descriptions per spec

Keys: `suite.nav.publish`, `suite.nav.library`, `suite.product.publish*`, `suite.product.library*`, `nav.library`, breadcrumb keys, hub titles.

Parity verified in tests.

---

## Product Suite Types

Internal ids unchanged: `presentation`, `assets`  
Display mapping: `SUITE_PRODUCT_DISPLAY_LABEL_KEYS` → Publish / Library  
Billing plan id: `publish` (label key `suite.billing.plan.publish`)

---

## Page Titles & Breadcrumbs

- Assets Hub title → **Library** / **Bibliotheek**
- Breadcrumbs: `Library / Media / Videos`, `Library / Creative / Characters`, etc.
- Component: `studio-assets-hub-section.tsx`

---

## Docs Update

- `docs/product-suite-naming-refinement-report.md` (this file)
- `docs/homecheff-ai-suite-architecture-phase5-report.md` — see naming note
- `studio-integration-architecture.ts` — V11 comment updated

---

## Tests / Build Status

Run: `npm run test`, `npm run build`, `npm run lint`

Tests cover: Publish/Library nav labels, route aliases, EN/NL labels, no Presentation/Assets in suite nav.
