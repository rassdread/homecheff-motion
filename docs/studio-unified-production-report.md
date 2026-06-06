# Studio Unified Production Report

## Welke Motion-functionaliteit nu in Studio zit

| Functie | Waar in Studio | Hergebruikte component |
|--------|----------------|------------------------|
| Gekoppeld Motion-project | Productiebanner + projectkiezer | `fetchStoryboardMotionProjects` via `studioSourceStoryboardId` |
| Renderstatus | Tab **Renderstatus** | `RenderActivityStatusCard`, `InstantFinalProgressPanel`, status polling |
| Versies | Tab **Versies** | `VideoVersionsPanel` (inline, layout `detail`) |
| Tekst aanpassen | Tab **Tekst** + Versies-panel | `TextRerenderEditorModal` |
| Vertalen | Tab **Vertalen** | `LanguageExportPanel` + `bundleCatalog` |
| Downloaden | Tab **Downloaden** | `VideoVersionDownloadTrigger`, `VideoPreview` |
| Opnieuw maken | Tab **Tekst** (sectie) | `ProjectRerenderChoices`, `FullRerenderEditorModal`, quick full rerender |

## Welke redirects verwijderd zijn

- **Export-tab**: geen `MotionProjectList` meer met links naar `/videos/[id]`
- **Vertaal-tab**: geen secundaire projectlijst met outbound links
- Productieflow blijft op `/studio?storyboardId=...`

**Fallback deeplinks (bewust behouden):**
- Geavanceerde versievergelijking → `/videos/[id]/versions`
- Maak video (geen project) → `/animate/instant/import?storyboardId=...`

## Welke componenten zijn hergebruikt

- `VideoVersionsPanel`
- `LanguageExportPanel`
- `TextRerenderEditorModal` / `FullRerenderEditorModal`
- `InstantFinalProgressPanel`
- `RenderActivityStatusCard`
- `ProjectRerenderChoices`
- `VideoVersionDownloadTrigger`
- `useInstantPremiumStatusPolling`
- `fetchAnimationProjectDetail` / `getProjectLanguageExports`

## Welke tabs zijn toegevoegd

| Tab ID | NL | EN |
|--------|----|----|
| `render` | Renderstatus | Render status |
| `versions` | Versies | Versions |

Bestaande tabs **Vertalen** en **Exporteren → Downloaden** zijn inline geëmbed (geen link-out).

## Welke routes fallback zijn gebleven

- `/studio?storyboardId=...` — centrale workflow
- `/videos/[id]` — volledige projectdetail (deeplink)
- `/videos/[id]/versions` — Version Center vergelijking
- `/animate/instant/import?storyboardId=...` — eerste video maken

## Wat nog P2 is

- Volledige **Version Center** (lineage + compare panels) inline embedden
- **RenderActivityStatusCard** admin-only acties in Studio verbergen (deels al via `hideAdminDiagnostics`)
- Multi-project unified dashboard (meerdere gekoppelde videos tegelijk)
- Copy-as-draft opent nog geen inline editor in Studio (API redirect path)
- E2E Playwright smoke voor productietabs (mobile + Safari)

## Tests/build status

Run na implementatie:

```bash
npm run lint
npm run build
npm run test
```

Nieuwe tests: `src/lib/studio-unified-production.test.ts`
