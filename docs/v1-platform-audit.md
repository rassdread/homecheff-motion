# HomeCheff V1 Platform Audit

Generated: 2026-06-05 — codebase as source of truth.

## Executive Summary

HomeCheff is a **production-focused AI motion studio** (Motion + Studio) with admin ops and billing instrumentation. It is **not** yet a full marketplace/creator discovery platform. Core render and storyboard flows are **PARTIAL–COMPLETE**; ecosystem marketing surfaces were **PARTIAL** (fixed in Phase 2 homepage). Version Center, marketplace, and Director V2 advanced sections remain **missing or PARTIAL**.

**V1 Completeness Score: 62/100**

| Area | Score | Status |
|------|-------|--------|
| Motion wizard & render | 75 | PARTIAL–COMPLETE |
| Studio storyboards | 80 | PARTIAL–COMPLETE |
| Video library | 70 | PARTIAL |
| Render recovery | 85 | COMPLETE (a5c0099) |
| Billing transparency | 55 | PARTIAL |
| Admin ops | 65 | PARTIAL |
| Homepage / ecosystem UX | 70 | IMPROVED (Phase 2) |
| Marketplace / Discover | 10 | UNUSED / roadmap |
| Version Center | 20 | MISSING |
| Director V2 (voice/music/sound/text) | 35 | PARTIAL (Phase 1 only) |
| Mobile polish | 50 | PARTIAL |

---

## Route Inventory (~42 pages)

### Public / Marketing
| Route | Status | Notes |
|-------|--------|-------|
| `/` | COMPLETE | Ecosystem homepage (Phase 2) |
| `/discover` | PARTIAL | Roadmap placeholder, links to Motion/Studio |
| `/create` | COMPLETE | Motion vs Studio hub |
| `/pricing` | PARTIAL | Explains credits; links `/mijn-verbruik` |
| `/about` | COMPLETE | Ecosystem story |
| `/login`, `/signup` | COMPLETE | Auth entry |

### Motion
| Route | Status | Notes |
|-------|--------|-------|
| `/animate/instant` | PARTIAL | Main wizard — needs beginner/expert cleanup (Phase 3) |
| `/animate/instant/progress` | PARTIAL | Render recovery integrated |
| `/animate/instant/success` | PARTIAL | Inconsistent with detail page |
| `/animate/instant/import` | COMPLETE | Studio handoff |
| `/animate`, `/animate/[id]` | DEPRECATED? | Legacy; verify usage |

### Studio
| Route | Status | Notes |
|-------|--------|-------|
| `/studio` | COMPLETE | Hub |
| `/studio/storyboards/*` | COMPLETE | CRUD + editor + production + movie-builder |
| `/studio/characters/*`, `/locations/*`, `/props/*`, `/worlds/*` | COMPLETE | Asset management |
| `/studio/assets`, `/providers` | COMPLETE | |

### Videos
| Route | Status | Notes |
|-------|--------|-------|
| `/videos` | COMPLETE | Project list |
| `/videos/[id]` | PARTIAL | Detail + recovery cards overlap |
| `/videos/[id]/edit-version` | PARTIAL | No unified Version Center |
| `/videos/[id]/versions` | MISSING | Phase 5 |

### Billing
| Route | Status | Notes |
|-------|--------|-------|
| `/mijn-verbruik` | PARTIAL | Works; low discoverability |

### Admin
| Route | Status | Notes |
|-------|--------|-------|
| `/admin` | PARTIAL | Ops hub |
| `/admin/users` | PARTIAL | User management |
| `/admin/invites` | COMPLETE | |
| `/admin/render-analytics` | PARTIAL | Improving; needs deep links |

---

## Classification by Product Area

### Homepage — COMPLETE (after Phase 2)
- Entry: `/` ecosystem hero, not auto-redirect to Motion
- Nav: Discover, Create, Studio, Motion, Videos, Pricing, About + Login/Get Started

### Marketplace — UNUSED
- No discover feeds, profiles, or categories
- `/discover` documents roadmap

### Studio — PARTIAL–COMPLETE
- Storyboards, scenes, characters, voice profiles, music/sound fields in DB
- Director V2 Phase 1 behind `NEXT_PUBLIC_STUDIO_DIRECTOR_V2`
- Movie builder, production mode exist

### Motion — PARTIAL
- Full wizard on `/animate/instant`
- Duplicate settings panels, beginner flow not separated

### Billing — PARTIAL
- `CustomerBillingEvent`, `ProviderCostEvent`, `ProviderUsageLog` exist
- Studio scene image costs not fully in user-facing usage
- Admin render analytics improving

### Admin — PARTIAL
- APIs exist without UI for some ops
- Tables need clickable project/video/user links (Phase 8)

### Render Recovery — COMPLETE
- Cancel, retry, repair, refresh-provider-status (local cancel; no Vidu API)

---

## Duplicates & Inconsistencies

1. **Recovery UI overlap** on `/videos/[id]`: `RenderActivityStatusCard`, `InstantFinalProgressPanel`, `InstantVideoRepairCard`
2. **Legacy `/animate` routes** vs `/animate/instant`
3. **nav.myVideos** vs route `/videos` (label now "Videos")
4. **HomeGarden/HomeDesigner** — brand only, no product routes
5. **Director panels** — legacy Prompt/Image tabs + V2 Compose tab when flag on

---

## Priority Backlog

### P0 — Ship blockers / trust
1. Version Center `/videos/[id]/versions` (Phase 5)
2. Motion wizard beginner/expert modes (Phase 3)
3. Billing UX — user-visible costs per video (Phase 7)
4. Consolidate recovery UI on video detail (Phase 3/6 polish)

### P1 — Product coherence
5. Director V2 Voice/Music/Sound/Text sections (Phase 4)
6. Admin clickable tables + deep links (Phase 8)
7. Mobile overflow fixes Motion/Studio (Phase 10)
8. Progress/success screen consistency (Phase 3)

### P2 — Growth
9. Marketplace MVP (profiles, public storyboards)
10. HomeGarden/HomeDesigner product hubs
11. Provider cancel API when available
12. Studio scene image costs in usage dashboard

### P3 — Cleanup
13. Remove/redirect legacy `/animate` routes
14. Dead components audit (Phase 9)
15. Unused Prisma models review

---

## Top 20 Next Improvements

1. Version Center with compare/restore/download
2. Motion beginner flow (upload → storyboard → text → render)
3. Director V2 voice identity per character
4. Director V2 music mood preview
5. Director V2 V46 text beats editor
6. Unified video detail actions (single recovery card)
7. `/mijn-verbruik` linked from nav when logged in
8. Admin render analytics → project/video links
9. Thumbnails in admin tables
10. Mobile nav drawer for 7+ items
11. Success screen matches video detail
12. Pricing page with real tier numbers when defined
13. Discover marketplace MVP
14. Legacy route deprecation pass
15. Studio→Motion handoff analytics
16. Provider actual credits after cancel
17. Full rerender drafts in Version Center
18. Language exports tab in Version Center
19. Expert mode shows all wizard panels
20. Performance: unused component removal

---

## Open Points

- Vidu provider cancel not available — document in UI ✓
- `NEXT_PUBLIC_STUDIO_DIRECTOR_V2` off by default in production
- No breaking schema changes planned for V1 UX sprint
