# Story Quality & Director Orchestration Audit Report

**Date:** 2026-06-06  
**Scope:** Pure audit — geen code, geen migraties, geen nieuwe intelligentie, geen nieuwe planners/tabs/engines.  
**Doel:** Bewijzen waarom Studio nog generieke scènes produceert terwijl de architectuurlaag aanwezig is.

---

## Samenvatting

| Bevinding | Ernst |
|-----------|-------|
| Story Architect produceert structuur, maar **geen unieke scènecopy** | Kritiek |
| `beatKey`-teksten (“Onthul wat {message} interessant maakt”) worden **niet** in scènes gebruikt | Kritiek |
| `sceneParamsFromStoryArchitecture()` levert **dezelfde params per scène** (alleen `moment`-id verschilt) | Kritiek |
| `extractProposalTopic()` / `topicFromIdea()` trunceren prompt → **herhaling overal** | Kritiek |
| Director leidt **shots/camera/energy**, niet titel/beschrijving | Hoog |
| Asset-suggesties kopiëren **topic-string** als naam, geen entity-extractie | Hoog |
| Geen cross-scene uniqueness check voor copy | Hoog |
| Legacy `sceneTemplateKeys()` bestaat maar wordt **niet aangeroepen** | Medium |

**Kern:** Het probleem is geen gebrek aan systemen, maar een **ontbrekende vertaallaag** tussen Story Architect en scene generation — plus **topic-as-single-variable** injectie.

> **Let op:** Het [Story Architect Foundation Report](./story-architect-foundation-report.md) claimt dat scènetekst “narratieve momenten volgt in plaats van de ruwe prompt te herhalen”. Deze audit toont aan dat die claim **in de huidige implementatie niet klopt** voor daadwerkelijke scene copy — alleen template-shells wisselen; `{storyGoal}`/`{message}`/`{topic}` blijven identiek.

---

## Huidige flow (feitelijk)

```
User Prompt (raw `idea`)
    ↓
Production Brief enrichment (string prefix op idea)
    ↓
Production Memory → Creative Review → Creation Assistant → Timeline → Patterns → Snapshot
    ↓
buildStoryArchitecture({ userIdea: idea })   ← raw idea, niet enrichedIdea
    ↓
enrichIdeaWithStoryArchitecture (machine lines → idea prefix)
    ↓
Decision Memory → Insights Hub
    ↓
buildStudioProductionPlan + Animation Plan enrichment
    ↓
interpretAiDirectorPrompt(enrichedIdea)      ← alleen style/profile/moods
extractProposalTopic(idea)                   ← raw idea, eerste zin ≤72 chars
    ↓
buildSyntheticFlow(count, topic)               ← interne titels: "{topic} 1", "{topic} 2"
buildAiDirectorDirection()                   ← shotType, camera, energy per fase
    ↓
Per scène:
  pickStoryMomentForPhase() → moment.id
  architectureSceneTemplateKeys(moment.id)     ← i18n key selectie
  sceneParamsFromStoryArchitecture()           ← zelfde storyGoal/message/topic
  textBeatsForPhase(phase, topic)              ← overlay/narration beats, ook {topic}
  assignAssetsToScene({ idea: raw idea })      ← niet enrichedIdea
    ↓
resolveProposedSceneText() → finale title/description/action
```

**Volgorde:** Architect draait **vóór** Director in de enrichment-keten, maar **scene copy komt niet uit Architect noch Director** — alleen uit i18n-templates + gedeelde params. Production Planner en Animation Planner verrijken `enrichedIdea` voor **style/shot planning**, niet voor scènetekst.

**Key files:**

| Stap | Bestand |
|------|---------|
| Orchestrator | `src/lib/studio-director-proposal-builder.ts` |
| Story Architect | `src/lib/studio-story-architecture.ts` |
| Text resolution | `src/lib/studio-director-proposal-apply.ts` |
| Style interpreter | `src/lib/studio-ai-director-interpreter.ts` |
| Shot direction | `src/lib/studio-ai-director-direction.ts` |
| Templates | `src/i18n/locales/nl.ts`, `src/i18n/locales/en.ts` |

---

