# Studio Consistency Execution Audit

Per consistency-domein: hoe ver reikt de koppeling van **score/weergave** naar **uitvoering** (AI Director, beeldgeneratie, render)?

**Legenda koppeling**
- **Niet gekoppeld** — alleen zichtbaar/advies; geen downstream effect
- **Gedeeltelijk gekoppeld** — actief in sommige paden, niet overal
- **Volledig gekoppeld** — scene-/storyboard-data stroomt consistent door naar dat uitvoeringspad

**Legenda A–G**
- **A** Alleen zichtbaar?
- **B** Geeft waarschuwingen?
- **C** AI Director beslissingen?
- **D** Beeldgeneratie?
- **E** Render readiness?
- **F** Kan actie blokkeren?
- **G** Voorstellen aanpassen?

---

## Samenvatting matrix

| Domein | Toont score? | Geeft advies? | Beïnvloedt voorstel? | Beïnvloedt generatie? | Beïnvloedt render? |
|--------|--------------|---------------|----------------------|----------------------|---------------------|
| **Verhaal** | Volledig | Volledig | Gedeeltelijk | Gedeeltelijk | Niet gekoppeld |
| **Beeld** | Volledig | Volledig | Niet gekoppeld | Volledig* | Gedeeltelijk |
| **Personages** | Volledig | Volledig | Volledig | Volledig | Gedeeltelijk |
| **Locaties** | Volledig | Volledig | Volledig | Volledig | Gedeeltelijk |
| **Props** | Volledig | Volledig | Volledig | Volledig | Niet gekoppeld |
| **Stem** | Volledig | Volledig | Volledig | Niet gekoppeld | Volledig |
| **Audio** | Volledig | Gedeeltelijk | Volledig | Niet gekoppeld | Gedeeltelijk |
| **Render** | Volledig | Volledig | Gedeeltelijk | Niet gekoppeld | Volledig |

\* Beeldgeneratie gebruikt scene-velden en continuity; **readiness-score blokkeert generatie niet**.

---

## 1. Verhaal

**Bronnen:** `computeStoryHealthScore`, `buildStoryHealthAdvisorReport`, `analyzeStoryIntelligence`, `buildAiDirectorDirection`

| Vraag | Antwoord |
|-------|----------|
| **A. Alleen zichtbaar?** | Nee — ook input voor motion quality prediction en AI direction scores |
| **B. Waarschuwingen?** | Ja — advisories (te kort/lang, climax, vergelijkbare scènes, emotie, cast-gebruik) |
| **C. AI Director?** | Gedeeltelijk — `buildAiDirectorDirection` roept `analyzeStoryIntelligence` aan; shot plan via `buildAutoShotPlan`. **Story health score wijzigt het voorstel niet terug** |
| **D. Beeldgeneratie?** | Gedeeltelijk — titel/beschrijving/emotie/camera in prompt builder; **geen** storyHealthScore in prompt of gate |
| **E. Render readiness?** | Niet direct — `buildRenderReadinessSummary` heeft geen storyHealth-check (wel scènes ≥2, emotie 60%) |
| **F. Blokkeren?** | Nee — advisor is expliciet non-blocking |
| **G. Voorstel aanpassen?** | Gedeeltelijk — arc-fase + auto shot plan vormen scène-structuur; advisories worden **niet** automatisch toegepast |

**Waar zichtbaar:** Insights rail, Consistentie-tab, classic `StudioStoryIntelligencePanel`

**Gap:** Hoge story health score voorkomt niets; lage score triggert geen auto-fix in Director.

---

## 2. Beeld

**Bronnen:** `buildSceneImageReadiness`, `analyzeSceneImagePlanner`, `scorePromptQuality`, `scoreSceneImageHealth`, `buildSceneImageGenerationPrompt`

| Vraag | Antwoord |
|-------|----------|
| **A. Alleen zichtbaar?** | Nee — planner + prompt quality voeden productie-warnings (classic) |
| **B. Waarschuwingen?** | Ja — continuity (mascot verdwijnt, locatie-sprong, props, kleding-shift), 6-check readiness |
| **C. AI Director?** | **Niet gekoppeld** — `buildDirectorProposal` gebruikt geen image planner |
| **D. Beeldgeneratie?** | **Volledig** — prompt builder + continuity + reference assets; post-gen consistency/vision analyse; regenerate-with-corrections past prompt aan |
| **E. Render readiness?** | Gedeeltelijk — `sceneHasCompletedImage` in `buildRenderReadinessSummary`; **niet** visualConsistencyScore |
| **F. Blokkeren?** | Nee — bulk/single generate werkt ongeacht readiness level |
| **G. Voorstel aanpassen?** | Niet gekoppeld — wel **post-generatie** correcties via improvement flow |

