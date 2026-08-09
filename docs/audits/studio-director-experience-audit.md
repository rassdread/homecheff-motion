# Studio Director Experience Audit (S.6F)

**Date:** 2026-08-09  
**Sources:** S.6D registry, video intents, Fusion catalog, Character Studio hub, Motion presets, feature inventory  
**Note:** SEO marketing pages ≠ engines. Canonical engines listed here.

---

## 1. Quick experiences (beginner doors)

| Experience theme | Existing engine | Status | S.6E canonical ID (approx) |
|------------------|-----------------|--------|----------------------------|
| Restaurant promotion | video intent `restaurant_promo` | **LIVE** | RESTAURANT_PROMO |
| Cooking / recipe | `cooking_show` | **LIVE** | COOKING_SHOW |
| Food promo (Instant) | Instant style `food_promo` | **LIVE** | FOOD_PROMO |
| Social / TikTok / IG campaign | `social_campaign` + Motion social presets | **LIVE** | SOCIAL_CAMPAIGN / MOTION_PRESET |
| Fashion reel | `fashion_reel` | **LIVE** | FASHION_REEL |
| Product commercial | `product_commercial` | **LIVE** | VIDEO_INTENT |
| Brand / company story | `brand_story`, `company_video` | **LIVE** | VIDEO_INTENT |
| Documentary | `documentary` | **LIVE** | VIDEO_INTENT |
| Travel / vacation vlog | `travel_vlog` + adventure presets | **PARTIAL** (no vacation pack) | VIDEO_INTENT / MOTION_PRESET |
| Event / wedding video | `event_video` + preset `wedding_entrance` | **PARTIAL** (no wedding photo pack) | VIDEO_INTENT / MOTION_PRESET |
| Birthday | Motion `birthday_celebration` | **PARTIAL** | MOTION_PRESET |
| Presentation / business | `presentation_video` + business presets | **LIVE** planning / **PARTIAL** motion | VIDEO_INTENT / MOTION_PRESET |
| Podcast clip | `podcast_video` + preset `podcast_clip` | **LIVE** planning / **PARTIAL** motion | VIDEO_INTENT / MOTION_PRESET |
| Music video | `music_video` | **LIVE** | VIDEO_INTENT |
| Photo→video / animate photo | Instant photo intents | **LIVE** | INSTANT_PHOTO_TO_VIDEO |
| Slideshow / photo story | `slideshow`, `photo_story` | **LIVE** | VIDEO_INTENT |
| Outfit try-on | Fusion `outfit_from_reference` / CS outfit; alias `person_outfit` | **LIVE** (+ **LEGACY** alias) | OUTFIT_CHANGE |
| Character fusion | Fusion + CS | **LIVE** | CHARACTER_FUSION |
| Mascot transform | CS / Fusion mascot intents + 5 mascot presets | **LIVE** engine; **S.6E resolver gap** (often `LEGACY_UNMAPPED` / capability fallback) | under-mapped |
| Logo placement | CS `logo_placement` → `product_branding` | **LIVE** | PRODUCT_BRANDING |
| Product branding / packaging | Fusion product_* | **LIVE** | PRODUCT_BRANDING |
| Pet / animal fusion | Fusion animal_* / pet_customization | **PARTIAL** (ADVANCED) | typically LEGACY_UNMAPPED / CHARACTER_FUSION |
| Future child / genetic blend | Fusion sims | **PARTIAL** (EXPERIMENTAL) | FUSION_EXPERIMENTAL |
| How will I look / future professions / future_home | Fusion sims | **PARTIAL** (EXPERIMENTAL) | FUSION_EXPERIMENTAL |
| Sports Motion | Motion sports presets (~15) | **LIVE** | MOTION_PRESET |
| Lifestyle / comedy / dance Motion | preset buckets | **LIVE** | MOTION_PRESET |
| Clean business Instant | Instant style `clean_business` | **PARTIAL** as LinkedIn/CV stand-in (no portrait pack ID) | INSTANT_* / PERSON_BACKGROUND adjacent |
| Social boost Instant | Instant style `social_boost` | **LIVE** | INSTANT_* |
| Luxury | presets `luxury_entrance`, moods; product_family `"luxury"` | **PARTIAL** | MOTION_PRESET |
| Automotive | preset `sports_car_arrival` only | **PARTIAL** | MOTION_PRESET |
| LinkedIn / CV / business portrait | Instant business + `person_background` + SEO | **PARTIAL** (no dedicated portrait engine) | PERSON_BACKGROUND / VIDEO_INTENT |
| Dating profile photo | — | **MISSING** | — |
| Baby photo pack | only sim age option on `future_child` | **MISSING** | — |
| Christmas / holiday photo pack | product_family `"holiday"` / church SEO only | **MISSING** | — |
| Family photo pack | Motion `group_photo`; sims — not a family pack | **PARTIAL** | MOTION_PRESET |
| Real estate product experience | SEO/workflows only; `future_home` sim adjacent | **MISSING** (product) | — |
| YouTube long-form dedicated | long-form planner | **PARTIAL** | — |
| HomeCheff | Brand DNA + food/mascot paths — **no** `HOMECHEFF_*` experience ID | **LIVE** brand / no topic ID | food IDs above |