## Trace per stap

### 1. User Prompt

| | |
|---|---|
| **Input** | Volledige user prompt, bv. *"Een filmpje waar ik mijn reis door de markt in Marrakech laat zien…"* |
| **Output** | `params.idea` (getrimd) |
| **Geconsumeerd?** | Ja — maar vrijwel overal als **één topic-string** via `extractProposalTopic()` / `topicFromIdea()` |
| **Genegeerd?** | Detail na eerste zin; enriched prefixes (`[Story architecture:…]`, `[brief:…]`) worden **niet** gebruikt voor storyGoal/message/scène-copy |

```180:189:src/lib/studio-director-proposal-builder.ts
export function extractProposalTopic(idea: string): string {
  const trimmed = idea.trim().replace(/\s+/g, " ");
  // ...
  const firstSentence = trimmed.split(/[.!?]/)[0]?.trim() ?? trimmed;
  if (firstSentence.length <= 72) {
    return firstSentence;
  }
  return `${firstSentence.slice(0, 69).trim()}…`;
}
```

### 2. Production Brief

| | |
|---|---|
| **Input** | `StudioProductionBrief` (goal, CTA, characters, world, …) |
| **Output** | String-prefix op idea via `enrichIdeaWithProductionBrief()` |
| **Geconsumeerd?** | `buildStoryArchitecture()` gebruikt **`productionBrief.goal`** en **`callToAction`** als die als param meegegeven worden |
| **Genegeerd?** | Brief-enrichment op de **string** beïnvloedt Architect **niet** — Architect leest `userIdea: idea` (raw), niet enriched |

Zonder `productionBrief`-object: `storyGoal = "Share {topic}"`, `message = topic` (zie `deriveStoryGoal` / `deriveMessage` in `studio-story-architecture.ts`).

### 3. Story Architect

| | |
|---|---|
| **Input** | Raw idea + optioneel brief/storyboard/memory |
| **Output** | `storyGoal`, `theme`, `message`, `storyMoments[]`, `storyStructure[]`, `narrativeFlow[]`, `directorContextLines[]`, `recommendationKeys[]` |
| **Geconsumeerd voor scènes?** | Alleen **`moment.id`** → template key; **`storyGoal`/`message`** als i18n params (identiek per scène) |
| **Genegeerd voor scènes?** | `beatKey`, `theme`, `narrativeFlow`, `directorContextLines`, `recommendationKeys`, `storyStructure` status |

### 4. Narrative Moments

| | |
|---|---|
| **Input** | Vaste 5 definities (departure/discovery/conflict/breakthrough/closing) + gedeelde `beatParams` |
| **Output** | Per moment: `labelKey`, `beatKey`, `beatParams`, `sceneOrders`, `status` |
| **Geconsumeerd?** | `moment.id` → `architectureSceneTemplateKeys(moment.id)` |
| **Genegeerd?** | `beatKey` + beat-teksten — **alleen UI** in Story Architecture panel |

### 5. Director Proposal (scene loop)

| | |
|---|---|
| **Input** | `storyArchitecture`, `flowInput`, `interpretAiDirectorPrompt`, raw `topic` |
| **Output** | `ProposedScene[]` met `titleKey`, `descriptionKey`, `actionKey` + params |
| **Geconsumeerd?** | Keys → `resolveProposedSceneText()` bij apply |
| **Uniek per scène?** | Alleen template-shell + `scene` index; **zelfde storyGoal/message/topic** |

Scene loop (~L986–1042 in `studio-director-proposal-builder.ts`):

1. `pickStoryMomentForPhase(storyArchitecture, phase)`
2. `architectureSceneTemplateKeys(moment.id)` → i18n keys
3. `sceneParamsFromStoryArchitecture()` → shared params
4. `textBeatsForPhase(phase, sceneParams.topic)`
5. `assignAssetsToScene({ idea: raw idea })`

### 6. Generated Scenes

| | |
|---|---|
| **Input** | ProposedScene keys + params |
| **Output** | `"Opening — Share een filmpje waar ik…"`, `"Ontdekking — een filmpje waar ik…"`, etc. |
| **Bron** | i18n templates, **niet** AI, **niet** beatKey |

