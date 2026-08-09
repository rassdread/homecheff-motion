# S.6G — Consumer Experience Inventory

**Source of truth for discovery.** Nothing invented. SEO marketing is listed but is not an Experience Pack.

---

## 1. Canonical layers

| Layer | Count | Path |
|-------|------:|------|
| S.6F Product / Pack IDs | 51 | `src/lib/studio-creative-director/product-experience-ids.ts` |
| S.6E Matrix engines | 24 | `src/lib/studio-prompt-matrix/experience-ids.ts` |
| Product modes | 3 | QUICK · PROFESSIONAL · DIRECTOR |

---

## 2. App routes that lead to creative media

| Route | Role | Category | Pack / Matrix notes |
|-------|------|----------|---------------------|
| `/create` | Maak chooser | Quick fan-out | Not a pack; opens Story / Instant / Editor / Studio |
| `/maak` | Legacy alias | LEGACY | Redirect → `/` |
| `/studio` | Adaptive Workspace | Director / Story | `CREATIVE_STORYBOARD` · `SCENE_STILL` |
| `/studio/start` | Studio + `?intent=` | Professional / Director | 15 video intents |
| `/studio/workspace`, `/advanced`, `/my-studio` | Shims | LEGACY | → `/studio` |
| `/studio/storyboards/**` | Library / edit / classic | Story | Classic LEGACY |
| `/studio/storyboards/[id]/movie-builder` | Movie Builder | ADVANCED | `CREATIVE_FILM` |
| `/studio/storyboards/[id]/production` | Production Center | ADVANCED | planner `production_center` |
| `/studio/production` | Production hub | ADVANCED | same |
| `/studio/characters/**` | Character library + CS hub | Identity | IDENTITY_* packs |
| `/studio/characters/prepare` | Character Studio flows | Identity / Fusion | 11 flows |
| `/studio/characters/motion-ready` | Motion-ready | Identity / Motion | `IDENTITY_MOTION_READY` |
| `/studio/locations/**`, `/props/**`, `/worlds/**` | Entity libraries | Continuity feed | Not packs |
| `/studio/assets/**` | Asset hub | Library | — |
| `/animate/instant/**` | Instant Premium I2V | Quick / Motion | `CREATIVE_ANIMATION` · `INSTANT_PHOTO_TO_VIDEO` |
| `/animate`, `/animate/[id]` | Legacy animate | LEGACY | `?legacy=1` |
| `/motion/**` | Motion Hub | Quick / Motion | presets → `MOTION_PRESET` |
| `/publish/**` | Publish entry | Publish | `PUBLISH_EXPORT` PARTIAL · ENGINE_ONLY pack |
| `/editor/**` | Edit / morph / fuse redirects | Professional / Fusion | Outfit / mascot doors |
| `/videos/**` | Gallery / versions / rerender | Render | Jobs surface |
| `/library/**`, `/projects` | Library / projects | Support | — |
| `/discover/**` | Discover → Motion CTA | Marketing / Motion | photoIntent |
| `/use-cases/[slug]`, `/workflows/[slug]`, `/guides/[slug]`, `/industries/[slug]`, `/alternatives/[slug]`, `/locations/[slug]` | SEO | Marketing | **Not** pack/Matrix IDs |
| `/hoe-werkt-studio` | Why Studio | Marketing | — |

**Dead:** `/studio/voice` (no page).  
**Assistant:** overlay + `/api/assistant/**` — no dedicated page.

---

## 3. Create / Maak doors

| Card | Target | Pack implication |
|------|--------|------------------|
| New story | `/studio/storyboards/new` | `CREATIVE_STORYBOARD` |
| Photos | `/animate/instant` | `CREATIVE_ANIMATION` |
| Edit | `/editor` | Fusion / morph adjacent |
| Studio library | `/studio/storyboards` | Story |
| Open Studio | `/studio` | Workspace |

Source: `src/components/maak/maak-choice-page.tsx`

---

## 4. Instant

