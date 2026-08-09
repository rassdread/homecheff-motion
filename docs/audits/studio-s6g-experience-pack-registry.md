# S.6G — Experience Pack Registry

**Definition:** An Experience Pack is a curated consumer (or pro) workflow on top of existing architecture — not a new engine.

**Canonical owner:** `StudioProductExperienceId` (S.6F)  
**Engine:** `StudioCreativeExperienceId` (S.6E Matrix)  
**Orchestration:** Creative Director (`orchestrateCreativeDirector`)  
**Identity:** ContinuityBundle  

Code SoT today: `src/lib/studio-creative-director/product-experience-registry.ts`  
Architecture: `docs/architecture/studio-experience-packs.md`

---

## Schema (every pack)

| Field | Source |
|-------|--------|
| Experience ID | `experienceId` |
| Display Name | `label` |
| Category / Family | `family` |
| Current Status | `status` |
| Required / Optional Assets | `requiredAssets` / `optionalAssets` |
| Creative Goal | `creativeGoal` |
| Target User | inferred from `supportedModes` (Quick / Pro / Director) |
| Quick Questions | `quickQuestions` |
| Continuity Requirements | `continuityRequirements` |
| Creative Director Planners | `recommendedPlanners` |
| Prompt Matrix Experience | `matrixExperienceId` |
| Provider Capabilities | `providerCapabilities` |
| Generation Strategy | `generationStrategy` |
| Workspace Entry | Adaptive Workspace + mode policy |
| Assistant Entry | chips/actions that fan to same `entryFans` |
| Legacy Mapping | `entryFans` + `DOOR_ALIASES` |
| Future Expansion | registry row only — data-driven |

Output types / credit category remain owned by GenerationJobs / credits — packs must not redefine billing.

---

## Pack catalog (51)

### PEOPLE — “\* Studio” product names

| Pack ID | Display (product name) | Status | Matrix | Coach pack |
|---------|------------------------|--------|--------|------------|
| `PEOPLE_LINKEDIN_PHOTO` | LinkedIn Studio | PARTIAL | `PERSON_BACKGROUND` | YES |
| `PEOPLE_CV_PHOTO` | CV Studio | PARTIAL | `PERSON_BACKGROUND` | YES |
| `PEOPLE_BUSINESS_PORTRAIT` | Business Portrait Studio | PARTIAL | `PERSON_BACKGROUND` | YES |
| `PEOPLE_DATING_PROFILE` | Dating Studio | MISSING | `LEGACY_UNMAPPED` | YES (advisory only) |
| `PEOPLE_WEDDING` | Wedding Studio | PARTIAL | `VIDEO_INTENT` | YES |
| `PEOPLE_FAMILY` | Family Studio | PARTIAL | `MOTION_PRESET` | fallback |
| `PEOPLE_BABY` | Baby Studio | MISSING | `FUSION_EXPERIMENTAL` | fallback |
| `PEOPLE_PREGNANCY` | Pregnancy Studio | MISSING | `LEGACY_UNMAPPED` | fallback |
| `PEOPLE_CHRISTMAS` | Christmas Studio | MISSING | `LEGACY_UNMAPPED` | fallback |
| `PEOPLE_BIRTHDAY` | Birthday Studio | PARTIAL | `MOTION_PRESET` | fallback |
| `PEOPLE_VACATION` | Vacation Studio | PARTIAL | `VIDEO_INTENT` | fallback |
| `PEOPLE_RED_CARPET` | Red Carpet / Luxury adjacent | PARTIAL | `MOTION_PRESET` | fallback |
| `PEOPLE_CELEBRITY` | Celebrity Look | EXPERIMENTAL | `FUSION_EXPERIMENTAL` | fallback |
| `PEOPLE_GRADUATION` | Graduation Studio | PARTIAL | `MOTION_PRESET` | fallback |
| `PEOPLE_MEMORIAL` | Memorial Studio | MISSING | `LEGACY_UNMAPPED` | fallback |

### BUSINESS

| Pack ID | Display | Status | Matrix | Coach |
|---------|---------|--------|--------|-------|
| `BUSINESS_RESTAURANT` | Restaurant Studio | LIVE | `RESTAURANT_PROMO` | YES |
| `BUSINESS_HOMECHEFF` | HomeCheff Studio | LIVE | `FOOD_PROMO` | YES |
| `BUSINESS_PRODUCT` | Product Studio | LIVE | `PRODUCT_BRANDING` | fallback |
| `BUSINESS_REAL_ESTATE` | Real Estate Studio | MISSING | `LEGACY_UNMAPPED` | fallback |
| `BUSINESS_AUTOMOTIVE` | Automotive Studio | PARTIAL | `MOTION_PRESET` | fallback |
| `BUSINESS_FASHION` | Fashion Studio | LIVE | `FASHION_REEL` | fallback |
| `BUSINESS_RETAIL` | Retail Studio | PARTIAL | `VIDEO_INTENT` | fallback |
| `BUSINESS_CORPORATE` | Corporate Studio | LIVE | `VIDEO_INTENT` | fallback |
| `BUSINESS_ADVERTISEMENT` | Advertisement Studio | PARTIAL | `PRODUCT_BRANDING` | fallback |
| `BUSINESS_COMMERCIAL` | Commercial Studio | LIVE | `VIDEO_INTENT` | fallback |
| `BUSINESS_BRANDING` | Branding Studio | LIVE | `PRODUCT_BRANDING` | fallback |
| `BUSINESS_LOGO_PLACEMENT` | Logo Placement | LIVE | `PRODUCT_BRANDING` | fallback |
| `BUSINESS_COOKING_SHOW` | Cooking Show Studio | LIVE | `COOKING_SHOW` | fallback |

