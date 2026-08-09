# Studio Experience Packs (S.6G)

**Status:** P0 consumer wiring IMPLEMENTED (`/studio/experience`) · Preview pending  
**Role:** Curated workflows on top of Continuity + Prompt Matrix + Creative Director  
**Not:** New AI engines, new prompt stacks, or billing systems  
**Entry contract:** `openExperience()` in `consumer-entry.ts`

---

## Definition

An **Experience Pack** is a product-facing creative experience (e.g. LinkedIn Studio, Restaurant Studio) that:

1. Owns one canonical `StudioProductExperienceId`
2. Maps to exactly one S.6E Matrix experience (or honest `LEGACY_UNMAPPED` / experimental)
3. Declares assets, questions, Continuity needs, planners, and modes
4. Is orchestrated by Creative Director
5. May expose optional Creative Coach suggestions

Many entry doors (Instant, Motion preset, Fusion intent, SEO CTA, Assistant chip) may open one pack.  
Only one pack owns each entry fan.

---

## Chain (mandatory)

```
User entry
  → Experience Pack (resolve)
  → Creative Director (orchestrate)
  → ContinuityBundle
  → Prompt Matrix
  → Provider Transform
  → GenerationJob
  → Provider
```

Packs never bypass Continuity or rewrite Matrix/Transforms.

---

## Relationship to existing layers

| Layer | Owns |
|-------|------|
| Experience Pack (S.6F product registry) | Consumer meaning, questions, doors |
| Creative Director | Orchestration, mode, coach advice |
| ContinuityBundle | Identity entities + source-image case |
| Prompt Matrix | Prompt assembly |
| Provider Transform | Provider payload |
| GenerationJobs / Credits / Billing | Execution & money |

SoT code: `src/lib/studio-creative-director/product-experience-registry.ts`

---

## Modes

| Mode | Pack UX |
|------|---------|
| Quick | Upload → choose pack → simple questions → generate |
| Professional | + brand / audience / platform / quality |
| Director | Full Studio (entities, scenes, Movie Builder, Production) |

No workspace redesign — packs feed the existing Creative Director tool and existing routes.

---

## Expansion rule

New packs = data rows (family, Matrix map, fans, questions, status).  
No hardcoded per-pack engines. Missing capabilities stay `MISSING` until real Matrix mapping exists.

---

## Related

- `docs/audits/studio-s6g-consumer-experience-audit.md`
- `docs/audits/studio-s6g-experience-pack-registry.md`
- `docs/architecture/studio-creative-director.md`
- `docs/architecture/studio-experience-registry.md`
