# Studio Creative Experience Registry (S.6D)

**Canonical registry.** Status: LIVE | PARTIAL | ADVANCED | LEGACY | EXPERIMENTAL | DEAD | UNKNOWN  
**Entries:** Distinct user-facing experiences (grouped where identical).

Columns: Name · Category · Primary Route · Entry · Status · Continuity · Job · Provider

---

## A. Storyboard / Studio core

| Name | Cat | Route / Entry | Status | Cont. | Job | Provider |
|------|-----|---------------|--------|-------|-----|----------|
| Studio landing / workspace | Story | `/studio`, `/studio?storyboardId=` | LIVE | Partial | — | — |
| Storyboard library / new / edit | Story | `/studio/storyboards/**` | LIVE | Yes | — | — |
| Scene still generate | Photo | workspace visual / API scenes/.../images | LIVE | Partial | IMAGE_GENERATE | OpenAI |
| Bulk scene generate | Photo | bulk / StudioJob | PARTIAL/LEGACY | Partial | StudioJob | OpenAI |
| Improve weak scenes | Photo | improve APIs / jobs | PARTIAL | Partial | billed scene | OpenAI |
| Consistency / vision / continuity tools | Identity | workspace tools | LIVE/PARTIAL | Partial | — | OpenAI vision |
| Video production intents (15) | Video | `/studio/start?intent=` | LIVE | Yes* | later Motion | plan→Vidu |
| Movie Builder | Story/Render | `…/movie-builder` | ADVANCED | Yes | mixed | OpenAI/Vidu |
| Production Center | Business | `…/production`, `/studio/production` | ADVANCED | Yes | mixed | mixed |
| Classic editor | Story | `…/classic` | LEGACY | Partial | mixed | mixed |
| Workspace shims (advanced/my-studio/workspace) | — | redirects | DEAD/LEGACY | — | — | — |

\*Continuity when user attaches entities; intents alone do not auto-create ContinuityBundle.

### Video intents (each is an experience)

`music_video`, `travel_vlog`, `product_commercial`, `social_campaign`, `podcast_video`, `restaurant_promo`, `cooking_show`, `fashion_reel`, `documentary`, `event_video`, `presentation_video`, `slideshow`, `photo_story`, `brand_story`, `company_video` — all **LIVE** planning → storyboard; director/duration defaults; Continuity **Yes** if entities linked.

---

## B. Identity libraries & Character Studio

| Name | Cat | Entry | Status | Cont. | Provider |
|------|-----|-------|--------|-------|----------|
| Characters / Locations / Props / Worlds CRUD | Identity | `/studio/{characters,locations,props,worlds}/**` | LIVE | Yes | — |
| Asset wizards (4 kinds) | Identity | `/new`, brief wizards | LIVE | Yes | OpenAI refs |
| Asset reference generate | Photo/Identity | API asset-references/generate | LIVE | Partial | OpenAI |
| CS hub: full_body | Identity/Motion | motion-ready?flow=full_body | LIVE | Partial | OpenAI |
| CS hub: outfit | Fusion | prepare?flow=outfit | LIVE | Partial | OpenAI |
| CS hub: character_upgrade | Fusion | prepare?flow=character_upgrade | LIVE | Partial | OpenAI |
| CS hub: mascot_transform / human_to_mascot / mascot_to_human | Identity | prepare?flow=… | LIVE | Partial | OpenAI |
| CS hub: character_fusion | Fusion | prepare?flow=character_fusion | LIVE | Partial | OpenAI |
| CS hub: future_child / genetic_blend | Identity | prepare?flow=… | EXPERIMENTAL | Partial | OpenAI |
| CS hub: motion_ready | Motion/Identity | `/studio/characters/motion-ready` | LIVE | Partial | OpenAI |
| CS hub: logo_placement | Brand/Business | prepare?flow=logo_placement | LIVE | Partial | OpenAI |
| From-reference character | Identity | `/studio/characters/from-reference` | LIVE | Yes | OpenAI vision |

---

## C. Fusion intents (27)

| id | Status | Cont. | Notes |
|----|--------|-------|-------|
| outfit_from_reference | LIVE | Partial | Intelligence |
| person_outfit | LEGACY | Partial | Alias → outfit |
| character_fusion | LIVE | Partial | Intelligence |
| character_upgrade | LIVE | Partial | Intelligence |
| human_into_mascot / mascot_into_human | LIVE | Partial | Intelligence |
| animal_human_fusion | LIVE | Partial | Intelligence |
| animal_fusion / pet_customization / fantasy_creature | ADVANCED | No/Partial | Non-intelligence |
| product_branding / packaging / family | LIVE | Partial | Intelligence |
| product_environment | ADVANCED | Partial | |
| ad_composition / social_media_visual / poster_composition | ADVANCED | Partial | |
| campaign_variant | LIVE | Partial | Intelligence |
| person_background | LIVE | Partial | Intelligence |
| life_timeline / genetic_blend / future_child | EXPERIMENTAL | Partial | Simulation flags |
| how_will_i_look / future_professions / future_home | EXPERIMENTAL | Partial/No | Often admin_only |
| multiple_references / custom_composition | LEGACY | No | Advanced/admin compose |