---

## Wordt Story Architect echt gebruikt?

| Veld | Geproduceerd in | Geconsumeerd in | Invloed op scènes? |
|------|-----------------|-----------------|-------------------|
| **storyGoal** | `deriveStoryGoal()` — zonder brief: `"Share ${topic}"` | `sceneParamsFromStoryArchitecture()` → i18n `{storyGoal}` | **Ja, maar identiek in elke scène** |
| **theme** | `deriveTheme()` — brief labelKey of memory pattern | In `beatParams`, **niet in scene i18n keys** | **Nee** — templates gebruiken geen `{theme}` |
| **message** | `deriveMessage()` — zonder brief: **= volledige topic** | i18n `{message}` | **Ja, maar identiek in elke scène** |
| **storyMoments** | `buildStoryMoments()` — 5 vaste momenten | `pickStoryMomentForPhase()` → template key | **Alleen als fase-selector** |
| **narrativeFlow** | `storyMoments.map(m => m.labelKey)` | `enrichIdeaWithStoryArchitecture()` → idea prefix | **Nee** voor scènetekst |
| **directorContextLines** | `buildDirectorContextLines()` | Idea enrichment prefix | **Nee** voor scènetekst |
| **recommendationKeys** | `buildRecommendationKeys()` | Creation Assistant / Insights / UI gaps | **Nee** voor scènetekst |
| **beatKey** | Per moment definitie | **Alleen** `MomentRow` UI panel | **Nee** voor scènetekst |

```320:331:src/lib/studio-story-architecture.ts
export function sceneParamsFromStoryArchitecture(/* ... */): Record<string, string> {
  return {
    ...moment.beatParams,   // storyGoal, theme, message, moment — SAME per moment except moment id
    topic: architecture.message.slice(0, 72) || architecture.storyGoal.slice(0, 72),
    scene: String(sceneIndex + 1),
    scenes: String(sceneCount),
  };
}
```

**Test bewijs:** `studio-story-architecture-foundation.test.ts` — test “provides distinct scene params per moment” asserteert alleen dat `departureParams.moment !== climaxParams.moment` en template key het moment-id bevat. **Geen assertie op unieke titels of beschrijvingen.**

---

## Narrative Moments audit

**Antwoord: A — vooral labels.**

| Moment | Template titel (NL) | Unieke copy? |
|--------|---------------------|--------------|
| Departure | `"Opening — {storyGoal}"` | Shell + gedeelde goal |
| Discovery | `"Ontdekking — {message}"` | Shell + gedeelde message |
| Conflict | `"Opbouw — {storyGoal}"` | Shell + gedeelde goal |
| Breakthrough | `"Hoogtepunt — {message}"` | Shell + gedeelde message |
| Closing | `"Afsluiting — {message}"` | Shell + gedeelde message |

De **beatKey**-teksten zijn rijker en moment-specifiek:

- Discovery beat: *"Onthul wat {message} interessant maakt"*
- Conflict beat: *"Bouw spanning rond {storyGoal}"*

Maar `beatKey` wordt **nirgends** in `studio-director-proposal-builder.ts` gelezen — alleen in `studio-workspace-story-architecture-panel.tsx` (`MomentRow`).

**Discovery vs Conflict:** verschillen in **i18n template shell** ("Verken het idee…" vs "Verhoog de inzet…"), maar `{storyGoal}` en `{message}` zijn **identiek** — het onderwerp herhaalt zich letterlijk.

---

## Scene generation audit

### Wat ontstaat waar?

| Output | Bron | Bewijs |
|--------|------|--------|
| **Scene title** | `studio.storyArchitect.scene.{momentId}.title` + params | `architectureSceneTemplateKeys()` |
| **Scene description** | `studio.storyArchitect.scene.{momentId}.description` + params | Idem |
| **Scene action** | `studio.storyArchitect.scene.{momentId}.action` + params | Idem |
| **Shot recommendation** | `buildAiDirectorDirection()` → `buildAutoShotPlan()` | shotType, cameraMovement, sceneEnergy per arcPhase |
| **Text beats / overlays** | `textBeatsForPhase()` → `studio.directorProposal.textBeat.*` | Alle met `{topic}` |
| **Narration preview** | `analyzeVoiceDirector(mockStoryboard)` | Consumeert gegenereerde scene titles/descriptions downstream |