### SOCIAL

| Pack ID | Display | Status | Matrix |
|---------|---------|--------|--------|
| `SOCIAL_TIKTOK` | TikTok Studio | LIVE | `SOCIAL_CAMPAIGN` |
| `SOCIAL_INSTAGRAM` | Instagram Studio | LIVE | `SOCIAL_CAMPAIGN` |
| `SOCIAL_FACEBOOK` | Facebook Studio | PARTIAL | `SOCIAL_CAMPAIGN` |
| `SOCIAL_YOUTUBE` | YouTube Studio | PARTIAL | `VIDEO_INTENT` |
| `SOCIAL_SHORTS` | Shorts Studio | LIVE | `SOCIAL_CAMPAIGN` |
| `SOCIAL_REELS` | Reels Studio | LIVE | `SOCIAL_CAMPAIGN` |
| `SOCIAL_CAMPAIGN` | Social Campaign Studio | LIVE | `SOCIAL_CAMPAIGN` |

### CREATIVE

| Pack ID | Display | Status | Matrix |
|---------|---------|--------|--------|
| `CREATIVE_STORYBOARD` | Storyboard Studio | LIVE | `SCENE_STILL` |
| `CREATIVE_FILM` | Movie Studio | ADVANCED | `SCENE_STILL` |
| `CREATIVE_DOCUMENTARY` | Documentary Studio | LIVE | `VIDEO_INTENT` |
| `CREATIVE_MUSIC_VIDEO` | Music Video Studio | LIVE | `VIDEO_INTENT` |
| `CREATIVE_PODCAST` | Podcast Studio | LIVE | `VIDEO_INTENT` |
| `CREATIVE_PRESENTATION` | Presentation Studio | LIVE | `VIDEO_INTENT` |
| `CREATIVE_ANIMATION` | Animation / Instant Studio | LIVE | `INSTANT_PHOTO_TO_VIDEO` |
| `CREATIVE_TRAVEL_VLOG` | Travel Studio | LIVE | `VIDEO_INTENT` |
| `CREATIVE_EVENT_VIDEO` | Event Studio | LIVE | `VIDEO_INTENT` |

### IDENTITY

| Pack ID | Display | Status | Matrix |
|---------|---------|--------|--------|
| `IDENTITY_OUTFIT` | Outfit Studio | LIVE | `OUTFIT_CHANGE` |
| `IDENTITY_CHARACTER` | Character Studio (entity) | LIVE | `SCENE_STILL` |
| `IDENTITY_MASCOT` | Mascot Studio | LIVE | `CHARACTER_FUSION` |
| `IDENTITY_FUTURE_CHILD` | Future Child | EXPERIMENTAL | `FUSION_EXPERIMENTAL` |
| `IDENTITY_CHARACTER_FUSION` | Fusion Studio | LIVE | `CHARACTER_FUSION` |
| `IDENTITY_MOTION_READY` | Motion Ready | LIVE | `STUDIO_MOTION_HANDOFF` |
| `IDENTITY_PERSON_BACKGROUND` | Background Studio | LIVE | `PERSON_BACKGROUND` |

---

## One pack · many doors · one owner

Enforced by `assertUniqueProductExperienceOwnership`.  
Resolver: `resolveCreativeExperience` + `DOOR_ALIASES`.  
Matrix parallel map: `resolveCanonicalExperienceId` (must stay aligned during S.6G wiring).

---

## Packs that are product names but not yet separate IDs

| Desired consumer name | Classification | Use instead |
|-----------------------|----------------|-------------|
| Food Studio | PARTIAL (no `FOOD_*` ID) | HomeCheff + Restaurant + Cooking Show |
| Beauty Studio | NO_SURFACE | — |
| Pet Studio | NO_SURFACE | Mascot / ADVANCED animal fusion only |
| Sports Studio | PARTIAL | Motion presets under `MOTION_PRESET` |
| Luxury Studio | PARTIAL | Red Carpet + fashion adjacent |
| Lifestyle / Entertainment | NO_SURFACE | — |
| Voice / Music / SFX / Publish Studio | ENGINE_ONLY | Matrix engines without product packs |

Do **not** invent Matrix engines for these in S.6G — add product rows mapping to existing engines, or defer.