**Quick truth:** Strong on video intents + Instant/Motion + outfit/food/social/sports. Weak/missing on lifestyle portrait packs (dating, baby, Christmas, dedicated LinkedIn-CV, real estate). Mascot is LIVE in product but under-mapped in S.6E `resolveCanonicalExperienceId`.

---

## 2. Professional experiences (business workflows)

| Workflow | Engines | Status |
|----------|---------|--------|
| Marketing / social campaign | `social_campaign`, Instant social, Fusion campaign_variant | **LIVE** |
| Branding / product | Fusion product_branding/packaging/family, logo placement | **LIVE** |
| Restaurant / HomeCheff / cooking | restaurant_promo, cooking_show, food_promo, Food Matrix modules | **LIVE** |
| Corporate / company | company_video, presentation_video, business Motion presets | **LIVE** |
| Documentary / commercial tone | documentary, product_commercial + director profiles | **LIVE** |
| Agency multi-asset | Production Center + library + Fusion variants | **ADVANCED** / **PARTIAL** |
| Education | director profile `educational`; no dedicated intent | **PARTIAL** |
| Identity-managed campaigns | Characters/Locations/Props/Worlds + scene stills + handoff | **LIVE** |
| Voice / music professional | Voice TTS/clone, music/SFX directors + generate | **LIVE** / **PARTIAL** |
| BrandKit-driven generation | Storage only | **PARTIAL** (not gen-wired) |

---

## 3. Director experiences (advanced creators)

| Surface | Capabilities | Status |
|---------|--------------|--------|
| Director V2 panel | Camera, emotion, voice, music, advanced sections | **LIVE** |
| Auto Shot + proposals | Arc-aware recommendations, apply/compare | **LIVE** |
| Movie Builder | Multi-step movie readiness / planning | **ADVANCED** |
| Production Center | Checklist, readiness, production report | **ADVANCED** |
| Classic editor | Legacy full composer | **LEGACY** (kept) |
| Fusion intelligence | Blueprint / preserve / multi-ref | **LIVE** / **ADVANCED** |
| World planning | World CRUD + continuity rules | **LIVE** |
| Character / scene planning | Libraries + scene attach + blocking/composition directors | **LIVE** / **PARTIAL** |
| Continuity / vision / consistency | Analyze + corrections | **LIVE** / **PARTIAL** |
| Render / batch planning | Render strategy/batch planners | **ADVANCED** |
| Voice planning | Voice directors + identity + library | **LIVE** |
| Provider planning | Assignment + execution directors | **PARTIAL** (≠ runtime truth) |
| Creative review | Pre-handoff review | **ADVANCED** |
| Long-form planning | Duration → scene structure | **PARTIAL** |

---

## 4. User journey — where Director participates

```
Idea
  → Quick questions / intent / assistant          ← Director policy (defaults)
  → CreativeSpecification                        ← Matrix (Director supplies selections)
  → ContinuityBundle                             ← Continuity (Director must not own)
  → Prompt Matrix                                ← assemble
  → Provider Transform                           ← provider-specific
  → Generation                                   ← jobs
  → Review                                       ← Director / creative review
  → Export / Publish                             ← planners + publish modes
```

| Stage | Director role |
|-------|----------------|
| Idea / Quick questions | Suggest experience + defaults |
| Spec assembly | Provide creative fields/selections |
| Continuity | Read-only awareness (IDs/strength) |
| Matrix | Consumer of Director outputs |
| Transform / Generation | None (out of band) |
| Review / replan | Core Director mode |
| Export / Publish | Production planners advise |

---

## 5. Mode placement of experiences

| Mode | Best-fit experiences |
|------|----------------------|
| Quick | Intents, Instant, Motion presets, CS prepare cards, assistant starts |
| Professional | Workspace tools, entity attach, Fusion LIVE, audio directors, scene stills |
| Director | Proposals, Movie Builder, Production Center, creative review, multi-scene arc |