### i18n templates (NL voorbeeld)

```
studio.storyArchitect.scene.departure.title       → "Opening — {storyGoal}"
studio.storyArchitect.scene.departure.description → "Introduceer het verhaal en waarom {message} ertoe doet"
studio.storyArchitect.scene.discovery.title        → "Ontdekking — {message}"
studio.storyArchitect.scene.discovery.description → "Verken het idee achter {storyGoal}"
studio.storyArchitect.scene.conflict.title        → "Opbouw — {storyGoal}"
studio.storyArchitect.scene.breakthrough.title    → "Hoogtepunt — {message}"
studio.storyArchitect.scene.closing.title         → "Afsluiting — {message}"
```

### Niet gebruikt voor copy

- User prompt (behalve als topic-truncatie)
- Story Architect beats
- Production Brief string enrichment
- Enriched idea string
- Creative Review / Insights output

### Legacy dead path

`sceneTemplateKeys(phase)` → `studio.directorProposal.scene.*` templates (met `{topic}`) is **gedefinieerd maar nooit aangeroepen** — enkel `architectureSceneTemplateKeys` wordt gebruikt.

### Fallback zonder `t()` resolver

In `proposalMockStoryboard()`:

- `title` → `scene.titleParams.topic` (niet title-tekst)
- `action` → `scene.actionParams.topic` (niet action-tekst)

---

## Prompt repetition audit

### Mechanisme (keten)

1. **`topicFromIdea()` / `extractProposalTopic()`** — duplicaatlogica, eerste zin ≤72 chars
2. **`deriveMessage()`** — zonder brief → `topic` (volledige eerste zin)
3. **`deriveStoryGoal()`** — zonder brief → `"Share ${topic}"`
4. **`sceneParamsFromStoryArchitecture()`** — `topic = message.slice(0,72) || storyGoal.slice(0,72)`
5. **`textBeatsForPhase()`** — elke fase: `{ topic }`
6. **`buildProposalTextSummary()`** — hook/core/CTA allemaal `{ topic }`
7. **`suggestNewAsset()`** — `name: topic.slice(0, 80)`
8. **`assignAssetsToScene()`** — `candidateName: extractProposalTopic(params.idea)`
9. **`buildSyntheticFlow()`** — `title: "${topic} ${order + 1}"`

### Waarom "een filmpje waar ik…" overal terugkomt

User schrijft vaak: *"Een filmpje waar ik [verhaal]…"*

→ Eerste zin = hele prompt (≤72 chars)  
→ `message` = die zin  
→ `{message}` in Ontdekking/Hoogtepunt/Afsluiting  
→ `{storyGoal}` = `"Share Een filmpje waar ik…"`  
→ `{topic}` in text beats, asset namen, synthetic flow, narration context

Truncation is de **bron** van het probleem, geen downstream-fix.

---

## Scene titles audit

Titels komen **uitsluitend** uit vaste i18n keys met arc-labels (Opening, Ontdekking, Opbouw, Hoogtepunt, Afsluiting) — **niet** uit verhalende titels zoals "De Eerste Ontmoeting" of "Het Geheim van de Markt".

Story Architect **maakt nooit eigen titels**. Er is geen title-generation stap; alleen **fase-label + topic injectie**.

`buildSyntheticFlow()` interne titels (`"{topic} 1"`) worden overschreven door template-resolutie, tenzij bestaande scènes `keepTitle` forceren.

---

## Asset suggestion audit

| Stap | Gedrag |
|------|--------|
| **Bestaande library match** | Token scoring tegen `promptTokens` uit **volledige raw idea** |
| **Geen match + keyword hit** | `suggestNewAsset()` → **naam = `extractProposalTopic(idea)`** |
| **Recurring detection** | `candidateName: extractProposalTopic(params.idea)` |
| **Per-scene variatie** | Geen — zelfde topic, zelfde suggested name |

