# SEO Niche Internal Linking Strategy

**Product:** HomeCheff Studio  
**Date:** June 2026  
**Goal:** Topic authority + Studio conversion via outcome-driven content graph

**Trademark:** Niche pages must not imply affiliation with Disney, Pixar, DreamWorks, Paramount, Warner Bros, or Netflix. Use outcome-focused anchor text; inspiration guides link with disclaimer only (see `SEO_NICHE_EXPANSION_ROADMAP.md`).

---

## Link architecture

```
/ (homepage)
├── /niches                          → 10 pillar index
│   └── /niches/{pillar}             → Pillar hub (CollectionPage)
│       ├── /guides/{slug}           → Outcome landings
│       ├── /help/{slug}             → Long-tail articles
│       └── /tutorials/{slug}        → HowTo
├── /workflows/{pillar}              → Workflow pillars (existing expansion)
├── /studio · /editor · /animate/instant · /publish · /library · /projects
├── /pricing · /signup · /help
└── /alternatives/{tool}             → Comparison (SMB + creator overlap)
```

---

## Global linking rules

| Rule | Specification |
|------|---------------|
| **Every guide** | 1 niche hub + 1 workflow hub (if overlap) + 2 help + 2 product routes + `/pricing` |
| **Every help** | 1 parent guide + 1 sibling help + 1 Studio deep link |
| **Every tutorial** | Parent guide + HowTo anchor links back to help |
| **Every niche hub** | All P0/P1 guides in pillar + top 3 help + primary Studio CTA |
| **Product pages** | Footer link to relevant `/niches/{pillar}` |
| **Breadcrumbs** | Home → Niches → {Pillar} → Page |

---

## Pillar hub → Studio conversion (primary paths)

| Pillar | Primary Studio CTA | Secondary | Tertiary |
|--------|-------------------|-----------|----------|
| Families & Kids | `/editor/start` | `/studio/characters/new` | `/animate/instant` |
| Authors | `/studio/storyboards/new` | `/studio/worlds` | `/publish` |
| Education | `/studio/storyboards/new` | subtitles help | `/publish` |
| Gaming & RPG | `/studio/worlds` | `/studio/characters/new` | `/animate/instant` |
| Musicians & Artists | `/editor` | `/animate/instant` | `/publish` |
| Small Business | `/editor` → Motion | `/projects` | `/publish` |
| Hobby Communities | `/editor/start` | `/studio/storyboards/new` | Motion |
| Memories | `/editor/start` | voice + Studio narrative | `/publish` |
| Entertainment | `/studio/storyboards/new` | `/studio/characters/new` | `/projects` |
| Community Projects | `/projects` | `/studio/storyboards/new` | `/publish` |

---

## Cross-pillar linking (high-value bridges)

| From pillar | To pillar | Anchor example | Guide link |
|-------------|-----------|----------------|------------|
| Families | Memories | “Turn old photos into family stories” | `family-story-video` |
| Families | Entertainment | “Grow into a full cartoon series” | `create-your-own-cartoon` |
| Authors | Entertainment | “From book to animated pitch” | `story-to-video` |
| Authors | SMB | “Market your book like a brand” | `author-book-launch-video` |
| Education | Entertainment | “Student animation projects” | `animated-school-project` |
| Gaming | Authors | “Lore like a fantasy novel” | `lore-video-creator` |
| Gaming | Hobby | “Tabletop meets LEGO storytelling” | `miniature-storytelling` |
| Musicians | SMB | “Promote your release like a business” | `music-release-social-clips` |
| SMB | Families | “Local family restaurant stories” | `restaurant-promo-video` |
| Memories | Community | “Club history projects” | `local-history-community-video` |
| Hobby | Gaming | “Build worlds for RPG and hobbies” | `fantasy-world-video` |
| Entertainment | All | “Your film studio for any niche” | `create-your-own-film-studio` |

---

## Guide → internal link matrix (P0 landings)

### Families & Kids

| Guide | Required internal links |
|-------|-------------------------|
| `child-drawing-to-animation` | `/editor/start`, `/animate/instant`, `/help/animate-child-drawing`, `/guides/personalized-childrens-story`, `/pricing` |
| `create-a-cartoon-from-a-drawing` | `/studio/characters/new`, `/library`, `/help/cartoon-from-drawing`, `/guides/create-your-own-cartoon` |
| `personalized-childrens-story` | `/studio/storyboards/new`, `/help/personalized-childrens-story`, voice help, `/publish` |

