# Story Architect Reality Audit

**Date:** 2026-06-06  
**Scope:** Read-only audit before Story Architect sprint.

---

## Hoe scènes nu ontstaan

| Stap | Systeem | Probleem |
|------|---------|----------|
| Idea | User prompt / Production Brief | Raw text |
| Enrichment | Brief, Memory, Review, Assistant, Timeline, Patterns, Snapshots | Context stacking |
| Flow | `buildSyntheticFlow()` / `existingToFlow()` | Position → arc phase |
| Scenes | `buildDirectorProposal()` scene loop | **Same `{topic}` in every scene template** |
| Apply | `applyDirectorProposal()` | DB scenes |

---

## Structuur die al bestaat

| Systeem | Fases |
|---------|-------|
| Production Planner | intro, setup, development, climax, ending + status |
| Story Arc | opening → outro (7 phases) |
| Director V2 | introduction → finale (6 purposes) |
| Story Health Advisor | missing_climax, similar_scenes, etc. |
| Creative Review | Phase review from planner structure |

---

## Structuur die ontbrak

- Explicit **story goal / theme / message** layer
- **Narrative moments** before scenes (Departure, Discovery, etc.)
- Scene text driven by **architecture beats**, not raw prompt repetition
- Project-level **Story Architecture** UI

---

## Overlap

| A | B | Relatie |
|---|---|---------|
| Production Planner storyStructure | Story Architect | Architect consumes planner output |
| Creative Review storyReview | Story Architect | Architect enriches review context |
| Creation Assistant story tasks | Story Architect tasks | Architect adds gap tasks (climax, ending, message) |
| Story Arc phases | Narrative moments | Moments map arc phases → human labels |

---

## Herbruikbare data

- `buildStudioProductionPlan().storyStructure`
- `StudioProductionBrief` goal, CTA, content type
- Production Memory patterns (theme)
- `detectArcPhaseForIndex()` for moment mapping
- Existing phase status: present / weak / missing / strong

---

## Central hook

`buildStoryArchitecture()` — prompt → structure → moments → scene params (no new AI).
