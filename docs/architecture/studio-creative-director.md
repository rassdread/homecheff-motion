# Studio Creative Director (S.6F)

**Status:** Implemented (architecture + thin workspace surface)  
**Version:** `6f.1`  
**Code:** `src/lib/studio-creative-director/`  
**Depends on:** S.6C Continuity Foundation, S.6E Prompt Matrix (COMPLETE / production GREEN)

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

## 2. Responsibilities

### Owns

- Experience selection
- Creative intent
- Planning recommendations
- Workflow guidance
- Quality guidance
- Mode selection (Quick / Professional / Director)
- CreativeSpecification **selections** (feeds Matrix)

### Never owns

- Character / location / prop / world identity
- ContinuityBundle
- Prompt writing / assembly
- Provider transforms
- Credits / billing
- Providers / GenerationJobs
- Fusion pixel preservation

---

## 3. Director Engine

See `docs/architecture/studio-director-engine.md`.

Entry: `orchestrateCreativeDirector({ experienceId | entryFan | doorHint, mode, answers })`.

Chain:

```
User → Creative Director → Experience Resolver → Creative Planner
  → selections → ContinuityBundle → Prompt Matrix → Provider Transform
  → GenerationJob → Provider
```

---

## 4. Experience Registry

Canonical product registry: `docs/architecture/studio-experience-registry.md` (S.6F section).  
51 product experiences · 5 families · unique entry-fan ownership · maps to S.6E Matrix IDs.

---

## 5. Three product modes

See `docs/architecture/studio-product-modes.md`.

| Mode | Target |
|------|--------|
| Quick | Consumers — fastest path |
| Professional | Businesses — brand / audience / platform |
| Director | Pro creators — full Studio, no feature loss |

Architecture only; no shell redesign.

---

## 6. Workspace integration

Lives inside Adaptive Workspace (`StudioWorkspaceShell`):

| Surface | Placement |
|---------|-----------|
| Desktop | Right tools — Creative Director (Direct group) |
| Tablet | Contextual panel |
| Mobile | On-demand sheet (existing tool sheet) |

- Tool id: `creativeDirector`
- Panel: `StudioWorkspaceCreativeDirectorPanel`
- No floating robot
- No separate application
- Classic / Fusion / Movie Builder / Production Center remain

---

## 7. Journeys

### Consumer (Quick)

Upload selfie → LinkedIn Photo → business style / background / smile / suit → Director → ContinuityBundle → Prompt Matrix → Generation

Same engine powers Wedding, Dating (MISSING pack), Family, Restaurant, Christmas (MISSING), Baby (MISSING), Travel, etc.

### Professional

Restaurant → logo / brand colors / audience / Instagram / commercial → Director → Matrix → Generation

### Director

Storyboard → Characters / Locations / Props / Worlds → Scenes → Movie Builder → Production → Motion → Publish

---

## 8. Future compatibility

Prepared for Marketplace, Growth, HomeCheff, Studio, Enterprise **without coupling** — Director only emits product intent + Matrix selections + planner recommendations.

---

## 9. Related docs

- `docs/architecture/studio-director-engine.md`
- `docs/architecture/studio-experience-registry.md`
- `docs/architecture/studio-product-modes.md`
- `docs/audits/studio-s6f-implementation.md`
- `docs/audits/studio-s6f-creative-director-audit.md`