```291:305:src/lib/studio-director-proposal-builder.ts
function suggestNewAsset(type, idea, index) {
  const topic = extractProposalTopic(idea);
  return {
    name: topic.slice(0, 80) || type,
    // ...
  };
}
```

**Antwoord:** Geen echte entity-extractie. Het is **prompt-kopie** met keyword-gated suggestie.

**Extra:** `assignAssetsToScene` gebruikt **raw `idea`**, niet `enrichedIdea` — brief/Architect context bereikt asset-logica niet.

---

## Director orchestration audit

### Feitelijke rolverdeling

| Systeem | Leidt voor… | Leidt níet voor… |
|---------|-------------|------------------|
| **Story Architect** | Structuur-UI, idea prefix, template key selectie | Unieke scènecopy |
| **AI Director (`interpretAiDirectorPrompt`)** | directorProfile, moods, camera language | Titels, beschrijvingen |
| **`buildAiDirectorDirection`** | shotType, movement, energy per fase | Narratieve content |
| **Production Planner** | Plan context op enriched idea | Scene copy |
| **Animation Planner** | Shot timing preview | Scene copy |
| **Scene Generation Orchestrator** | Image readiness / missing assets | Scene copy |
| **Voice/Music/Sound Director** | Audio plan op mock storyboard | Genereren van unieke copy |

**Director is niet de leider van het verhaal** — hij is **visuele regisseur** (shots/energy). De **copy-leider bestaat niet**; copy komt uit **statische templates**.

Enrichment-volgorde is wél logisch (Brief → Memory → … → Architect → Planner), maar de **scene loop leest terug naar raw `idea` + templates**, waardoor de enrichment-keten voor tekst **circulair nutteloos** is.

### Architect vs Director volgorde

**Niet omgedraaid** — Architect draait vóór scene generation. Maar Architect **leidt scene copy niet**; het selecteert alleen welke template-variant per fase wordt gebruikt.

---

## Unique scene analysis

| Factor | Gebruikt voor copy? |
|--------|---------------------|
| **Arc phase / moment id** | Ja — kiest template shell |
| **Scene index `{scene}/{scenes}`** | Ja — alleen in description suffix |
| **Vorige scène copy** | **Nee** |
| **Volgende scène copy** | **Nee** |
| **Narrative role beyond phase** | **Nee** |
| **storyMoment.beatKey** | **Nee** |
| **Onderwerp / positie** | **Ja** — enkel `{topic}`/`{storyGoal}`/`{message}` |

**Shot diversity:** `buildAiDirectorDirection` varieert shotType/camera/energy — telt mee in `directorQualityScore` maar **niet** in tekst-uniekheid.

**Emotion:** `EMOTION_BY_PHASE` levert vaste emotie per fase — geen prompt-afleiding.

Geen evidence van cross-scene uniqueness checks in proposal builder.

---

## Quality gap analysis

| Ontbrekende laag | Status | Impact |
|------------------|--------|--------|
| **Scene Beat Translation** | `beatKey` bestaat, niet wired naar scenes | Hoog |
| **Narrative Moment Consumption** | Moment = template selector only | Hoog |
| **Unique Scene Builder** | Afwezig | Hoog |
| **Character Extraction** | Alleen token match + topic copy | Hoog |
| **Location Extraction** | Idem | Hoog |
| **Per-scene param derivation** | Eén shared param set | Hoog |
| **Cross-scene dedupe** | Afwezig voor copy | Medium |
| **Prompt entity parsing** | Alleen eerste-zin truncatie | Hoog |

Architect **produceert geen scene-level artifacts** (geen `sceneTitle`, `sceneBeat`, `sceneEntities`) — alleen aggregate fields + moment metadata.

---

## Concrete oorzaken van generieke scènes

1. **Template-first architectuur** — 5 vaste i18n shells met 3 placeholders (`storyGoal`, `message`, scene index).
2. **Single-variable injectie** — `topic`/`message`/`storyGoal` convergeren naar dezelfde prompt-snippet.
3. **`beatKey` disconnect** — rijkere moment-teksten zijn UI-only.
4. **Raw idea fork** — enrichment chain vs scene loop (`idea` vs `enrichedIdea`).
5. **Geen title/description generator** — Story Architect ontwerpt structuur, geen copy.
6. **Asset fallback = prompt copy** — versterkt het gevoel dat alles hetzelfde is.
7. **Tests valideren structuur, niet kwaliteit** — “distinct scene params” = verschillend `moment`-label, niet unieke output.