**Waar zichtbaar:** Visueel-tab, Consistentie-tab, classic scene image panel, production center (image lane)

**Gap:** Readiness is advies; API `/scenes/.../images` controleert geen readiness score.

---

## 3. Personages

**Bronnen:** `buildCharacterConsistencySummary` (metadata), planner character warnings, `buildCharactersPrompt`, `assignAssetsToScene`, `buildVoiceIdentityPlan`, vision identity engine (post-image)

| Vraag | Antwoord |
|-------|----------|
| **A. Alleen zichtbaar?** | Nee — metadata + scene links + prompt continuity |
| **B. Waarschuwingen?** | Ja — ontbrekende cast, verdwijnende personages/mascot, incomplete profielen, drift (post-image) |
| **C. AI Director?** | **Volledig** — `scoreCharacterMatch` + `assignAssetsToScene`; voice summary met lock/status |
| **D. Beeldgeneratie?** | **Volledig** — character prompts, reference images, continuity, identity drift lines bij regenerate |
| **E. Render readiness?** | Gedeeltelijk — personages in `buildProposalRenderReadiness`; **niet** in workspace `buildRenderReadinessSummary` |
| **F. Blokkeren?** | Nee in Studio; Motion QA waarschuwt bij lage character identity |
| **G. Voorstel aanpassen?** | **Volledig** — asset matching + proposed new characters; voice recommendations |

**Twee modellen:** metadata-advisory (Consistentie-tab) vs. vision-identity (classic/Motion) — zelfde label, andere input.

---

## 4. Locaties

**Bronnen:** visual summary missing-location counts, planner `location_jump` / `location_unassigned`, `buildLocationPrompt`, `assignAssetsToScene`

| Vraag | Antwoord |
|-------|----------|
| **A. Alleen zichtbaar?** | Nee — locatie-data in prompts en proposals |
| **B. Waarschuwingen?** | Ja — missende locatie per scène, locatie-sprongen |
| **C. AI Director?** | **Volledig** — `scoreLocationMatch`, locatie-continuïteit via `usedLocationId` |
| **D. Beeldgeneratie?** | **Volledig** — `buildLocationPrompt`, locatie-referenties, world profile via include |
| **E. Render readiness?** | Gedeeltelijk — locatie-check alleen in **proposal** readiness, niet workspace render readiness |
| **F. Blokkeren?** | Nee |
| **G. Voorstel aanpassen?** | **Volledig** — locatie-toewijzing + proposed new location |

---

## 5. Props

**Bronnen:** planner `prop_drops`, `buildPropsPrompt`, `assignAssetsToScene`

| Vraag | Antwoord |
|-------|----------|
| **A. Alleen zichtbaar?** | Nee — props in scene data |
| **B. Waarschuwingen?** | Ja — prop_drops continuity |
| **C. AI Director?** | **Volledig** — `scorePropMatch`, prop refs per scène |
| **D. Beeldgeneratie?** | **Volledig** — `buildPropsPrompt`, prop reference assets |
| **E. Render readiness?** | **Niet gekoppeld** — geen props-check in render readiness stacks |
| **F. Blokkeren?** | Nee |
| **G. Voorstel aanpassen?** | **Volledig** — prop matching + proposed new props |

---

## 6. Stem

**Bronnen:** `analyzeVoiceDirector`, `buildVoiceIdentityPlan`, `buildProposalVoiceSummary`, `buildStudioAudioConfidence`

| Vraag | Antwoord |
|-------|----------|
| **A. Alleen zichtbaar?** | Nee — voice profile/script in storyboard state |
| **B. Waarschuwingen?** | Ja — timing warnings, identity plan warnings, lock/inconsistent in proposal voice summary |
| **C. AI Director?** | **Volledig** — voice report stuurt story voice profile; character voice status per personage |
| **D. Beeldgeneratie?** | **Niet gekoppeld** — stem zit niet in beeldprompts |
| **E. Render readiness?** | **Volledig** — voice-check in `buildRenderReadinessSummary` (wanneer voiceEnabled) |
| **F. Blokkeren?** | Nee — voice generatie niet geblokkeerd door voiceScore |
| **G. Voorstel aanpassen?** | **Volledig** — proposal audio sectie + per-character voice recommendations |

---

## 7. Audio (muziek + geluid)

**Bronnen:** `buildMusicDirectorPlan`, `buildSoundDirectorPlan`, `buildStudioAudioConfidence`, production asset readiness lanes