### Authors

| Guide | Required links |
|-------|----------------|
| `book-to-trailer` | `/studio/storyboards/new`, `/publish`, `/help/create-book-trailer`, `/pricing` |
| `story-to-video` | `/studio/storyboards/new`, `/help/story-to-video-steps`, `/guides/visualize-your-novel` |
| `visualize-your-novel` | `/studio/worlds`, `/help/visualize-fantasy-world`, `/studio/characters/new` |

### SMB

| Guide | Required links |
|-------|----------------|
| `product-photo-to-video` | `/editor`, `/animate/instant`, `/help/product-photo-to-video`, `/projects` |
| `social-content-with-ai` | `/projects`, `/help/social-content-ai`, `/guides/ai-marketing-team` |
| `ai-marketing-team` | `/studio`, `/publish`, `/alternatives/canva`, `/pricing` |

### Entertainment

| Guide | Required links |
|-------|----------------|
| `create-your-own-cartoon` | `/studio/characters/new`, `/guides/create-your-own-animated-series`, `/help/start-your-cartoon` |
| `become-your-own-director` | `/studio/storyboards/new`, `/help/become-a-director-ai`, `/guides/animation-studio-workflow-inspiration` |
| `create-your-own-animated-series` | `/projects`, `/library`, `/help/animated-series-setup` |

---

## Help article linking template

Each help article includes:

1. **Breadcrumb** → niche hub  
2. **Related guide** (1) — prominent box at top  
3. **Next steps** (2) — sibling help articles  
4. **Studio CTA** — pillar-specific route  
5. **Production line** — 8-step mini-diagram with links  

Example (`animate-child-drawing`):

- ↑ `/guides/child-drawing-to-animation`  
- → `/help/cartoon-from-drawing`, `/help/make-story-from-drawing`  
- CTA → `/editor/start`

---

## Homepage & nav integration (planned)

| Surface | Addition |
|---------|----------|
| Homepage | “Who is HomeCheff for?” → 10 niche cards |
| Help home | Niche category sections |
| Footer | `Niches` column: top 6 pillars |
| Studio intro | Contextual niche CTA by referrer (`?from=niche-families`) |

---

## Comparison page bridges

| Niche | Comparison page | Why |
|-------|-----------------|-----|
| SMB | `/alternatives/canva` | Design-tool refugees |
| SMB | `/alternatives/capcut` | Social editors |
| Entertainment | `/alternatives/runway` | Clip vs studio |
| Authors | `/alternatives/invideo` | Template video |
| Families | — | Avoid tool comparison; stay outcome-focused |
| Memories | — | Emotional; no competitor CTA |

---

## Anchor text guidelines

| Do | Don't |
|----|-------|
| “animate your child’s drawing in Studio” | “click here” |
| “book trailer storyboard” | “HomeCheff HomeCheff HomeCheff” |
| “D&D world in Studio worlds” | exact-match spam to same URL 5× on one page |

---

## UTM & attribution

| Parameter | Value pattern |
|-----------|---------------|
| `utm_source` | `seo` |
| `utm_medium` | `niche` |
| `utm_campaign` | `{pillar}-{slug}` |

Track: guide → Studio CTR, help → signup, niche hub → pricing.

---

## Sitemap priority (when published)

| URL pattern | priority |
|-------------|----------|
| `/niches` | 0.85 |
| `/niches/{pillar}` | 0.8 |
| P0 `/guides/*` | 0.75 |
| P1 `/guides/*` | 0.7 |
| `/help/*` (niche) | 0.6 |
| `/tutorials/*` | 0.55 |

---

## Linking acceptance checklist

| Criterion | Target |
|-----------|--------|
| Orphan guides | 0 |
| Avg internal links per guide | ≥8 |
| Guides linking to Studio | 100% |
| Cross-pillar links per hub | ≥4 |
| Help → guide backlink | 100% |

---

## Related docs

- `SEO_NICHE_EXPANSION_ROADMAP.md` — pillar definitions  
- `SEO_NICHE_KEYWORD_MAP.md` — all slugs  
- `SEO_NICHE_CONTENT_CALENDAR.md` — publish order  
- `INTERNAL_LINKING_AUDIT.md` — current site health  
- `SEO_COMPARISON_ALTERNATIVE_ROADMAP.md` — tool comparisons
