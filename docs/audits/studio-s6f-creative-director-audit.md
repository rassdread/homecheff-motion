# Studio S.6F — Creative Director Audit (READ ONLY)

**Date:** 2026-08-09  
**Repository:** homecheff-motion  
**Branch:** `main`  
**Precondition:** S.6E COMPLETE (Prompt Matrix production GREEN)  
**This phase:** Audit only — **no code, no commits, no push, no PR**

---

## Executive verdict

Studio already contains a **rich Director/planner swarm** plus assistants and production surfaces.  
S.6F Creative Director can and should be built as an **orchestrator** over:

- ContinuityBundle (S.6C/S.6E)  
- Prompt Matrix + CreativeSpecification (S.6E)  
- Existing domain directors / auto-shot / proposals  
- Provider transforms (S.6E)  
- GenerationJobs  

It must **not** replace Continuity, Matrix, Fusion preservation, or the S.2 workspace shell.

**Decision: GO FOR STUDIO S.6F IMPLEMENTATION** (orchestrator scope).

---

## 1. Capabilities discovered

| Cluster | Count / notes |
|---------|----------------|
| Creative planning systems | **~40** (directors + planners + wizards + assistants) |
| Named `*-director*` modules | Scene, music, sound, voice, voice-identity, audio-production, audio-asset, media-asset, composition, placement, blocking, attention, provider-execution, movie quality, … |
| Planners | Auto-shot, shot, animation, vidu execution, production, render strategy/batch, scene image, analysis, long-form, action→shot, scene generation orchestrator |
| Proposal pipeline | build → apply → readiness → compare → decision memory |
| Interpreters / wizards | AI Director interpreter + direction; V10 story planning; V11 director wizard; production brief |
| UI | Director V2 (LIVE), Classic AI Director (LEGACY), Movie Builder + Production Center (ADVANCED) |
| Assistants | Creation Assistant + Homecheff Assistant interpret/execute (+ Editor Instruction AI Director — Editor-only) |
| Matrix mode hook | `detailLevel` QUICK/PROFESSIONAL/DIRECTOR already on CreativeSpecification |
| Missing as modules | Dedicated lighting / mood / style / camera planners (beyond Scene Director) |

---

## 2. Existing Directors (summary)

See full table: `studio-director-capability-audit.md`.

Highlights:

- **LIVE:** Director profiles, scene shot/move/energy, Auto Shot, proposal apply, Music/Sound/Voice directors, Director V2 UI  
- **PARTIAL:** AI interpreter, V11 wizard, composition/blocking/attention, provider assignment  
- **ADVANCED:** Movie Builder, Production Center, render planners, creative review  
- **LEGACY:** Classic AI Director panel, legacy camera phrases  
- **EXPERIMENTAL:** Fusion simulation intents (not Directors, but advanced creative doors)

---

## 3. Existing planners

Auto Shot · Shot · Story arc/flow/energy · Animation · Vidu execution · Production · Render strategy/batch · Scene image · Analysis · Long-form duration · Provider assignment/execution.

---

## 4. Creative decisions

Documented in `studio-director-decision-map.md`.

- **Strong:** shot/move/energy, profiles, scene-still Matrix continuity, Fusion preserve, voice lock, Motion handoff stills  
- **Partial:** free-text AI Director, audio plan→generate, duration/aspect multi-SoT, provider plan≠runtime  
- **Weak/Missing:** lighting automation, BrandKit-driven direction, product mode controller, portrait lifestyle packs  

---

## 5. Experiences

See `studio-director-experience-audit.md`.

| Band | Truth |
|------|-------|
| Quick | Strong: 15 video intents, Instant/Motion, outfit/food/social; **Missing:** LinkedIn/dating/family portrait engines |
| Professional | Strong: workspace + entities + Fusion LIVE + audio |
| Director | Strong tooling exists; lacks single orchestrator facade |

---

## 6. Duplicate systems

Camera, duration, quality, providers, music, voice, director, style, assistant — all have **parallel entry fans**. Continuity SoT remains singular for identity. S.6F must not add another SoT.

---

## 7. Ownership map

Law confirmed:

**User** explicit locks → **Director** proposes creative fields → **Continuity** owns identity → **Matrix** assembles → **Transform** adapts → **Provider** executes.

---

## 8. Workspace integration

Fits inside `StudioWorkspaceShell` (story tool + assistants + preferences). No separate app. See `studio-director-workspace-integration.md`.

---

## 9. Provider independence

Verified by architecture: Directors emit creative fields/plans; S.6E transforms own Vidu/OpenAI/ElevenLabs/Fusion syntax. Provider assignment directors are **planning-only** and must not be treated as runtime truth.

---

## 10. Product Truth / Non-Negotiables

| NN | Director audit |
|----|----------------|
| Storyboard multi-scene | Preserved; arc planners reinforce |
| Characters/Locations/Props/Worlds | Not owned by Directors |
| Continuity injection | Matrix path; Director must not drop |
| Voice identity | Voice Identity Director resolves; Continuity owns |
| Fusion / Motion | Preserve/handoff remain outside text Director |
| Canonical workspace | Integration into shell required |
| Credits / jobs | Out of Director ownership |

---

## 11. Recommended S.6F Implementation slices (design only)

1. **Orchestration facade** — policy interface calling existing planners  
2. **Mode policy** — Quick/Pro/Director → defaults + which planners run  
3. **Proposal unification** — single entry to build/apply without deleting domain directors  
4. **Continuity-safe Quick** — when entities linked, never omit ContinuityBundle  
5. **Provider-neutral tests** — Director outputs contain no provider prompt strings  
6. **No workspace redesign** — wire into Director V2 / assistant doors  

---

## 12. Process compliance

| Item | Status |
|------|--------|
| Code changes | **None** |
| Commits | **None** |
| Push | **None** |
| PR | **None** |
| Docs written locally | Yes (architecture + audits) |

---

## Final GO / NO-GO

### GO FOR STUDIO S.6F IMPLEMENTATION

**Blocking issues:** None for orchestrator-scoped implementation.

**Non-blocking risks:**
- Director swarm complexity (~40 systems) / duplicate vocabularies  
- Instant Quick paths still weaker on ContinuityBundle  
- Provider planning names ≠ runtime providers  
- Portrait lifestyle Quick packs MISSING (dating, baby, Christmas) or PARTIAL (LinkedIn/CV, wedding, family)  
- Mascot LIVE in product but under-mapped in S.6E experience resolver  
- No dedicated lighting planner module  
- Scene T2I pixel conditioning still PARTIAL (not solved by Director)  
- Composition/blocking/placement often handoff-only (not scene-persisted)

**Recommended next step:** Explicitly start **S.6F Implementation** as Creative Director orchestrator (modes as policy, existing planners preserved, Continuity + Matrix non-bypass).
