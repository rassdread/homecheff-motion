# Production Brief Reality Audit

## Hoe nieuwe verhalen nu ontstaan

**Vóór deze sprint:**

1. Gebruiker klikt **Nieuw verhaal** (`StudioNewStoryButton`)
2. `createDefaultStudioStoryboard()` maakt direct een leeg storyboard aan (POST `/api/studio/storyboards`)
3. Redirect naar `/studio?storyboardId=…` — workspace met **0 scènes**
4. Gebruiker typt idee pas in **AI Director** (`StudioDirectorProposalFlow`) in de workspace
5. Production Planner draait op leeg storyboard → zwakke structuur, weinig asset-inzicht
6. Asset Evolution en Character Identity komen pas **na** eerste proposal/apply

**Entry points:** `/studio/storyboards`, `/studio/storyboards/new`, lege studio shell, maak-choice page.

**Persistente velden bij create:** `title`, `description`, `promptStyleProfile`, `directorProfile` — geen `aiDirectorPrompt` bij create.

## Welke gegevens AI Director pas later ontdekt

| Laat (na scènes/proposal) | Kon upfront uit brief |
|---------------------------|------------------------|
| Story arc per scène | Doel, topic, audience intent |
| Asset gaps per scène | Director/style profile, mood |
| Image readiness | Target scene/shot count |
| Action chains | Voice/music/sound preferences uit tekst |
| Per-scene music/sound cues | Recurring library matches |
| Identity consumption rationales | Style strength, content type |
| Render strategy confidence | Brand/product/location intent (regex) |
| Unified readiness score | CTA / resolution intent |

`enrichIdeaWithProductionPlan` voegt metadata toe aan de idea-string, maar op een nieuw storyboard is de plan-output leeg tot de eerste proposal.

## Welke productie-informatie vooraf verzameld kan worden

- **Doel** — `extractProposalTopic(idea)`
- **Content type / stijl** — `interpretAiDirectorPrompt(idea)`
- **Actie-intensiteit** — action token extraction + sport/dynamic keywords
- **Geschatte duur, scènes, shots** — Production Planner + Director synthetic flow (5 scènes default)
- **Hoofdpersonages, locaties, props** — entity keywords + library token match + recurring detection
- **Wereld** — world profile van recurring assets of gekoppelde characters/locations
- **CTA** — resolution-phase text beats uit director proposal
- **Aanbevelingen** — production plan recommendations + missing items

## Welke systemen al geschikt zijn voor brief-data

| Systeem | Brief-ready |
|---------|-------------|
| `interpretAiDirectorPrompt` | ✅ style, mood, director profile |
| `buildDirectorProposal` | ✅ synthetic scenes, asset proposals |
| `buildStudioProductionPlan` | ✅ extended with `productionBrief` override |
| `findRecurringMatchesForIdea` | ✅ project memory + token match |
| `buildStoryboardAssetEvolution` | ✅ werkt beter met mock storyboard |
| `buildStoryboardActionIntelligence` | ✅ via director proposal |
| `enrichIdeaWithProductionPlan` | ✅ nu ook `enrichIdeaWithProductionBrief` |
| Prisma `aiDirectorPrompt` | ✅ kolom bestaat, nu ook bij create |

## Welke velden ontbreken

Geen schema-migratie nodig. Optioneel later:

- Dedicated `productionBriefJson` kolom voor structured snapshot
- Brief revision history
- Asset choice persistence (use/build/skip) per brief

## Welke systemen overlappen

- **AI Director prompt** vs **Production Brief** — brief is gestructureerde superset; `aiDirectorPrompt` blijft canonical free-text
- **Production Planner** vs **Brief story preview** — brief gebruikt planner output; planner leest brief terug bij empty storyboard
- **Asset Evolution panel** vs **Brief asset proposals** — zelfde engines, brief toont eerder in create flow
- **Director proposal flow in workspace** vs **Brief wizard** — workspace flow blijft voor edits; wizard voor nieuwe verhalen

## Wat Production Brief moet samenbrengen

```
User idea
  → interpretAiDirectorPrompt (style)
  → findRecurringMatchesForIdea (memory)
  → buildDirectorProposal (scenes, assets, audio plan)
  → buildStudioProductionPlan (duration, shots, gaps)
  → StudioProductionBrief (structured output)
  → UI: brief review → story preview → create + apply proposal
```
