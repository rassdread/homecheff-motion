# Creation Assistant Audit Report

## Samenvatting

Studio heeft **geen** component, route, of i18n-key genaamd “Creation Assistant”. Wel heeft Studio **uitgebreide creation guidance** die functioneel 70–80% van een assistant dekt — verspreid over **12+ oppervlakken** die recent zijn versterkt (Production Brief, Memory, Creative Review) en oudere lagen (Consistency, Insights rail, fix actions).

De closest thing to a unified assistant today is **Creative Review** (project-level SWOT + open-tool) plus **Production Planner creationGuidance** (missing assets + navigation). De closest pre-workspace assistant is **Production Brief** (decisions + memory + recommendations).

**Aanbeveling:** volgende sprint = **Creation Assistant Consolidation** — één entry point dat bestaande orchestrators consumeert (`buildCreativeReview`, `buildStudioProductionPlan`, `buildReadinessFixActions`), geen nieuwe score engines.

---

## Wat Studio al heeft (BESTAAT AL)

| Capability | Realisatie |
|------------|------------|
| Open editor actions | `onSwitchTool` in shell → Production, Creative Review, Consistency, Continuity, Visual, Asset Evolution, Animation/Vidu summaries |
| Suggestion card pattern | `StudioAiSuggestionCard` — Open + optional Use suggestion |
| Readiness fix pipeline | `buildReadinessFixActions` → unified fixes → Consistency, Visual, Insights |
| Pre-create workflow | Production Brief: idea → asset decisions → create storyboard |
| In-modal apply | Director: memory + consistency suggestions; Asset Evolution: proposal apply |
| Scene micro-actions | Insights rail: Apply/Ignore scene suggestions (localStorage ignore list) |
| Asset decision persistence | localStorage registry; filters planner/generation/director |
| Identity builder navigation | Brief build-new → `/studio/{kind}/new` + prefill |
| Domain checklists | Production Planner `domainReadiness`; Consistency readiness checks |
| Tool-targeted missing items | `ProductionMissingItem.toolId` op guidance items |

---

## Wat Studio deels heeft (GEDEELTELIJK BESTAAT)

| Capability | Wat werkt | Wat ontbreekt |
|------------|-----------|-----------------|
| **Asset guidance** | Brief rows, Evolution sections, Planner creationGuidance, Memory patterns | Unified priority; Director can't jump to tool |
| **Story guidance** | Story health, planner phases, Creative Review phases, Director advisories | Single narrative “fix story first” |
| **Image guidance** | Generation steps, visual readiness, fix cards | `generationPlan.recommendations` not in summary UI |
| **Audio guidance** | Planner audio status, Creative Review audio items, voice/music/sound tabs | No guided “complete audio” sequence |
| **Render guidance** | Render strategy in Consistency, Vidu/Animation summaries | No unified pre-render checklist with actions |
| **Quick actions** | Per-panel buttons (open library, create new, apply suggestion) | No global quick-action strip |
| **Missing elements UX** | Shown in Creative Review + Planner guidance + Evolution | Duplicated; Planner `recommendations`/`missingItems` full list not in Production tab |
| **Production workflow** | Brief → workspace; domain readiness phases | No tracked workflow state (brief done → images done → render ready) |
| **Completion tracking** | Asset decision badges; domain ✓/○; ignored suggestion IDs | No “5/12 creation tasks done” |

---

## Wat Studio nog mist (ONTBREEKT)

1. **Unified Creation Assistant entry** — one “what should I do next?” surface
2. **Cross-domain priority ranking** — merge fixes, missing, recommendations with explicit order
3. **Workflow completion model** — persistent task state beyond asset decisions
4. **Director ↔ workspace navigation** — suggestions that open the right tab/field
5. **Assistant persona / copy layer** — consistent NL/EN voice (“Studio suggests…”)
6. **Post-apply feedback loop** — mark guidance addressed; don’t re-show until stale
7. **Brief-to-workspace continuity** — surface brief decisions + memory in workspace assistant
8. **Scene ↔ project bridge** — Insights rail scene tasks vs Creative Review project tasks

---

## Welke onderdelen dubbel zouden zijn

Building a **new** Creation Assistant that re-implements:

| Would duplicate | Already in |
|-----------------|------------|
| Quality / readiness score | Creative Review + Unified readiness |
| Missing assets list | Asset Evolution + Planner + Creative Review |
| Story phase status | Planner + Creative Review |
| Recommendations merge | Creative Review (already merges plan + generation + memory) |
| Open tool buttons | Creative Review, Planner guidance, Consistency |
| Memory “start with…” | Production Memory panel |
| Fix suggestions | `buildReadinessFixActions` pipeline |
| Production insights bundle | `buildStudioProductionInsights` (inspector rail) |

**Safe approach:** new UI shell + `buildCreationAssistantPlan()` that **projects** from Creative Review + top-N fixes + creationGuidance + optional next scene suggestion — **zero new planners**.

---

## Aanbevolen volgende sprint

### Sprint: Creation Assistant Consolidation (not rebuild)

**Doel:** één assistant-ervaring zonder nieuwe engines.

1. **`buildCreationAssistantView()`** — thin projection layer:
   - Input: output of `buildCreativeReview()` + top 3 `unified.fixes` + `creationGuidance[0..n]` + brief decision summary if present
   - Output: ordered `nextActions[]` with `{ priority, messageKey, toolId, kind, completed? }`

2. **UI: Creation Assistant panel or dock**
   - Option A: replace/supplement inspector rail on Story tab
   - Option B: floating “Next steps” drawer available from all tabs
   - Reuse `StudioAiSuggestionCard` + existing open-tool wiring

3. **Wire hidden data**
   - Show `plan.recommendations` in Production tab OR delegate entirely to assistant
   - Show `generationPlan.recommendations` in generation summary

4. **Director modal bridges**
   - Add `onSwitchTool` to proposal flow for consistency/memory items with `toolId`

5. **Minimal completion tracking**
   - Extend asset decision pattern: `hc-creation-assistant-dismissed-{storyboardId}` for acknowledged items (client-only, no schema)

6. **Do NOT build**
   - New readiness/consistency/planner engines
   - New AI/LLM layer
   - Duplicate Creative Review tab content verbatim

### Success criteria

- User opens one surface and sees **prioritized next 5 actions** with working open-tool links
- No increase in duplicate recommendation text across tabs (assistant replaces or links, not copies)
- All strings NL/EN via existing keys where possible

---

## Referenties

- Reality audit detail: [creation-assistant-reality-audit.md](./creation-assistant-reality-audit.md)
- Related foundations: Production Brief, Production Memory, Creative Review foundation reports in `docs/`
