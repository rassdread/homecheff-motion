# World Identity Builder UI Report

## Welke Identity Spec Engine functies zijn gebruikt

- `toIdentitySpec(world)` — form laden, completeness score, production hints
- `identityCompleteness(spec)` — completeness percentage + tier in UI
- `worldToIdentitySpec` / `worldFromIdentitySpec` — patch shape `WorldIdentitySpecPatch`
- `worldToIdentitySpec` updated: structured `hc:` tokens from `visualStyle`/`tone`/`continuityRules` → `type`, `visualKeywords`, `forbiddenElements`
- Geen nieuwe engine, geen schema migratie

## Hoe wereld-identiteit wordt bewerkt

Flow: **Werelden-tab → kies wereld → World identity panel → Opslaan → `worldIdentityFormToPatch` → `updateStudioWorldApi` (PATCH)**.

Geen redirect, geen aparte pagina. Component: `StudioWorkspaceWorldIdentityBuilder` in `studio-workspace-scene-assets-panel.tsx` (early return voor `tab === "worlds"`).

Structured velden verdeeld over bestaande world fields:

| Veld DB | Inhoud |
|---------|--------|
| `visualStyle` | `hc:world`, `hc:vstyle`, `hc:shape`, `hc:color`, `hc:light`, `hc:mood`, `hc:env` + `[identity:visual_details]` |
| `tone` | `hc:music`, `hc:ambience`, `hc:energy`, `hc:voice`, `hc:sound` + `[identity:audio_details]` |
| `continuityRules` | usage + `[identity:shots]`, `[identity:render]`, `[identity:forbidden]`, `[identity:audio_forbidden]`, `[identity:brand]` |

## Welke wereldtypes zijn toegevoegd

**Core (zichtbaar voor alle gebruikers):** brand, community, food, garden, design, education, sports, lifestyle, local market, documentary, cartoon, cinematic.

**Advanced (admin of advanced-features toggle):** cyberpunk, steampunk, fantasy, dark fantasy, horror, dystopian, sci-fi, noir, post-apocalyptic, retro future, experimental.

Geen betaalmuur — alleen visibility flag via `useStudioAdvancedFeatures` + `isAdmin`.

## Hoe visual rules werken

Presets + vrije tekst voor kleurregels en visuele details. Voorbeeld HomeCheff: 3D cartoon, rounded/friendly shapes, HomeCheff green/blue color theme, warm mood, forbidden horror/competitor logos. Geen image generation — alleen identity data.

## Hoe audio rules werken

Muziekstijl, ambience, energie, stemrichting, sound feel + verboden audio-elementen. Regels worden gelezen door Audio Production / Music Director / Sound Director via `buildWorldIdentityAudioProductionLines`. Geen music/SFX generation.

## Hoe shot/motion rules werken

Camerastijl, bewegingsstijl, tempo, voorkeurshots, verboden shotstijlen in `[identity:shots]`. Shot Planner leest hints via `resolveWorldIdentityShotHint`. Geen nieuwe shot engine.

## Hoe render strategy compatibility is voorbereid

Render strategy hints (`multi_image`, `start_end`, `hybrid`, `speed_plan`, `shot_split`) opgeslagen in `[identity:render]` als `hc:render=`. `buildWorldIdentityRenderStrategyHints` levert read-only metadata voor toekomstige render planning. Geen render strategy planner gebouwd.

## Hoe preview cards werken

Statische CSS gradient cards (`StudioWorldIdentityTypePreviewCard`) voor 11 wereldtypes met mood, beschrijving, en “geschikt voor”. Advanced preview cards (fantasy, sci-fi) alleen zichtbaar met advanced flag. Geen image generation.

## Hoe current vs suggested werkt

`buildWorldIdentityAiSuggestion` leest AI Director proposal via `worldRef`. Banner + side-by-side **Huidig / AI-voorstel** + knop **Gebruik voorstel** (`mergeWorldIdentityForm`). Geen auto-save, geen automatische overwrites.

## Hoe linked assets worden getoond

Read-only lijsten van gekoppelde personages, locaties en props (`worldProfileId` match). **Open tab**-actie via `onSwitchTool` — geen bulk apply, geen automatische wijzigingen.

## Hoe consistency aansluit

`StudioWorldIdentityRulesSummary` in Consistency-tab toont checklist: visueel, kleur, audio, stem, shots, beweging, verboden elementen via `buildWorldIdentityRulePresence`. Geen nieuwe consistency engine.

## Hoe visual production aansluit

`buildWorldIdentityVisualProductionLines` leest visual style, color rules, mood, lighting, forbidden elements uit IdentitySpec. Geen image generation wijzigingen.

## Hoe audio production aansluit

`buildWorldIdentityAudioProductionLines` leest music style, ambience, sound feel, voice direction. Geen audio generation wijzigingen.

## Hoe shot planner aansluit

`resolveWorldIdentityShotHint` — food → close-ups, sports → tracking/action, community → medium/group, cinematic → wide/slow. Custom preferred shots override type defaults.

## Welke advanced worlds verborgen zijn

Cyberpunk, steampunk, fantasy, dark fantasy, horror, dystopian, sci-fi, noir, post-apocalyptic, retro future, experimental — verborgen tenzij `isAdmin` of `useStudioAdvancedFeatures()`.

## Welke bestanden zijn aangepast

**Nieuw:**
- `src/lib/studio-world-identity-structured.ts`
- `src/lib/studio-world-identity-presets.ts`
- `src/lib/studio-world-identity-fields.ts`
- `src/lib/studio-world-identity-suggestion.ts`
- `src/lib/studio-world-identity-visual-hints.ts`
- `src/lib/studio-world-identity-foundation.test.ts`
- `src/components/studio/studio-world-identity-type-preview.tsx`
- `src/components/studio/studio-workspace-world-identity-builder.tsx`
- `src/components/studio/studio-world-identity-rules-summary.tsx`
- `docs/studio-world-identity-builder-ui-report.md`

**Gewijzigd:**
- `src/lib/studio-identity-spec-mappers.ts` — world structured extraction
- `src/lib/studio-memory-prompt.ts` — world identity memory extras
- `src/components/studio/studio-workspace-scene-assets-panel.tsx` — worlds tab early return
- `src/components/studio/studio-workspace-shell.tsx` — `handleWorldUpdated`, tool switch
- `src/components/studio/studio-workspace-consistency-panel.tsx` — world rules summary
- `src/i18n/locales/en.ts` / `nl.ts` — `studio.worldIdentity.*`
- `src/test/studio-api-fixtures.ts` — `studioWorldProfileListItem`
- `package.json` — foundation test entry

## Wat bewust niet gebouwd is

- Geen nieuwe identity engine
- Geen schema migratie
- Geen image generation of upload-to-identity extraction
- Geen render strategy planner
- Geen timeline editor
- Geen bulk apply van world rules naar assets
- Geen betaalmuur voor advanced worlds

## Wat de volgende sprint moet zijn

- World rules → downstream auto-hints in Visual Production / Audio Production / Shot Planner UI panels
- Asset bulk “inherit world rules” (opt-in per asset type)
- World usage stats in Project Memory (used in X storyboards / renders)
- Render strategy planner consuming `[identity:render]` metadata
- E2E smoke test voor worlds tab identity builder

## Tests/build status

- `npx prisma validate` — pass
- `npx prisma generate` — pass
- `npm run lint` — pass (0 errors, pre-existing warnings)
- `npm run typecheck` — 3 pre-existing errors in unrelated test files (not introduced by this sprint)
- `npm run build` — pass
- `npm run test` — **1630/1630 pass** (includes 10 new world identity foundation tests)
