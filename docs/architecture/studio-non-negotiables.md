# Studio Non-Negotiables

**Purpose:** Protect Studio product DNA from accidental simplification during future architecture work (including S.6*).  
**Status:** Binding guidance for agents and roadmap. Derived from Product Truth audit (2026-08-09).

---

## NN-01 — Multi-scene Storyboard

| | |
|--|--|
| **What** | Creators build ordered scenes under a storyboard, not only single-shot generations. |
| **Why** | Primary product structure. |
| **Owner** | `StudioStoryboard` / `StudioScene` + workspace UI |
| **Must not break** | Scene CRUD, order, duplicate-with-links, per-scene generation |

## NN-02 — Character as first-class reusable entity

| | |
|--|--|
| **What** | Characters are owner-scoped library entities with required reference image, memory fields, optional voice, scene junction links. |
| **Why** | Core differentiator vs generic prompt UIs. |
| **Owner** | `StudioCharacter`, `StudioSceneCharacter`, character services/UI |
| **Must not break** | Create-with-reference; attach to scenes; reuse same `characterId` across storyboards; library listing |

## NN-03 — Location & Prop reusable entities

| | |
|--|--|
| **What** | Locations (FK per scene) and Props (junction) with reference images + continuity memory. |
| **Why** | Same kitchen / product must be re-selectable. |
| **Owner** | `StudioLocation`, `StudioProp`, scene sync |
| **Must not break** | Ownership checks; prompt injection when linked |

## NN-04 — World profile (persistent setting)

| | |
|--|--|
| **What** | `StudioWorldProfile` linking characters/locations/props and contributing continuity/style lines when assets resolve a world. |
| **Why** | Persistent creative world concept exists even without storyboard FK. |
| **Owner** | World profile service + memory mappers |
| **Must not break** | World CRUD; prompt extras when linked; do not delete model in “simplify” |

## NN-05 — Continuity / identity prompt injection

| | |
|--|--|
| **What** | Scene generation prompts include character/location/prop/world memory chunks, identity sections, continuity strength, optional drift lines. |
| **Why** | This is the **current** continuity mechanism (text-layer). |
| **Owner** | `studio-prompt-builder`, memory/identity modules, `studio-scene-image-prompt` |
| **Must not break** | Identity/continuity sections must remain first-class in any Prompt Matrix; Matrix must not drop memoryBundle / sourceEntities |

## NN-06 — Reference imagery retained

| | |
|--|--|
| **What** | Characters/locations/props require and store reference images; supporting refs; vision QA may consume ref URLs. |
| **Why** | Identity ground truth for humans and vision. |
| **Owner** | Entity fields + `generationSettings.referenceAssets` + vision providers |
| **Must not break** | Reference storage; vision path. **Known gap:** scene T2I does not condition on pixels — closing that gap is enhancement, not deletion of refs. |

## NN-07 — Character voice identity

| | |
|--|--|
| **What** | Characters can own voice provider/profile/language/lock/history; handoff attaches voice plan. |
| **Why** | Voice continuity across Motion scenes. |
| **Owner** | Character voice fields + voice identity resolver + handoff attach |
| **Must not break** | Persistence of voice fields; Motion handoff attachment |

## NN-08 — Director + shot planning stack

| | |
|--|--|
| **What** | Director profiles, style profiles, shot type, camera movement, scene energy, auto shot planner, music/sound directors. |
| **Why** | Planning intelligence is product, not clutter. |
| **Owner** | `studio-scene-director`, director profiles, auto-shot, audio directors |
| **Must not break** | Enums + prompt phrase mapping for shot/movement/energy; do not silently ignore UI selections |

## NN-09 — Canonical adaptive workspace

| | |
|--|--|
| **What** | Canonical storyboard work URL is `/studio?storyboardId=` (S.2 shell). |
| **Why** | Avoid re-fragmenting into multiple shells. |
| **Owner** | `studio-workspace-href`, `StudioWorkspaceShell` |
| **Must not break** | Deep links; posture adaptive layout. Classic may remain reachable but is not the SoT shell. |

## NN-10 — Motion image→video bridge

| | |
|--|--|
| **What** | Storyboard stills → Instant Premium / AnimationProject → Vidu segments. |
| **Why** | Primary path to finished video. |
| **Owner** | Handoff + Instant Premium + `VIDEO_GENERATE` |
| **Must not break** | Source still URLs into animation images; job start without double-charge |

## NN-11 — Fusion / Character Studio identity compose

| | |
|--|--|
| **What** | Multi-reference image composition with preservation rules (face/identity/brand). |
| **Why** | Distinct advanced capability; Character Studio hub depends on it. |
| **Owner** | Editor fusion pipeline + `FUSION_RENDER` GenerationJob |
| **Must not break** | Intelligence workflows; preserveCharacter defaults; do not “retire” without parity |

## NN-12 — Classic / Advanced reachable capabilities

| | |
|--|--|
| **What** | Classic editor, Movie Builder, Production Center, advanced toggle features remain reachable until parity is proven. |
| **Why** | Product Truth: advanced surfaces still hold unique entry points. |
| **Owner** | Classic route, production/movie-builder, `hc-studio-advanced-features` |
| **Must not break** | Delete-without-parity forbidden |

## NN-13 — GenerationJob + credit authorize/capture

| | |
|--|--|
| **What** | Wired capabilities use S.4 job lifecycle + existing credit gates. |
| **Why** | Ops integrity / no double charge. |
| **Owner** | `generation-orchestrator`, wallet APIs |
| **Must not break** | Idempotency; chargeFinalized once; technical retry ≠ new paid attempt |

## NN-14 — Asset durability direction

| | |
|--|--|
| **What** | Creative outputs should remain findable (S.5 library index + prior blob/entity SoTs). |
| **Why** | “Nothing generated should disappear.” |
| **Owner** | Entity tables + blob manifests + `StudioLibraryAsset` |
| **Must not break** | Existing entity SoTs while indexing; no orphan deletes of library entities |

## NN-15 — S.5 BrandKit / PromptPreset storage

| | |
|--|--|
| **What** | Tables/APIs exist; generation does not yet consume them. |
| **Why** | Future wiring must not delete storage; wiring must not pretend they already affect gen. |
| **Owner** | `StudioBrandKit`, `StudioPromptPreset` |
| **Must not break** | CRUD APIs; document unwired state until consumed |

---

## Explicit non-goals for “cleanup”

Do **not**, under the guise of Prompt Matrix or Director consolidation:

1. Collapse Character/Location/Prop into anonymous prompt text without IDs.  
2. Remove memory/continuity fields.  
3. Drop reference image requirements without a stronger replacement.  
4. Replace storyboard/scenes with single-shot only UX.  
5. Delete Fusion or Classic before parity matrix green.  
6. Bypass identity sections in a new Matrix composer.
