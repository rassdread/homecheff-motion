# SP.1 — Public Website Audit

**Date:** 2026-08-10 · **Read-only**

---

## Auth model (truth)

| Layer | Behavior |
|-------|----------|
| Middleware | **No page auth** — CORS / favicon only (`src/middleware.ts`) |
| Hard login | `/account/*`, `/admin/*`, `/mijn-verbruik` |
| Soft public shells | Studio/Editor/Motion/Publish/Videos load; data/CTAs prompt login |
| Sitemap | 303 public URLs (`SEO_PUBLIC_PATHS`) |

---

## Requested surfaces

| Surface | Path | Access | Verdict |
|---------|------|--------|---------|
| Home | `/` | PUBLIC | Correct |
| Studio | `/studio` | PUBLIC landing | Correct |
| Pricing | `/pricing` | PUBLIC | Correct |
| Experience Packs | Linked `/studio/experience` | **NO ROUTE** | **SHOULD BE PUBLIC — BROKEN** |
| Features | No `/features` | Covered by landings | Optional hub |
| Workflows | `/workflows[+slug]` | PUBLIC | Correct |
| Guides | `/guides[+slug]` | PUBLIC | Correct |
| Industries | `/industries[+slug]` | PUBLIC | Correct |
| Use Cases | `/use-cases[+slug]` | PUBLIC | Correct |
| FAQ | Embedded (`/pricing`, SEO) — no `/faq` | PUBLIC content | Optional dedicated page |
| About | `/about` | PUBLIC | Correct (not in sitemap) |
| Contact | **Missing** | — | **SHOULD BE PUBLIC** |
| SEO hubs | alternatives, locations, … | PUBLIC | Correct |
| Assistant | FAB on allowlist routes | UI public; chat login-gated | Acceptable |
| Documentation | `/help[+slug]` | PUBLIC | Correct (no `/docs`) |
| Login / Signup | `/login`, `/signup` | PUBLIC | Correct |
| Account / Admin / Usage ledger | `/account`, `/admin`, `/mijn-verbruik` | LOGIN | Correct |

---

## Product shells (public HTTP, soft auth)

Studio workspace, Editor, Motion, Publish, Library, Projects, Videos — load without middleware block. Deep CRUD should stay soft-auth / noindex (mostly already noindex for account/admin).

---

## Gaps vs product-understanding law

| Gap | Severity |
|-----|----------|
| Dead `/studio/experience` links from maak/motion/prepare | **High** |
| No `/contact` | Medium |
| `/about` not in sitemap | Low |
| Experience Packs not a marketed SEO/public hub | High for guided product story |
| Rich `UniverseMarketingSections` unused on home | Medium |

---

## Status

**PARTIAL PASS** — SEO/marketing breadth strong; guided Experience Pack public entry broken; contact missing.