| Kind | IDs | Pack / Matrix |
|------|-----|---------------|
| Styles (3) | `food_promo`, `clean_business`, `social_boost` | HomeCheff / Business portrait / Shorts fans |
| Chips (9) | motion modifiers | Not packs |
| Modes | `transition`, `story` (+ advanced retry) | Motion |
| Animation styles (6) | cartoon / product / character / … | Instant styling |
| Photo intents | `animate_photo`, `bring_photo_to_life`, `photo_to_video` | `CREATIVE_ANIMATION` |

---

## 5. Motion Hub presets (65)

All resolve Matrix `MOTION_PRESET`. Subset also own S.6F entry fans (e.g. `wedding_entrance` → `PEOPLE_WEDDING`, `tiktok_trend` → `SOCIAL_TIKTOK`, `sports_car_arrival` → `BUSINESS_AUTOMOTIVE`).

Full ID list: `motion-action-presets.ts` + `motion-action-presets-expanded.ts`.

---

## 6. Studio video intents (15)

| Intent | Product pack |
|--------|--------------|
| `restaurant_promo` | `BUSINESS_RESTAURANT` |
| `cooking_show` | `BUSINESS_COOKING_SHOW` |
| `social_campaign` | `SOCIAL_CAMPAIGN` |
| `fashion_reel` | `BUSINESS_FASHION` |
| `music_video` | `CREATIVE_MUSIC_VIDEO` |
| `travel_vlog` | `CREATIVE_TRAVEL_VLOG` |
| `product_commercial` | `BUSINESS_COMMERCIAL` |
| `podcast_video` | `CREATIVE_PODCAST` |
| `documentary` | `CREATIVE_DOCUMENTARY` |
| `event_video` | `CREATIVE_EVENT_VIDEO` |
| `presentation_video` | `CREATIVE_PRESENTATION` |
| `brand_story` | `BUSINESS_BRANDING` |
| `company_video` | `BUSINESS_CORPORATE` |
| `slideshow` | **unmapped pack** (Matrix `VIDEO_INTENT`) |
| `photo_story` | **unmapped pack** (Matrix `VIDEO_INTENT`) |

---

## 7. Fusion intents (27) + Character Studio flows (11)

Fusion catalog: `editor-image-fusion-catalog.ts`.  
CS hub: `character-studio-hub.ts` (`/studio/characters/prepare?flow=`).

Owned packs: Outfit, Character fusion, Mascot, Future child, Person background, Logo placement, Motion ready, Product branding cluster.  
Unmapped / ADVANCED: animal fusions, poster compose, product_environment, life_timeline, future_professions, etc.

---

## 8. Publish modes (8)

`ai_everything`, `photo_story`, `slideshow`, `social_video`, `poster`, `flyer`, `voice_message`, `audio_with_image`  
→ Matrix `PUBLISH_EXPORT` · **no** S.6F product pack.

---

## 9. Workspace tools (25)

Includes `creativeDirector` (S.6F). Generation-adjacent: visual, continuity, voice, music, sound, subtitles, translate, export, render, production, movie-adjacent planners.  
Placeholders: voice / music / sound / text / subtitles (thin UI).

---

## 10. Assistant

- 19 actions (`assistant-action-registry.ts`)
- 35 capability tools
- ~37 recommendation chips  
Status: PARTIAL routing — does not replace Director orchestration.

---

## 11. SEO marketing (not packs)

| Hub | ~Count | Typical CTA |
|-----|-------:|-------------|
| Use-cases | 20 | `/studio/storyboards/new` |
| Workflows | ~42 | Open Studio |
| Guides | ~141 | Studio / Instant |
| Industries | 20 | Studio |
| Alternatives | 35 | Studio / guides |
| Locations | 20 | Studio |

---

## 12. Duplicate door summary (many → one owner)

| Canonical pack | Also exposed as |
|----------------|-----------------|
| Outfit | Fusion, CS, morph, assistant |
| Character fusion | Fusion, CS, assistant |
| Instant I2V | Instant, Motion hub, Maak, assistant |
| Mascot | CS, fusion, morphs, assistant |
| Motion-ready | CS, motion-ready route, assistant |
| Video production | 15 intents, `/studio/start`, SEO |
| Publish | Publish modes, Studio export, assistant |

Ownership uniqueness for product `entryFans`: enforced in `product-experience-registry.ts`.