| Vraag | Antwoord |
|-------|----------|
| **A. Alleen zichtbaar?** | Nee — sceneAudio cues in storyboard na apply |
| **B. Waarschuwingen?** | Gedeeltelijk — plan incomplete in production center; audio confidence is **beschrijvend**, geen score-waarschuwingen in Consistentie-tab |
| **C. AI Director?** | **Volledig** — music/sound cues mapped naar `scene.sceneAudio` in proposal |
| **D. Beeldgeneratie?** | **Niet gekoppeld** |
| **E. Render readiness?** | Gedeeltelijk — **niet** in workspace `buildRenderReadinessSummary` (5 checks); wel music/sound lanes in classic `buildAssetReadiness` |
| **F. Blokkeren?** | Nee |
| **G. Voorstel aanpassen?** | **Volledig** — sceneAudio per scène uit director plans |

---

## 8. Render

**Bronnen:** `buildRenderReadinessSummary`, `buildProposalRenderReadiness`, `computeMotionRenderReadiness`, `isMotionHandoffReady`, `motionReadinessShouldWarn`

| Vraag | Antwoord |
|-------|----------|
| **A. Alleen zichtbaar?** | Nee — gates/warnings op Motion/movie-builder paden |
| **B. Waarschuwingen?** | Ja — checklist + recommendation keys |
| **C. AI Director?** | Gedeeltelijk — `buildProposalRenderReadiness` **na** bouwen getoond; wijzigt voorstel niet |
| **D. Beeldgeneratie?** | **Niet gekoppeld** — geen readiness gate op generate API |
| **E. Render readiness?** | **Volledig** — dit ís het render-domein |
| **F. Blokkeren?** | Gedeeltelijk — `motionReadinessShouldWarn` → QA modal op Motion wizard; `isMotionHandoffReady` → movie-builder CTA; **Studio workspace apply/generate nooit geblokkeerd** door readiness level |
| **G. Voorstel aanpassen?** | Gedeeltelijk — readiness berekend op projected storyboard; geen auto-patch loop |

**Drie render-readiness stacks:** workspace (5 checks), proposal (7 checks), Motion post-handoff (vision/consistency/drift).

---

## Consistentie-tab (`buildStudioConsistencyOverview`)

| Aspect | Status |
|--------|--------|
| Toont scores | Ja — aggregate van bestaande helpers |
| Geeft advies | Ja — doorverwijzing recommendation keys |
| Beïnvloedt voorstel | **Niet gekoppeld** — read-only adapter |
| Beïnvloedt generatie | **Niet gekoppeld** |
| Beïnvloedt render | **Niet gekoppeld** — toont render readiness, wijzigt die niet |

De Consistentie-tab is een **weergave- en navigatielaag**, geen execution engine.

---

## Insights rail (`buildStudioProductionInsights`)

Zelfde patroon: **volledig zichtbaar + advies**, gedeeltelijk uitvoering via scene suggestions (apply patch) en improve preview (classic apply flow). Geen hard blocks.

---

## Aanbevolen vervolg (P2, geen nieuwe engine)

1. **Render readiness unificeren** — één checklist voor workspace, proposal en Motion-import
2. **Readiness → soft gate** — optionele bevestiging vóór bulk generate (niet blokkeren, wel waarschuwen)
3. **Story health → Director loop** — advisories als suggestion patches (zoals scene suggestions)
4. **Vision consistency in workspace** — post-image identity scores tonen in Personages-domein
5. **Proposal readiness → apply hint** — geen block, wel duidelijke “nog X stappen” vóór render tab

---

## Referenties (lib)

| Domein | Primaire libs |
|--------|---------------|
| Verhaal | `studio-story-health.ts`, `studio-story-health-advisor.ts`, `studio-ai-director-direction.ts` |
| Beeld | `studio-visual-production-summary.ts`, `studio-scene-image-planner.ts`, `studio-prompt-builder.ts` |
| Personages | `studio-character-consistency-summary.ts`, `studio-prompt-character-builder.ts`, `studio-director-proposal-builder.ts` |
| Locaties | `studio-prompt-location-builder.ts`, planner warnings |
| Props | `studio-prompt-prop-builder.ts`, planner warnings |
| Stem | `studio-voice-director.ts`, `studio-voice-identity-director.ts` |
| Audio | `studio-music-director.ts`, `studio-sound-director.ts` |
| Render | `studio-render-readiness-summary.ts`, `studio-director-proposal-readiness.ts`, `compute-motion-render-readiness.ts` |
