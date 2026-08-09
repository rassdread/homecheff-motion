# Studio Complete Feature Inventory (Product Truth)

**Read-only.** Visibility = current UX reachability, not importance.

Legend: **LIVE** | **PARTIAL** | **ADVANCED** | **LEGACY** | **EXPERIMENTAL** | **DEAD** | **UNKNOWN**

---

## A. Workspace & navigation

| Name | Surface | Status | Notes |
|------|---------|--------|-------|
| Product landing | `/studio` | LIVE | Deep-link → workspace |
| Authenticated start | `/studio/start` | LIVE | |
| Canonical workspace | `/studio?storyboardId=` | LIVE | S.2 shell |
| Workspace shim | `/studio/workspace` | LEGACY | Redirect |
| Advanced hub | `/studio/advanced` | DEAD/LEGACY | Redirect `/studio` |
| My Studio | `/studio/my-studio` | LEGACY | Redirect |
| Advanced features toggle | localStorage `hc-studio-advanced-features` | ADVANCED | Unlocks links/options |
| Studio account | `/studio/account` | LIVE | |
| Providers panel | `/studio/providers` | LIVE | |
| Production shell | `/studio/production` | ADVANCED | |

## B. Storyboards & scenes

| Name | Surface | Status | Credits | Provider |
|------|---------|--------|---------|----------|
| Storyboard library | `/studio/storyboards` | LIVE | — | — |
| Create (brief) | `/studio/storyboards/new` | LIVE | — | — |
| Metadata edit | `…/edit` | LIVE | — | — |
| Classic editor | `…/classic` | LEGACY | gen paths | OpenAI etc. |
| Movie Builder | `…/movie-builder` | ADVANCED | | |
| Production Center | `…/production` | ADVANCED | | |
| Scene CRUD / reorder / duplicate | workspace + APIs | LIVE | — | — |
| Scene image generate | API + UI | LIVE | scene_generation | OpenAI |
| Bulk generate | jobs / bulk route | PARTIAL/LEGACY | | OpenAI |
| Improve weak scenes | jobs / improve | PARTIAL | scene_generation | OpenAI |
| Consistency / vision analyze | APIs | LIVE | vision costs | OpenAI |
| Corrections | APIs | PARTIAL | — | heuristic + regen |

## C. Identity libraries

| Name | Surface | Status |
|------|---------|--------|
| Characters library / detail / edit | `/studio/characters/**` | LIVE |
| Character Studio hub | `/studio/characters/prepare` | LIVE |
| From reference / motion-ready | wizards | LIVE |
| Advanced create form | `?advanced=1` | ADVANCED |
| Locations / Props / Worlds CRUD | `/studio/*/…` | LIVE |
| Scene attach characters/props/location | workspace | LIVE (manual) |

## D. Assets & S.5 memory

| Name | Surface | Status |
|------|---------|--------|
| Assets hub | `/studio/assets` | LIVE |
| Browse consistency | `/studio/assets/browse` | LIVE |
| Creative memory panel | hub | LIVE |
| Creative projects API | `/api/studio/creative-projects` | LIVE |
| Library assets/search/collections/favorites | `/api/studio/library/**` | LIVE |
| Brand kits API | library | LIVE **storage** |
| Prompt presets API | library | LIVE **storage** |
| Registry sync | `/api/studio/library/sync` | LIVE |
| Virtual StudioAsset registry | loaders | LIVE |

## E. Audio

| Name | Status | Notes |
|------|--------|-------|
| Storyboard voice TTS | LIVE | S.4 VOICE_TTS |
| Character voice preview/clone | LIVE/PARTIAL | Clone not S.4 job |
| Music generate | LIVE | ElevenLabs; not S.4 job |
| SFX generate | LIVE | same |
| Audio library upload | LIVE | |
| Subtitles STT | PARTIAL | tracks; style limited |
| Audio directors (plan) | LIVE planning | rule-based |

## F. Motion / video

| Name | Surface | Status |
|------|---------|--------|
| Motion hub | `/motion` | LIVE |
| Instant Premium I2V | `/animate/instant/**` | LIVE |
| Storyboard handoff import | `/animate/instant/import` | LIVE |
| Videos gallery | `/videos/**` | LIVE |
| Versions / full rerender | `/videos/[id]/…` | ADVANCED |
| Legacy animate | `/animate?legacy=1` | LEGACY |
| Language export / translate | Instant APIs | PARTIAL (Studio embeds) |

## G. Editor / Fusion

| Name | Surface | Status |
|------|---------|--------|
| Editor start | `/editor/start` | LIVE |
| Fusion intelligence wizard | editor + Character Studio | LIVE/CORE |
| Combine workspace | editor | ADVANCED |
| Simulation fusion intents | catalog | EXPERIMENTAL |
| `/editor/fuse`, `/editor/transform` | redirects | LEGACY |
| Instruction variant / mask edit | APIs | LIVE |
| Segmentation / style DNA | APIs | PARTIAL |

## H. Directors (planning)

| Module family | Status |
|---------------|--------|
| AI Director interpret | LIVE (rules) |
| Director V2 UI | PARTIAL/ADVANCED |
| Auto shot planner | LIVE (rules) |
| Music/Sound/Audio/Provider directors | LIVE (rules) |
| Composition / blocking / attention | PARTIAL |

## I. Billing / jobs

| Name | Status |
|------|--------|
| Wallet / packs / Stripe | LIVE |
| StudioGenerationJob (4 wired caps) | LIVE |
| Legacy StudioJob | LEGACY |
| Orphan S.4 capabilities | PARTIAL registry |

## J. Cross-module

| Name | Status |
|------|--------|
| HomeCheff projects hub | LIVE |
| Publish | LIVE |
| Assistant interpret | PARTIAL |
| Showcase / marketing | LIVE |

---

## Totals (approximate, inventory rows)

| Class | Count (order of magnitude) |
|-------|----------------------------|
| LIVE | ~70+ |
| PARTIAL | ~25+ |
| ADVANCED | ~15+ |
| LEGACY | ~15+ |
| EXPERIMENTAL | ~5–10 |
| DEAD (redirect-only) | ~3–5 |

Exact row count is less important than: **identity libraries + storyboard + Motion + Fusion are live DNA**, not roadmap fiction.