**Job:** FUSION_RENDER when via fusion/render. **Provider:** OpenAI.

---

## D. Motion / Instant / Video gallery

| Name | Cat | Entry | Status | Cont. | Job | Provider |
|------|-----|-------|--------|-------|-----|----------|
| Motion hub | Motion | `/motion` | LIVE | Partial | — | — |
| Instant Premium I2V | Motion | `/animate/instant` | LIVE | Partial | VIDEO_GENERATE on jobs/start | Vidu |
| Instant modes transition/story/retry/full_rerender | Motion | query mode= | LIVE/ADVANCED | Partial | mixed | Vidu |
| Photo intents animate_photo / bring_photo_to_life / photo_to_video | Motion | photoIntent= | LIVE | Partial | | Vidu |
| Motion presets (65) | Motion | `?preset=` | LIVE | Partial | | Vidu |
| Instant styles food_promo / clean_business / social_boost | Motion | Instant UI | LIVE | Partial | | Vidu |
| Instant chips (9) | Motion | Instant UI | LIVE | Partial | | Vidu |
| Storyboard→Instant import | Motion | `/animate/instant/import` | LIVE | Partial | | Vidu |
| Videos gallery / versions / full rerender | Render | `/videos/**` | LIVE/ADVANCED | Partial | | Vidu/ffmpeg |
| Legacy animate | Motion | `/animate?legacy=1` | LEGACY | Partial | | |

### Motion preset buckets (experience groups)

sports(15), business(10), social(10), adventure(9), lifestyle(6), comedy(5), dance(5), mascots(5) — each preset ID is a selectable experience card.

---

## E. Audio / Voice / Subs / Translate

| Name | Status | Cont. | Job | Provider |
|------|--------|-------|-----|----------|
| Storyboard voice TTS | LIVE | Partial | VOICE_TTS | ElevenLabs |
| Character voice preview/clone | LIVE/PARTIAL | Yes (char) | Clone: no S.4 | ElevenLabs |
| Music generate | LIVE | No | no S.4 | ElevenLabs |
| SFX generate | LIVE | No | no S.4 | ElevenLabs |
| Subtitles STT | PARTIAL | No | no S.4 | ElevenLabs |
| Translate / language export | PARTIAL | No | Instant | OpenAI+export |
| `/studio/voice` assistant deep link | DEAD | — | — | no page |

---

## F. Editor (non-Fusion)

| Name | Status | Cont. | Provider |
|------|--------|-------|----------|
| Editor start / Instruction Studio | LIVE | Partial | OpenAI |
| Masked edit / replace | LIVE | Partial | OpenAI |
| Instruction variant (+ bulk) | LIVE | Partial | OpenAI |
| Morph actions (19) | LIVE/PARTIAL | Partial | OpenAI |
| Combine workspace | ADVANCED | Partial | OpenAI |
| `/editor/fuse`, `/editor/transform` | LEGACY | — | redirects |

---

## G. Publish / Export / Projects / Library

| Name | Status | Cont. |
|------|--------|-------|
| Publish entries (ai_everything, photo_story, slideshow, social_video, poster, flyer, voice_message, audio_with_image) | LIVE/PARTIAL | No |
| Studio export / versions tools | LIVE/ADVANCED | Partial |
| Projects hub | LIVE | No |
| Assets hub / S.5 creative memory | LIVE | Index only |
| Brand Kit / Prompt Preset APIs | LIVE storage | No gen |

---

## H. Assistant / Maak / SEO

| Name | Status | Notes |
|------|--------|-------|
| Assistant actions (19) + tools (45) | PARTIAL | Routing/PLAN; not all auto-exec |
| Recommendation chips (~35) | PARTIAL | Launchers |
| `/create`, `/maak` chooser | LIVE | Entry fan-out |
| SEO use-cases (20) + workflows (42) | LIVE marketing | CTA → storyboard; **not** unique engines |

---

## Counts by status (approximate distinct experiences)

| Status | Count (order) |
|--------|----------------|
| LIVE | ~120+ (incl. 65 presets + 15 intents + fusion LIVE + tools) |
| PARTIAL | ~40+ |
| ADVANCED | ~20+ |
| LEGACY | ~10+ |
| EXPERIMENTAL | ~8+ |
| DEAD | ~5 (redirects + missing `/studio/voice`) |
| UNKNOWN | <5 |

Exact enumeration of every preset ID is in code (`motion-action-presets*.ts`); registry treats each preset as LIVE Motion experience.
