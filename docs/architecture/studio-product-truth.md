# Studio Product Truth — CANONICAL

**Status:** CANONICAL PRODUCT TRUTH  
**Audit date:** 2026-08-09  
**Evidence HEAD:** `f82d8322` (docs branch) / product base `a0e28e1c`  
**Nature:** Reconstructed from repository evidence only. Not a roadmap vision.

---

## 1. Repository truth

| Field | Evidence |
|-------|----------|
| Repository | `frameflow-ai` / GitHub `homecheff-motion` |
| Package name | `frameflow-ai` |
| Framework | Next.js **16.2.4** (App Router), React **19.2.4** |
| Database | Neon PostgreSQL (`neondb`) via Prisma **6.18.0** |
| Blob storage | Vercel Blob (uploads, scene images, audio, manifests) |
| Auth | Custom cookie session (`studio_session`; legacy `hc_session`) — host-only containment |
| Domains | `studio.homecheff.eu`, `motion.homecheff.eu` |
| AI (runtime) | OpenAI (images/vision), Vidu (motion video), ElevenLabs (TTS/clone/music/sfx/STT) |
| Rendering | Instant Premium Motion segments + merge/worker; Fusion = image compose |
| Worker | `worker/video-worker.ts`, rembg-service, local vision models |

### Major application domains (verified under `src/app`)

| Domain | Paths | Role |
|--------|-------|------|
| Studio | `/studio/**` | Storyboards, identity libraries, adaptive workspace, assets |
| Motion / Animate | `/motion/**`, `/animate/**` | Image→video Instant Premium + legacy animate |
| Editor | `/editor/**` | Canvas, fusion/intelligence, masked edits |
| Videos | `/videos/**` | Rendered project gallery / versions |
| Projects (HC) | `/projects` | Cross-module HomeCheff project hub |
| Publish | `/publish/**` | Export / publish surfaces |
| Account / Billing | `/account/**`, Studio account APIs | Credits, wallet, Stripe |
| Admin | `/admin/**` | Ops, billing, showcase |

---

## 2. What is HomeCheff Studio today?

**HomeCheff Studio is a multi-scene AI production workspace** that lets a creator build a **storyboard of scenes**, attach reusable **characters / locations / props / worlds**, generate **still images** with text-assembled identity/continuity context, plan **director/camera/audio**, then hand off stills into **Motion (image→video)** — with parallel **Editor Fusion** for identity-aware image composition and a **credit-gated** provider pipeline.

It is **not** merely a single-prompt image or video generator. It is also **not** CapCut: timeline editing of arbitrary footage is secondary to storyboard→still→Motion.

### Primary user
Creators and small businesses (especially food/brand storytelling) producing multi-scene AI videos with recurring personas and places.

### Primary problem solved
Turn an idea / brief into a **coherent multi-scene production** with reusable creative entities and a path to rendered video.

### Primary creative workflow (evidence)
1. Create storyboard (brief / new)  
2. Define or pick Characters / Locations / Props / Worlds  
3. Attach entities per scene; set shot/action/emotion/director/style  
4. Generate scene images (`IMAGE_GENERATE`)  
5. Optionally improve / vision / consistency  
6. Handoff → Instant Premium Motion (`VIDEO_GENERATE` / Vidu)  
7. View in `/videos`; optional language export / subtitles  

### Secondary workflows
- Character Studio / Fusion (outfit, branding, reference compose)  
- Asset library browse + S.5 creative memory index  
- Voice TTS / clone; music / SFX library  
- Classic storyboard editor; Movie Builder / Production Center  
- Editor start canvas / instruction variants  

### Unique capabilities (code-backed)
- Owner-scoped identity libraries with rich memory fields  
- Sectioned prompt builder injecting character/location/prop/world continuity text  
- Multi-director planning stack (shot, music, sound, provider)  
- Adaptive S.2 workspace shell  
- S.4 GenerationJob for selected paths + S.5 library index  

### Advanced / experimental / legacy
- **Advanced:** Movie Builder, Production Center, Combine workspace, advanced identity styles, `uiMode=advanced`  
- **Experimental:** Fusion simulation intents (`isSimulation`)  
- **Legacy:** `/studio/advanced`, `/studio/my-studio`, `/studio/workspace` shims; `/animate?legacy=1`; `/editor/fuse` redirects; classic editor; parallel StudioJob  

---

## 3. CURRENT PRODUCT DEFINITION

**HomeCheff Studio** is the authenticated creative production product on the HomeCheff Motion platform that:

1. Persists **Storyboards** composed of **Scenes** with optional linked **Characters, Locations, Props**, and optional **World** identity via asset links.  
2. Assembles **scene still prompts** from structured scene fields + library memory + director/style profiles + hardcoded quality instructions.  
3. Generates images through **OpenAI** (or mock), optionally analyzes consistency/vision, and stores **SceneImages**.  
4. Plans camera/energy/music/sound/provider assignments via **rule-based Directors**.  
5. Hands stills to **Motion Instant Premium** for **Vidu** image-to-video segments.  
6. Offers **Editor Fusion** as a parallel multi-reference **image** composition product (OpenAI), integrated with Character Studio.  
7. Bills via **Studio wallet / credits**; tracks selected jobs as **StudioGenerationJob**; indexes durable assets via **StudioLibraryAsset** when wired.  
8. Does **not** (today) consume S.5 **BrandKit** or **PromptPreset** rows in generation.  
9. Does **not** (today) pass character/location reference **pixels** into scene image generation — references are prompt/metadata/vision-QA.  
10. Forces Studio→Motion aspect **9:16** in handoff/batch paths.

---

## 4. Original product DNA (classification)

| Concept | Class | Evidence |
|---------|-------|----------|
| Storyboard + Scenes | **CORE PRODUCT DNA** | Prisma models, workspace, generations |
| Characters / Locations / Props | **CORE PRODUCT DNA** | Required refs at create; scene junctions; memory fields |
| World profile | **MAJOR PRODUCT FEATURE** | `StudioWorldProfile`; no storyboard FK |
| Identity / continuity memory | **CORE PRODUCT DNA** | Extensive identity modules + prompt injection |
| Reference imagery | **CORE PRODUCT DNA** (create) / **PARTIAL** (gen) | Required on create; not conditioned at scene T2I |
| Director profiles / shot planning | **MAJOR PRODUCT FEATURE** | Multiple director modules + UI |
| Prompt builder V7 sections | **CORE PRODUCT DNA** | `studio-prompt-builder` |
| Motion Instant I2V | **CORE PRODUCT DNA** (platform) | Primary video path |
| Fusion | **MAJOR / ADVANCED** | Editor + Character Studio; not storyboard still path |
| Classic editor | **LEGACY** (still reachable) | `/classic` |
| Adaptive workspace S.2 | **MAJOR** (shell) | Canonical `/studio?storyboardId=` |
| GenerationJob S.4 | **MAJOR** (ops) | Partial capability coverage |
| Asset library S.5 | **MAJOR** (index) | Creative memory + sync |
| BrandKit / PromptPreset S.5 | **SUPPORTING** (storage) | Unwired to gen |
| StudioJob legacy | **LEGACY** | Parallel job runner |

---

## 5. Story model vocabulary (do not normalize)

| Term | In code/DB | In UI | Same as? |
|------|------------|-------|----------|
| Storyboard | `StudioStoryboard` | Project-like unit in Studio | Closest to “Studio project” |
| Scene | `StudioScene` | Scene list / cards | Canonical unit |
| Shot | `shotType` on scene / director | Framing enum | **Not** a DB entity; framing of a scene |
| Sequence | Action sequence UI copy | Planning language | Not a table |
| Clip | Rare in Studio; Motion/intent language | — | Not Studio SoT |
| Project | `StudioCreativeProject` (S.5), `AnimationProject`, `HomeCheffProject`, `EditorCanvasProject` | Multiple | **Different concepts** |
| Story | Brief / narrative fields | Marketing/brief | Not a single model |

---

## 6. Project models (all coexist)

| Model | Role |
|-------|------|
| `StudioStoryboard` | Primary Studio creative container |
| `StudioCreativeProject` | S.5 lightweight linker (optional links to storyboard/Motion/HC) |
| `AnimationProject` | Motion / Instant Premium video project |
| `HomeCheffProject` | Cross-module package hub |
| `EditorCanvasProject` | Editor canvas persistence |

---

## 7. What makes Studio unique (ranked by evidence)

1. **Reusable identity libraries** (character/location/prop/world) with memory + scene linking  
2. **Multi-scene storyboard production** with director/camera/audio planning  
3. **Continuity-aware prompt assembly** (text) + post-hoc consistency/vision  
4. **Storyboard → Motion I2V** production bridge  
5. **Fusion / Character Studio** identity-preserving image compose  
6. Credit-metered multi-provider ops (S.4 jobs subset)  

Less differentiating if continuity text were removed: would collapse toward generic T2I + I2V.

---

## 8. Roadmap conflict note (summary)

S.1–S.5 largely **added shells, jobs, and library index** without deleting DNA.  
S.6A correctly found Prompt Matrix is **partial**.  
**Risk:** Treating Prompt Matrix as greenfield phrase packs could **bypass** identity/continuity sections that are the product’s core.  
**See** `studio-non-negotiables.md` and audit recommendation.
