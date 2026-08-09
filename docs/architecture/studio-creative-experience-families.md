# Studio Creative Experience Families (S.6D)

**Status:** Classification only — no redesign  
**Rule:** Family is a taxonomy label, not a new product module.

---

## Canonical families

| Family | What it contains (evidence) |
|--------|-----------------------------|
| **Identity** | Characters, Locations, Props, Worlds; Character Studio hub; asset wizards; consistency/continuity tools |
| **Photo** | Scene still generation; asset reference gen; editor instruction/mask; Instant photo intents; publish photo_story |
| **Video** | 15 Studio video intents; storyboard→Motion; Instant story/transition; Movie Builder motion step |
| **Motion** | Motion hub; 65 action presets; Instant Premium I2V; handoff import; `/videos` gallery |
| **Fusion** | 27 fusion intents; Character Studio fusion/mascot flows; combine workspace |
| **Social** | social_campaign, fashion_reel, Instant social chips, publish social_video, TikTok-oriented presets |
| **Business** | product_commercial, company_video, restaurant_promo, product Fusion intents, insights/production tools |
| **Food / Restaurant / HomeCheff** | cooking_show, restaurant_promo, Instant `food_promo` / food chips, lifestyle cooking presets, SEO food creators |
| **Lifestyle** | travel_vlog, event_video, lifestyle motion presets, vacation-adjacent SEO (marketing only) |
| **Fashion** | fashion_reel intent; fashion_runway preset; outfit Fusion — **not** a dedicated fashion studio |
| **Voice** | Storyboard TTS; character voice; clone; publish voice modes |
| **Audio** | Music/SFX generate + directors; audio mix uploads |
| **Brand** | Brand Kit storage; product_branding / logo_placement Fusion; Editor brand protection (not Prisma BrandKit) |
| **Rendering** | Render tool; Instant progress; full rerender; versions |
| **Publishing** | `/publish` entry modes; Studio export/translate; language export |
| **Story** | Storyboard tools; story architecture; director preferences; brief flow |

---

## Cross-family experiences (multi-label)

| Experience | Families |
|------------|----------|
| Storyboard production | Story + Identity + Photo + Video + Motion |
| Character Studio outfit | Identity + Fusion + Photo |
| Instant food_promo | Motion + Food + Social |
| Fusion product_branding | Fusion + Business + Brand |
| Restaurant promo intent | Video + Business + Food |

---

## Marketing vs product families

SEO `/use-cases/*` and `/workflows/*` are **marketing families**. They route to Studio storyboard create — they are **not** separate generation engines. Do not invent Prompt Matrix modules per SEO slug unless a distinct product experience exists.
