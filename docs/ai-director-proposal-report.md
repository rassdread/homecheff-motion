# AI Director Proposal Report

## Welke bestaande systemen zijn hergebruikt

| Systeem | Pad | Rol in voorstel |
|--------|-----|-----------------|
| AI Director interpreter | `src/lib/studio-ai-director-interpreter.ts` | Brief → director profile, mood, pacing |
| AI Director direction | `src/lib/studio-ai-director-direction.ts` | Shot plan, quality score, arc phases |
| Auto shot planner | `src/lib/studio-auto-shot-planner.ts` | Camera / movement / energy per scène |
| Story intelligence | `src/lib/studio-story-intelligence.ts` | Indirect via direction builder |
| Voice director | `src/lib/studio-voice-director.ts` | Aanbevolen voice profile |
| Music director | `src/lib/studio-music-director.ts` | Aanbevolen muziekstijl + intensiteit |
| Sound director | `src/lib/studio-sound-director.ts` | Aanbevolen geluidssfeer + density |
| Scene API client | `src/lib/studio-storyboards-client.ts` | Toepassen via `createStudioSceneApi` / `updateStudioSceneApi` |
| Storyboard API client | `src/lib/studio-storyboards-client.ts` | Toepassen via `updateStudioStoryboardApi` |
| Workspace shell | `src/components/studio/studio-workspace-shell.tsx` | Entry boven Verhaaleditor |

Geen nieuwe providers, geen LLM, geen schema-migraties, geen timeline editor.

## Welke velden AI kan invullen

**Per scène (via voorstel → apply):**

- `title`, `description`, `action`
- `emotion`, `camera`, `shotType`, `cameraMovement`, `sceneEnergy`
- `durationSeconds`
- `locationId`, `characterIds[]`, `propIds[]` (alleen bestaande bibliotheek-IDs)

**Storyboard-niveau (alleen bij “Alles toepassen”):**

- `aiDirectorPrompt`, `aiDirectorStyleStrength`, `directorProfile`, `promptStyleProfile`
- `voiceEnabled`, `voiceProfile`, `narrationMode`
- `musicEnabled`, `musicStyle`, `musicIntensity`
- `soundEnabled`, `soundStyle`, `soundDensity`

**Alleen in preview (nog niet persistent):**

- Text beats (hook / highlight / CTA keys)
- Voorgestelde nieuwe personages, locaties, props (naam + reden)

## Hoe bestaande assets worden voorgesteld

1. Het idee wordt getokenized (`tokenizeForAssetMatch`) met extra aliases (HomeCheff, chef, garden, …).
2. Elk bibliotheek-item krijgt een score via `scoreAssetMatch(name, description, category, tokens)`.
3. Bij score ≥ drempel wordt het bestaande asset voorgesteld als `characterRefs` / `locationRef` / `propRefs`.
4. Zonder match én met entiteit-keywords in het idee → `proposedCharacters` / `proposedLocation` / `proposedProps` (niet opgeslagen).
5. **Nooit** automatisch “Chef Mascot Copy” — altijd de bibliotheek-ID van het bestaande item.

## Hoe voorstellen worden toeepast

| Knop | Gedrag |
|------|--------|
| **Alles toepassen** | Storyboard-patch + alle scènevelden + asset-koppelingen |
| **Alleen scènes toepassen** | Scènetitels, beschrijving, camera, emotie; geen storyboard audio |
| **Alleen assets toepassen** | Alleen `locationId`, `characterIds`, `propIds` op bestaande scènes |
| **Opnieuw voorstellen** | Herbouwt in-memory voorstel; geen DB writes |
| **Annuleren** | Sluit preview; geen writes |

- Leeg videoverhaal → scènes worden **aangemaakt** via `createStudioSceneApi`.
- Bestaand videoverhaal → scènes worden **bijgewerkt** op `existingSceneId` / volgorde.
- Nieuwe assets uit het voorstel worden **niet** automatisch aangemaakt; gebruiker ziet een hint om ze handmatig in Assets te maken.

## Welke bestanden zijn aangepast

| Bestand | Wijziging |
|---------|-----------|
| `src/types/studio-director-proposal.ts` | Voorstelmodel (in-memory) |
| `src/lib/studio-director-proposal-builder.ts` | Heuristische voorstelgenerator |
| `src/lib/studio-director-proposal-apply.ts` | Apply via bestaande APIs |
| `src/lib/studio-director-proposal.test.ts` | Unit tests |
| `src/components/studio/studio-director-proposal-flow.tsx` | Entry + preview UI |
| `src/components/studio/studio-workspace-shell.tsx` | Wiring boven Verhaaleditor |
| `src/i18n/locales/nl.ts` | NL copy `studio.directorProposal.*` |
| `src/i18n/locales/en.ts` | EN parity |
| `docs/ai-director-proposal-report.md` | Dit rapport |

## Welke beperkingen nog bestaan

- **Geen LLM** — voorstellen zijn regelgebaseerd; creatieve copy volgt vaste arc-templates met `{topic}`.
- **Text beats** worden getoond in het model maar nog niet naar scène-/storyboard-velden geschreven (geen dedicated text-beat persist API in deze sprint).
- **World profiles** worden niet automatisch gekoppeld (wereld zit op locatie via `worldProfileId`; alleen bestaande locatie-IDs worden gelinkt).
- **Voice/music/sound scene-level cues** (per-scène music cue overrides) worden niet gezet — alleen storyboard-niveau bij “Alles toepassen”.
- **Regenerate** gebruikt dezelfde heuristiek; geen variatie-seed.

## Wat P2 blijft

- LLM-gestuurde verhaalcopy en rijkere scene-beschrijvingen (bestaande OpenAI stack, expliciet nieuwe feature).
- “Maak voorgesteld asset aan” inline vanuit preview (nu handmatig via Assets-tab).
- Text beats / overlays / CTA direct persisten naar Director V2 text-sectie.
- World-toepassing op alle scènes in één klik.
- Voorstel op leeg videoverhaal + auto-select eerste scène na apply.
- E2E Playwright smoke voor proposal flow (mobile + desktop).
