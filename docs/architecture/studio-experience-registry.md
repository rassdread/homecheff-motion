# Studio Experience Registry

Two layers (do not collapse):

1. **S.6E Prompt Matrix registry** — canonical *engine* IDs (`StudioCreativeExperienceId`, 24 IDs).
2. **S.6F Product experience registry** — canonical *product* experiences users choose (`StudioProductExperienceId`, 51 IDs).

Product experiences map onto Matrix engines. Product registry never duplicates Matrix ownership.

---

## S.6F Product registry (Creative Director)

**Source of truth:** `src/lib/studio-creative-director/product-experience-registry.ts`

Every creative experience belongs to **exactly one** family:

| Family | Examples |
|--------|----------|
| PEOPLE | LinkedIn, CV, Business Portrait, Dating, Wedding, Family, Baby, Pregnancy, Christmas, Birthday, Vacation, Red Carpet, Celebrity, Graduation, Memorial |
| BUSINESS | Restaurant, HomeCheff, Product, Real Estate, Automotive, Fashion, Retail, Corporate, Advertisement, Commercial, Branding, Logo Placement, Cooking Show |
| SOCIAL | TikTok, Instagram, Facebook, YouTube, Shorts, Reels, Social Campaign |
| CREATIVE | Storyboard, Film, Documentary, Music Video, Podcast, Presentation, Animation, Travel Vlog, Event Video |
| IDENTITY | Outfit, Character, Mascot, Future Child, Character Fusion, Motion Ready, Person Background |

### Entry fans

Each Instant / door / fan key resolves to **one** product experience (`assertUniqueProductExperienceOwnership`).

### Status honesty

`LIVE` | `PARTIAL` | `ADVANCED` | `LEGACY` | `EXPERIMENTAL` | `MISSING`

MISSING packs (e.g. dating, memorial) stay registered without fake LIVE engines.

### Resolver fields (no prompts)

Experience ID · Family · Creative goal · Required/optional assets · Recommended planners · Continuity requirements · Generation strategy · Provider capabilities · Quick questions

### Expandable / data-driven

New experiences are registry rows (family + Matrix mapping + planners + status). No hardcoded per-experience workflows in the Director Engine. The same resolver → planner → Matrix chain must support hundreds of experiences (People, Business, Lifestyle, Travel, Luxury, Food, Pets, Automotive, Fashion, Real Estate, Sports, Education, Entertainment, Health, Seasonal, Holiday, Events, …).

---

## S.6E Matrix registry (engines)

**Source of truth:** `src/lib/studio-prompt-matrix/experience-ids.ts` + `experience-registry.ts`

Many UI doors → few canonical engines. S.6E size: 24 IDs.

Examples:

| Fans / entry | Canonical Matrix ID |
|--------------|---------------------|
| Fusion outfit / Character Studio outfit | `OUTFIT_CHANGE` |
| restaurant_promo / cooking_show | `RESTAURANT_PROMO` / `COOKING_SHOW` |
| Instant food_promo | `FOOD_PROMO` |
| Motion presets | `MOTION_PRESET` |
| Scene still IMAGE_GENERATE | `SCENE_STILL` |

SEO marketing slugs are **not** product or Matrix experience IDs.

## Migration honesty

Do not claim MATRIX_NATIVE for all experiences because scene stills are wrapped. Compliance is per Matrix registry entry.