---

## Onderbenutte bestaande systemen

| Systeem | Huidige consumptie | Potentieel onbenut |
|---------|-------------------|-------------------|
| Story Architect `beatKey` | UI panel | Scene description/action |
| Production Brief | goal/CTA als object; string enrichment genegeerd door Architect input | Rijkere goal/message derivatie |
| `directorContextLines` | Idea prefix | Scene param building |
| Creative Review / Insights | Tasks/adviezen | Scene gap filling |
| Production Memory patterns | theme labelKey | Per-scene theming |
| Action Intelligence | Post-scene shot/action planning | Scene action text |
| Identity Systems | Shot bias | Character/location names in copy |
| Director Decision Memory | Retention/scene count prefs | Copy style prefs |

---

## Ideale flow (doelbeeld — niet bouwen in deze sprint)

```
User Prompt
    ↓
Production Brief (gestructureerde entiteiten: goal, CTA, characters, settings)
    ↓
Story Architect → per-moment BEATS (niet alleen labels)
    ↓
Scene Beat Translation Layer  ← ONTBREEKT VANDAAG
    • moment.beatKey → title/description seeds
    • per-scene entities uit prompt/brief
    • dedupe vs vorige scène
    ↓
Director Proposal (copy + shots)
    ↓
Asset assignment (entities, niet topic-copy)
    ↓
Apply → Scenes
```

Director zou **copy coördineren** nadat beats vertaald zijn — niet alleen camera.

---

## Aanbevolen volgende sprint

**Naam:** Story Beat Translation & Narrative Consumption Sprint  
**Focus:** Bestaande data beter consumeren — **geen nieuwe AI/planners/tabs/engines.**

| # | Taak | Rationale |
|---|------|-----------|
| 1 | Wire `beatKey` (of afgeleide beat-tekst) naar `titleKey`/`descriptionKey`/`actionKey` in proposal builder | Directe fix voor generieke shells |
| 2 | Per-scene params: afleiden uit brief + moment (niet één `topic` overal) | Stopt prompt-herhaling |
| 3 | Entity extractie heuristiek (settings, subjects uit prompt/brief) voor asset names | Stopt “prompt als character name” |
| 4 | Gebruik `enrichedIdea` / brief fields in `assignAssetsToScene` | Consistent met enrichment chain |
| 5 | Cross-scene similarity guard (title/description dedupe) | Voorkomt near-duplicates |
| 6 | Tests op **output-kwaliteit**: unieke titels, geen identieke `{message}` in 3+ scènes | Vangt regressie |

---

## Expliciet NIET bouwen

- Geen nieuwe AI / LLM providers
- Geen nieuwe planners (Production/Animation/Vidu)
- Geen schema migraties
- Geen nieuwe Studio tabs
- Geen nieuwe engines (Scene Orchestrator, Render Strategy, etc. bestaan al)
- Geen “Story Architect v2” — de laag **bestaat**; consumptie ontbreekt

---

## Validatie

Audit uitgevoerd via code trace in:

- `src/lib/studio-director-proposal-builder.ts`
- `src/lib/studio-story-architecture.ts`
- `src/lib/studio-director-proposal-apply.ts`
- `src/lib/studio-ai-director-interpreter.ts`
- `src/lib/studio-ai-director-direction.ts`
- `src/i18n/locales/nl.ts` / `en.ts`
- `src/components/studio/studio-workspace-story-architecture-panel.tsx`

Geen code gewijzigd. Geen aannames zonder file-bewijs.

---

## Gerelateerde documenten

- [Story Architect Foundation Report](./story-architect-foundation-report.md)
- [AI Director Proposal Report](./ai-director-proposal-report.md)
- [Production Brief Reality Audit](./production-brief-reality-audit.md)
- [Creation Assistant Reality Audit](./creation-assistant-reality-audit.md)
