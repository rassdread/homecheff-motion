# Studio Director Engine (S.6F)

**Status:** Implemented (`src/lib/studio-creative-director/`)  
**Version:** `6f.1`  
**Role:** Canonical orchestration chain. Does not replace Continuity, Prompt Matrix, Transforms, or GenerationJobs.

---

## Orchestration chain

```
User
  → Creative Director (`orchestrateCreativeDirector`)
  → Experience Resolver (`resolveCreativeExperience`)
  → Creative Planner (`planCreativeIntent`)
  → CreativeSpecification selections (handoff)
  → ContinuityBundle (delegated — never owned here)
  → Prompt Matrix (`assembleCreativeSpecification`)
  → Provider Transform
  → GenerationJob
  → Provider
```

Creative Director never bypasses this chain.

---

## Modules

| Module | Path | Responsibility |
|--------|------|----------------|
| Types / ownership | `types.ts` | Mode, family, ownership constants |
| Product experience IDs | `product-experience-ids.ts` | Canonical product IDs |
| Product registry | `product-experience-registry.ts` | Family ownership, Matrix mapping, planners |
| Experience resolver | `experience-resolver.ts` | Door / fan → product experience |
| Mode policy | `mode-policy.ts` | Quick / Professional / Director gates |
| Creative planner | `creative-planner.ts` | Provider-neutral intent + Matrix selections |
| Director engine | `director-engine.ts` | `orchestrateCreativeDirector` |

---

## Ownership

### Owns

- Experience selection
- Creative intent
- Planning recommendations
- Workflow / quality guidance
- Mode selection
- CreativeSpecification **selections** (not assembly)

### Never owns

- Character / location / prop / world identity
- ContinuityBundle
- Prompt assembly
- Provider prompts / transforms
- Billing / credits
- GenerationJobs
- Fusion pixel preservation

---

## Handoff contract

`CreativeDirectorHandoff` always sets:

- `requiresContinuityBundle: true`
- `matrixExperienceId` (S.6E Matrix ID)
- `detailLevel` (QUICK | PROFESSIONAL | DIRECTOR)
- `selections` (`MatrixUserSelections`)
- `delegatedSystems` (continuity, matrix, transform, jobs, fusion, motion, billing, credits)

Downstream systems remain authoritative for their layers.
