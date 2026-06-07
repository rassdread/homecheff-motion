# Production Memory Reality Audit

## Welke productie-data al bestaat

| Bron | Data | Granulariteit |
|------|------|---------------|
| `StudioStoryboard` | title, aiDirectorPrompt, directorProfile, promptStyleProfile, voice/music/sound styles, scenes | Per storyboard |
| `StudioScene` | durationSeconds, shotType, cameraMovement, action, CTA-tekst | Per scene |
| `AnimationProject` | instantMode (story/transition), studioSourceStoryboardId, render counts | Per render |
| `StudioProjectMemorySnapshot` | asset usage, voices, styles, shotPatterns, library/narration audio | Cross-storyboard aggregaat |
| Production planners | estimated duration/shots, render strategy, generation order | Per huidig storyboard |

**Nieuw geaggregeerd (geen schema-migratie):** `productionRecords[]` op project memory — per-storyboard samenvattingen afgeleid uit bestaande Prisma-relaties.

## Welke geheugen-systemen al bestaan

- **Project Memory** — asset-gebruik (characters, locations, worlds, voices, styles, shot patterns)
- **Continuity score** — reuse alignment + consistency overview
- **Recurring asset detection** — idea ↔ library matching
- **Director memory suggestions** — reuse cards in proposal
- **Identity consumption trends** — completeness, geen productie-patronen

Deze systemen zijn **asset- en stijl-georiënteerd**, niet **productie-georiënteerd** (duur, shots, renderstrategie, promo-type).

## Welke patronen al impliciet aanwezig zijn

- Style pairs `(promptStyleProfile, directorProfile)` frequentie
- Shot patterns `(shotType, cameraMovement)` frequentie
- Voice profile storyboard counts
- Render strategy per huidig storyboard (planner), niet historisch
- Recurring asset matching op idee-tokens

## Welke systemen overlappen

| Overlap | Systemen |
|---------|----------|
| Asset reuse | Project Memory, Recurring Detection, Continuity, Director memory suggestions |
| Style | Project Memory styles, AI Director interpreter, Production Brief targetStyle |
| Shots | Shot planner, Action distribution, Project Memory shotPatterns (type/movement only) |
| Render | Render Strategy Planner (current only), Motion instantMode (per project) |

**Gap:** geen enkel systeem bracht **complete productie-profielen** samen.

## Welke informatie ongebruikt bleef

- Historische **instantMode** per gerenderd storyboard
- **Gemiddelde productieduur** en **shot counts** over storyboards
- **Promo-type clustering** (HomeCheff, Garden, Sports, …) uit idee/titel
- **CTA-scene aanwezigheid** in eerdere producties
- Production plan `recommendations` (deels berekend maar niet overal getoond)

## Welke productiekenmerken kunnen worden geleerd

Heuristisch (geen ML):

- Duur-buckets (short / medium / standard / long)
- Shot-buckets (compact / balanced / extended)
- Renderstrategie-voorkeur (story / action_chain / hybrid)
- Promo-patronen via keyword matching
- Terugkerende werelden, personages, stemmen, audiostijlen
- Verhaalstructuur-buckets (short / classic / extended arc)

## Wat Production Memory moet samenbrengen

1. `buildProductionMemoryProfile()` — één profiel per gebruiker/sessie
2. Advies-only integratie in Brief, Director, Planner, Orchestrator, Render
3. UI-sectie **Productiegeheugen / Production Memory**
4. Creation guidance: "Studio denkt dat dit lijkt op eerdere video's…"

Geen auto-toepassing, geen blocking, geen nieuwe AI/providers/database-tabellen.
