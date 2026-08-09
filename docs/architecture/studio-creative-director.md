# Studio Creative Director (S.6F Architecture — Design Only)

**Status:** Architecture design — **not implemented**  
**Date:** 2026-08-09  
**Depends on:** S.6C Continuity Foundation, S.6E Prompt Matrix (COMPLETE / production GREEN)  
**Nature:** Orchestrator over existing Directors/planners. Does **not** replace Continuity, Matrix, Transforms, or GenerationJobs.

---

## 1. Product law (unchanged)

```
Continuity owns identity
  → Prompt Matrix assembles
  → Creative Director orchestrates
  → Provider Transform is last
  → Generation executes
```

Nothing bypasses ContinuityBundle.

Creative Director **proposes and sequences** creative choices.  
It must **never** own Character/Location/Prop/World memory or provider prompt syntax.

---

## 2. What exists today (discovery summary)

Studio already has a **Director swarm** (~40 planning systems), not a single Creative Director:

| Cluster | Examples | Status |
|---------|----------|--------|
| Profile directors | `directorProfile` (6), `promptStyleProfile` (6) | LIVE |
| Scene camera language | shot / movement / energy (`studio-scene-director`) | LIVE |
| Auto planning | Auto Shot Planner, shot planner UI, story arc, energy curve | LIVE |
| Proposal pipeline | `buildDirectorProposal` → apply / compare / memory | LIVE |
| Domain directors | Music, Sound, Voice, Voice-identity, Audio-production, Audio-asset, Media-asset, Composition, Placement, Blocking, Attention | LIVE planning / PARTIAL (many handoff-only) |
| Interpreter / wizard | AI Director interpreter + direction, V10/V11, production brief | LIVE / PARTIAL |
| UI shells | Director V2 panel (default), Classic AI Director | LIVE / LEGACY |
| Production surfaces | Movie Builder, Production Center, Production Planner, HC orchestrator | ADVANCED |
| Assistants | Creation Assistant, Homecheff Assistant interpret/execute | LIVE entry fans |
| Provider planning | Provider assignment + execution director | PARTIAL (plan ≠ runtime) |
| Not found as modules | Dedicated lighting / mood / style / camera planners | — |

S.6F’s job is to **orchestrate these**, not invent Director #N+1 that owns identity or prompts.

---

## 3. Target orchestration role

```
User intent / mode (Quick | Professional | Director)
        ↓
Creative Director (policy + proposal orchestration)
        ↓
Existing domain directors / planners (shot, music, voice, …)
        ↓
Scene / storyboard field writes (persisted creative choices)
        ↓
ContinuityBundle resolve (unchanged ownership)
        ↓
Prompt Matrix → CreativeSpecification
        ↓
Provider Transform → GenerationJob → Runtime provider
```

### Creative Director MUST

- Accept `detailLevel`: QUICK | PROFESSIONAL | DIRECTOR
- Call existing planners (auto-shot, music, voice, …) via a **policy interface**
- Respect explicit user locks
- Emit proposals that apply to scene/storyboard fields
- Pass through ContinuityBundle untouched
- Remain inside `StudioWorkspaceShell` (`/studio?storyboardId=`)

### Creative Director MUST NOT

- Rewrite Continuity entity memory
- Flatten Characters/Locations/Props into anonymous prose
- Call providers or invent provider prompt strings
- Own credit/price decisions
- Become a separate app/shell
- Delete Classic/Director V2/Movie Builder surfaces

---

## 4. Policy interface (conceptual)

```
DirectorPolicy {
  detailLevel
  experienceId          // from S.6E registry
  userLocks             // fields user set explicitly
  continuitySummary     // IDs + strengths only (not rewrite)
  existingSceneState
}

DirectorProposal {
  shotType?, cameraMovement?, sceneEnergy?
  directorProfile?, styleProfile?
  durationHint?, platformHint?, aspectHint?
  musicPlan?, soundPlan?, voicePlan?
  rationale[]
  sourcePlanners[]      // which existing modules contributed
}
```

Apply path remains today’s `applyDirectorProposal` (or successor wrapper) — **writes scene fields**, then Matrix reads them.

---

## 5. Provider independence

Director works only with **creative intent** and persisted scene/storyboard fields.

| Allowed | Forbidden |
|---------|-----------|
| “Use close-up + push_in + energetic” | “Vidu requires …” |
| Prefer short social duration | Embedding Vidu negative strings |
| Prefer cinematic style profile | OpenAI image-edit payload crafting |

Provider transforms (S.6E) remain the only provider-specific layer.

---

## 6. Relation to S.6E Matrix

| Layer | Owner after S.6F |
|-------|------------------|
| ContinuityBundle | Continuity |
| CreativeSpecification assembly | Prompt Matrix |
| Shot/energy/style **choices** | Creative Director (orchestrates existing planners) |
| Provider request shaping | Provider Transform |
| Job / credits | Generation orchestration |

Matrix already accepts `detailLevel`. S.6F supplies policy that **feeds** selections; Matrix does not become the Director.

---

## 7. Non-negotiables validation

Creative Director design respects NN-01…NN-15:

- Storyboard multi-scene structure preserved  
- Characters/Locations/Props/Worlds remain first-class  
- Fusion pixel preservation stays outside Director text policy  
- Motion handoff still carries source stills + approved continuity subset  
- Canonical shell remains `/studio?storyboardId=`  
- BrandKit/PromptPreset remain optional overlays (not identity)

---

## 8. Implementation readiness (audit verdict)

**Ready to implement as orchestrator** if S.6F Implementation:

1. Introduces a thin orchestration API over existing planners  
2. Does not rewrite Matrix / Continuity / Transforms  
3. Modes = policy only (no mandatory new UI product)  
4. Keeps Director V2 as the primary advanced surface  

See audit pack under `docs/audits/studio-s6f-creative-director-audit.md`.
