# HomeCheff AI Suite Architecture Report — Phase 5

## Editor

**Purpose:** Create, edit, prepare, and compose images into assets.

**Workflow:** Upload → Vision → Object Detection → Visual Editor → Review → Save Asset

**Output:** Assets

**Foundation:** `src/types/homecheff-visual-editor.ts`, `src/lib/homecheff-visual-editor-foundation.ts`

**Interim entry:** `/maak` (future dedicated `/editor`)

**Consumes:** Universal Asset Workbench, Identity Profiles, Composition Graph, Reference Placement

---

## Studio

**Purpose:** Build stories, scenes, and projects.

**Workflow:** Assets → Storyboards → Director → Scene Composition → Motion

**Output:** Scene Recipes

**Foundation:** Existing workspace shell, Director V2, Motion Handoff v26

**Integrated flow:** Editor → Studio → Motion → Presentation (single UX inside Studio)

---

## Motion

**Purpose:** Animate images and scenes.

**Workflow:** Assets → Motion → QA → Video

**Output:** Video

**Foundation:** `/animate/instant`, `MotionHandoffPayload`, scene semantic recipe

---

## Presentation → Publish

User-facing name **Publish**. Internal product id remains `presentation` for code stability.

## Assets → Library

User-facing name **Library**. Internal product id remains `assets`. Route `/studio/assets` unchanged; alias `/library`.

---

## Presentation (Publish product)

**Purpose:** Make videos publishable — standalone, no Studio required.

**Workflow:** Video Upload → Speech Analysis → Subtitles → Overlays → Branding → Exports  
**Or:** Motion → Presentation

**Output:** Final Deliverables

**Foundation:** `src/types/homecheff-presentation-suite.ts`, `src/lib/homecheff-presentation-foundation.ts`

**Interim entry:** `/videos` (future dedicated `/presentation`)

**Features (architecture):** Subtitles, text overlays, titles, CTA, branding, logo placement, safe areas, platform presets (TikTok, Instagram, YouTube Shorts, Facebook, LinkedIn)

---

## Assets (Library product)

**Purpose:** Central library shared by all products.

**Structure:**

```
Assets
├─ Media (Videos, Audio, Voices)
├─ Creative (Characters, Props, Locations, Worlds)
└─ Library (Uploads, Generated, Derived)
```

**Foundation:** `studio-asset-hub-sections.ts`, `StudioAsset` registry

---

## Navigation Architecture

**Legacy nav (default):** Create | Studio | Assets | Motion | Videos | Pricing | About

**Suite nav (opt-in):** Editor | Studio | Motion | **Publish** | **Library** | Pricing

**Flag:** `NEXT_PUBLIC_HOMECHEFF_PRODUCT_SUITE_NAV=true`

**Config:** `src/lib/homecheff-primary-nav-config.ts`

---

## Shared Infrastructure

All products share:

| Infrastructure | Used by |
|----------------|---------|
| Assets | Editor, Studio, Motion, Assets |
| Identity | Editor, Studio, Assets |
| Semantic Records | Editor, Studio, Motion, Assets |
| QA | All products |
| Storage | All products |
| Permissions | All products |
| Billing | All products (foundation only) |

---

## Object Manipulation

Operations: move, scale, rotate, replace, delete, duplicate, visibility, lock, rename, reset

Applies to: uploads, generated, derived, canonical assets

**Types:** `EditorCanvasObject`, `EditorObjectOperation`

---

## Character Body Designer

Parameters: head/eye scale, shoulder width, arm thickness, waist, leg length, hands, feet, height, stylization

Presets: Realistic, Stylized, Mascot, Hero, Cute, Cartoon, Custom

**Prompt block:** `buildBodyDesignerPromptBlock()`

---

## Reference Placement Canvas

Visual canvas model extending `AssetReferencePlacement` with `canvasTransform`, drag/scale/rotate/lock, object linking.

**Foundation:** `PlacementCanvasItem`, `buildPlacementCanvasFromPlacements()`

---

## Multi Reference Composition

Composition graph visible as canvas tree:

```
Character
├─ Apron → Garden Logo
├─ Hat → Designer Logo
└─ Table → Box → Shipping Label
```

**Existing:** `CompositionGraphNode`, `compositionGraphToCanvasTree()`

---

## Presentation Layer

Feature map with implementation status (wired / partial / foundation). Safe area specs per social platform.

**Wired today:** text_overlays (story overlay pipeline)  
**Partial:** subtitles, titles, branding, logo_placement  
**Foundation:** CTA, brand kits, multilingual, export presets

---

## Billing Foundation

Plans (architecture only): Editor, Studio, Motion, Presentation, Complete Suite

**Types:** `src/types/homecheff-billing-foundation.ts`  
**Registry:** `BILLING_PRODUCT_PLANS` in `homecheff-product-suite.ts`

No payment provider wiring.

---

## End-to-End Audit

| Product | Stored | Consumed | Behavior | Ownership | Permissions |
|---------|--------|----------|----------|-----------|-------------|
| Editor | Registry, semantic record, placements | Vision, identity, composition | Produces assets | User blob + semantic marker | Owner lifecycle |
| Studio | Storyboards, scene recipes, director | Asset registry, handoff | Scene recipes | User studio entities | Owner CRUD |
| Motion | Animation projects, render traces | Images, scene recipes, placements | Video output | User projects | Owner + credits |
| Presentation | Deliverables, subtitles, overlays | MP4 upload or motion video | Final deliverables | User videos | Standalone upload |
| Assets | Media/Creative/Library | All products | Shared hub | Uploads + generated | Used-in protection |

---

## Tests

`src/lib/homecheff-product-suite.test.ts` — products, nav, editor foundation, presentation foundation, audit

---

## Build Status

Run: `npm run test`, `npm run build`, `npm run lint`

**Constraints honored:** No new providers, render pipeline, motion pipeline, or Prisma migrations.
