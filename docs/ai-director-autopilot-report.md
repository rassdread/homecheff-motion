# AI Director Autopilot Report

## Welke systemen zijn hergebruikt

- **buildDirectorProposal** — uitgebreid, niet vervangen
- **buildAiDirectorDirection / buildAutoShotPlan** — shot plans, camera, energie per scène
- **analyzeVoiceDirector** — narratie + stemprofiel voor verhaal
- **buildMusicDirectorPlan / buildSoundDirectorPlan** — per-scène muziek- en geluidscues
- **buildVoiceIdentityPlan / resolveCharacterVoiceIdentity** — personage-stem matching
- **buildRenderReadinessSummary** patroon via **buildProposalRenderReadiness**
- **applyDirectorProposal** — bestaande Studio scene/storyboard APIs
- **StudioDirectorProposalFlow** — preview + apply UI

Geen LLM, geen nieuwe providers, geen schema migraties.

## Hoe productievoorstellen zijn uitgebreid

Proposal model **v2** bevat nu:

| Domein | Inhoud |
|--------|--------|
| Scènes | titel, beschrijving, actie, emotie, camera, shot, movement, energie, duration |
| Assets | personages (multi op climax/build-up), locatie, props, wereld |
| Audio | storyboard voice/music/sound + per-scène `sceneAudio` cues |
| Stemmen | `voices.characterVoices` met status ready/missing/inconsistent |
| Tekst | hook, kernboodschap, CTA, scene overlays, narratie preview |
| Renderstatus | groen/geel/rood + concrete aanbevelingen |

Mock storyboard embed nu personages/props/locaties zodat music/sound/voice directors correct plannen.

## Hoe asset matching werkt

- **scoreCharacterMatch / scoreLocationMatch / scorePropMatch** — naam, beschrijving, categorie, personality, visualKeywords, tags
- **Bestaande bibliotheek eerst** — drempel score ≥ 2
- **Geen duplicaten** — `usedCharacterIds`, `libraryHasSimilarName` voorkomt dubbele new-asset voorstellen
- **Wereld** — afgeleid van gekoppeld personage/locatie `worldProfile`
- **Climax/build-up** — optioneel tweede personage

## Hoe voice matching werkt

- Na asset assignment: `buildVoiceIdentityPlan` op mock storyboard
- Per gekoppeld personage: `resolveCharacterVoiceIdentity` voor storyboard-taal
- Status: **ready**, **missing** (stem uit), **inconsistent** (lock vs story override)
- Geen auto-save — alleen zichtbaar in preview

## Hoe text beats worden voorgesteld

- Per arc-fase: hook (opening), kernboodschap (discovery/build-up), highlight (climax), CTA (resolution)
- Scene overlays per fase — **preview only**
- Narratie preview uit `analyzeVoiceDirector` script (max 1200 tekens)
- **Alleen tekst** apply: schrijft narratie script naar storyboard; overlays blijven preview

## Hoe render readiness werkt

`buildProposalRenderReadiness` projecteert het voorstel op het storyboard en checkt:

- scènes (≥2), personages, locatie, stem, tekst, emotie, afbeeldingen

Resultaat: score %, level (ready/almost_ready/needs_work), checklist, aanbevelingen in begrijpelijke taal.

## Welke bestanden zijn aangepast

| Bestand | Wijziging |
|---------|-----------|
| `types/studio-director-proposal.ts` | v2 model + text/voices/readiness |
| `lib/studio-director-proposal-builder.ts` | enrichment, matching, planners |
| `lib/studio-director-proposal-readiness.ts` | **Nieuw** — readiness projection |
| `lib/studio-director-proposal-apply.ts` | audio/text modes, scene audio |
| `components/studio/studio-director-proposal-flow.tsx` | volledig productievoorstel UI |
| `components/studio/studio-workspace-shell.tsx` | worlds doorgeven |
| `lib/studio-director-proposal.test.ts` | autopilot tests |
| i18n `nl.ts` / `en.ts` | NL/EN parity |

## Wat nog P2 is

- Automatisch nieuwe assets aanmaken (bewust uit scope)
- LLM-rijkere sceneteksten
- Text overlay persist naar scene fields
- E2E Playwright voor autopilot flow
- Post-apply scene selectie / image generation trigger

## Tests/build status

Zie CI: `npm run lint`, `npm run build`, `npm run test`.
