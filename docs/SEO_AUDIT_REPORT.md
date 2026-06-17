# HomeCheff Studio — SEO Audit Report

**Date:** June 2026  
**Scope:** Public marketing surfaces, help center, indexability, structured data, social metadata

---

## Executive summary

HomeCheff Studio has a solid technical SEO foundation after this launch sprint: canonical metadata on all major public routes, global Organization/WebSite/SoftwareApplication JSON-LD, FAQ schema on pricing, Article + BreadcrumbList on help articles, expanded sitemap, and explicit noindex on account/admin/usage areas.

**Remaining gaps** are primarily content depth (help center at 10 articles vs. 50–100 target) and dedicated keyword landing pages (deferred intentionally to avoid thin content).

---

## Page-by-page audit

### Homepage (`/`)

| Check | Status | Notes |
|-------|--------|-------|
| Title | ✅ | `HomeCheff Studio` via `ROOT_SITE_METADATA` |
| Meta description | ✅ | Keyword-rich production-line positioning |
| Canonical | ✅ | `metadataBase` + root OG URL |
| H1 | ✅ | Universe hero copy (client-rendered) |
| noindex | ✅ | Indexable |
| OG / Twitter | ✅ | Globe-man brand image |
| JSON-LD | ✅ | Organization, WebSite, SoftwareApplication (root layout) |

### Studio (`/studio`)

| Check | Status | Notes |
|-------|--------|-------|
| Title | ✅ | `AI Storyboard & Production Studio \| HomeCheff Studio` |
| Description | ✅ | Storyboards, scenes, campaigns |
| Canonical | ✅ | `/studio` |
| H1 | ✅ | Studio landing intro |
| Structured data | ⚠️ | Inherits global SoftwareApplication only |

### Motion (`/animate/instant`)

| Check | Status | Notes |
|-------|--------|-------|
| Title | ✅ | `AI Video Generator — Image to Video` |
| Description | ✅ | Image-to-video intent |
| Canonical | ✅ | `/animate/instant` |
| H1 | ✅ | Motion wizard shell |
| Note | ⚠️ | `/animate` redirects; canonical is `/animate/instant` |

### Editor (`/editor`)

| Check | Status | Notes |
|-------|--------|-------|
| Title | ✅ | New `editor/layout.tsx` |
| Description | ✅ | AI image editor positioning |
| Canonical | ✅ | `/editor` |
| H1 | ✅ | Editor start screen |

### Pricing (`/pricing`)

| Check | Status | Notes |
|-------|--------|-------|
| Title | ✅ | `Pricing & Credits` |
| Description | ✅ | Credits + subscriptions |
| Canonical | ✅ | `/pricing` |
| H1 | ✅ | Pricing page title |
| FAQPage JSON-LD | ✅ | `PRICING_FAQ_SCHEMA` in layout |

### Billing (`/account/billing`, `/mijn-verbruik`)

| Check | Status | Notes |
|-------|--------|-------|
| noindex | ✅ | Account layout + `/mijn-verbruik/layout.tsx` |
| robots.txt | ✅ | `/account/`, `/mijn-verbruik/` disallowed |
| Public pricing | ✅ | `/pricing` is the indexable billing surface |

### Help Center (`/help`, `/help/[slug]`)

| Check | Status | Notes |
|-------|--------|-------|
| Home title/description | ✅ Fixed | Was duplicating pricing copy |
| Article metadata | ✅ | Per-slug `generateMetadata` |
| H1 hierarchy | ✅ | One H1 per article; category as eyebrow |
| Article JSON-LD | ✅ | Article + BreadcrumbList |
| Content depth | ⚠️ | 10 articles; roadmap targets 50–100 |

### Library (`/library`)

| Check | Status | Notes |
|-------|--------|-------|
| Title | ✅ | New layout |
| Description | ✅ | Asset library positioning |
| Auth | ⚠️ | May require login; still listed in sitemap for discovery |

### Projects (`/projects`)

| Check | Status | Notes |
|-------|--------|-------|
| Title | ✅ | New layout |
| Description | ✅ | Cross-product project hub |
| Auth | ⚠️ | Often authenticated; metadata still set |

### Signup (`/signup`)

| Check | Status | Notes |
|-------|--------|-------|
| Title | ✅ | New layout |
| Description | ✅ | Public launch signup |

---

## Duplicate / missing metadata

| Issue | Resolution |
|-------|------------|
| Help home duplicated pricing description | Fixed → `PUBLIC_PAGE_SEO.help` |
| Editor, library, projects lacked layouts | Fixed → dedicated layouts |
| Help articles lacked breadcrumbs in schema | Fixed → `buildHelpArticleJsonLd` |
| Account/admin lacked robots metadata | Fixed → `buildNoIndexMetadata()` |

No duplicate title tags detected across audited public routes.

---

## robots & indexability

**`src/app/robots.ts`**

- Allow: `/`
- Disallow: `/admin/`, `/api/`, `/account/`, `/mijn-verbruik/`
- Sitemap: `/sitemap.xml`

**`SEO_NOINDEX_PATH_PREFIXES`:** `/account`, `/admin`, `/mijn-verbruik`

---

## Structured data coverage

| Schema | Where | Status |
|--------|-------|--------|
| Organization | Root layout | ✅ |
| WebSite + SearchAction | Root layout | ✅ |
| SoftwareApplication | Root layout | ✅ |
| FAQPage | `/pricing` | ✅ |
| Article | `/help/[slug]` | ✅ |
| BreadcrumbList | `/help/[slug]` | ✅ |

---

## Performance SEO (code review)

| Area | Status | Notes |
|------|--------|-------|
| Fonts | ✅ | `next/font` Geist with `display: swap` pattern |
| Images | ✅ | Brand icons versioned; OG uses static PNG |
| Video previews | ⚠️ | Universe homepage uses canvas/WebGL; monitor LCP |
| Metadata | ✅ | Server-side via Next.js Metadata API |
| Client bundles | ⚠️ | Heavy product pages; defer non-critical JS |

Recommend running Lighthouse on `/`, `/pricing`, `/help` post-deploy for LCP/CLS/INP baselines.

---

## Social SEO

All `buildPageMetadata` outputs include:

- `openGraph.title`, `description`, `url`, `images` (globe-man)
- `twitter.card: summary`, `title`, `description`, `images`

---

## Landing page gap analysis (report only — no thin pages created)

Keywords that **may** deserve dedicated pages when substantive content exists:

| Proposed path | Primary intent | Recommendation |
|---------------|----------------|----------------|
| `/ai-video-generator` | AI video generator | **Defer** — build when 800+ words + demo + FAQ |
| `/image-to-video` | Image to video AI | **Partial** — Motion page covers; consider alias later |
| `/ai-storyboard-generator` | Storyboard creator | **Defer** — Studio page is close; expand Studio landing first |
| `/ai-subtitles` | AI subtitles | **Defer** — needs feature landing + help cluster |
| `/video-translation` | Video localization | **Defer** — pair with subtitle articles |
| `/ai-voice-over` | AI voice generator | **Defer** — voice help cluster first |
| `/canva-alternative` | Comparison | **Defer** — see `SEO_POSITIONING.md` |
| `/capcut-alternative` | Comparison | **Defer** |
| `/runway-alternative` | Comparison | **Defer** |
| `/vidu-alternative` | Comparison | **Defer** |

**Do not** publish comparison or feature landers until each has unique screenshots, workflow steps, pricing context, and internal links from help + product pages.
