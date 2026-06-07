# Creation Assistant Consolidation Audit

> Sprint audit — welke bestaande systemen dienen als bron, wat is zichtbaar vs verborgen, en hoe consolidatie zonder duplicatie werkt.

## Bronnen en hergebruik

| Bron | Wat levert het | Zichtbaar vóór consolidatie | Nu via Creation Assistant |
|------|----------------|----------------------------|---------------------------|
| **Creative Review** | missingElements, weaknesses, story/audio/render reviews | Creative Review tab (analyse) | Geprioriteerde acties (now/next) |
| **Production Planner** | creationGuidance, domainReadiness, recommendations | Alleen creationGuidance in Production tab | Nu doen + voortgang |
| **Unified Readiness** | checks, fixes, score, level | Consistency, Visual, Insights rail | Fix-taken + blockers |
| **Readiness Fix Actions** | issueKey, suggestedAsset, tool | Consistency panel (top 6) | Nu doen met open/useSuggestion |
| **Scene Generation Plan** | required/recommended images, steps | Visual panel, generation summary | Beeldtaken per rol (start/end/action) |
| **Asset Evolution** | missing per kind | Asset Evolution tab | Via Creative Review → asset tasks |
| **Production Brief** | asset decisions (localStorage) | Brief flow pre-workspace | Gefilterd via planner execution |
| **AI Director** | creativeReviewContext | In-modal enrichment | + creationAssistantContext met open tasks |

## Aanbevelingen die al bestaan (overlap)

| Aanbeveling | Systemen |
|-------------|----------|
| Missing characters | Planner creationGuidance, Evolution, Creative Review, Readiness fixes |
| Missing images | Generation plan, Visual panel, Creative Review image review |
| Story phase gaps | Planner storyStructure, Creative Review story review |
| Audio gaps | Planner audioPlanning, Creative Review audio items |
| Render readiness | Render strategy, Animation/Vidu summaries, Consistency |

**Consolidatie-regel:** dedupe op `category + messageKey + toolId + sceneOrder`. Creative Review tab blijft voor analyse; Creation Assistant voor acties.

## Acties die al bestaan

| Actie | Mechanisme |
|-------|------------|
| Open tool | `onSwitchTool(toolId)` |
| Open library | Production guidance buttons |
| Create new | Production guidance `createNew` |
| Use suggestion | Readiness fix `suggestedAssetId` |
| Apply proposal | Director / Asset Evolution (niet gedupliceerd) |

## Wat verborgen bleef vóór consolidatie

- `plan.recommendations` — berekend, niet in Production tab UI
- `generationPlan.recommendations` — berekend, niet in generation summary
- Cross-domain prioriteit — nergens
- Project-level “wat nu?” — verspreid over 12+ panels
- Director kon open taken niet zien als gestructureerde context

## Prioritering (geen nieuwe score)

| Tier | Regel |
|------|-------|
| **Nu doen** | High-priority fixes, creationGuidance, required missing images, missing audio, story blockers |
| **Bijna klaar** | Weaknesses, recommended images, partial audio, weak story phases |
| **Optioneel** | improvementSuggestions, opportunities, memory items |
| **Voltooid** | Passed unified checks, passed domainReadiness, strengths, ready audio |
| **Blokkades** | High-priority asset/image/fix/render subset + aggregate blockers |

Projectstatus afgeleid van bestaande `unified.level` + `domainReadiness`:

- `needs_work` + ≤1 domain → **Gestart**
- `needs_work` + >1 domain → **In opbouw**
- `almost_ready` → **Bijna klaar**
- `ready` → **Klaar voor render**

## Bewust niet gebouwd

- Geen nieuwe planners, readiness, consistency of review engines
- Geen LLM / provider laag
- Geen schema migraties
- Geen render start vanuit assistant
- Geen persistent dismiss/completion localStorage (volgende sprint)
- Director modal `onSwitchTool` (volgende sprint)

## Referenties

- Vorige audit: [creation-assistant-reality-audit.md](./creation-assistant-reality-audit.md)
- Implementatie: `src/lib/studio-creation-assistant.ts`
