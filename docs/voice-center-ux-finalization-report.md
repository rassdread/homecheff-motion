# Voice Center UX Finalization Report

## Section Structure

Voice Center is reorganized into a calm, step-by-step flow:

1. **Karakterstem** — always visible (`CharacterMainVoiceCard` + enable/lock/language)
2. **Beste stemmatches** — collapsible recommendations
3. **Persona presets** — collapsible with subgroup accordions
4. **Zoek in stemmenbibliotheek** — collapsible; quick picks + gated full browse
5. **Mijn stem** — collapsible clone workflow
6. **Geavanceerde taalinstellingen** — collapsible preview text + language overrides

Legacy source tabs (preset / persona / my voice) were removed from the main surface. Discovery happens through the ordered sections above.

## Collapsible Behavior

- `VoiceCenterCollapsibleSection` provides 44px touch targets, chevron affordance, and collapsed summaries.
- **Best matches**: open by default when no explicit voice is chosen; closed after selection.
- **Persona presets, library, my voice, advanced language**: closed by default.
- **Library browse** (filters + results): closed until “Bibliotheek openen” is clicked.

## Persona Grouping

Within Persona Presets, Chef / Tuin / Designer / Community are separate collapsible subgroups (`PersonaPresetGroupSection`).

- Default open group is derived from `characterType` via `resolvePersonaGroupFromCharacterType`.
- Other groups start collapsed with a count summary.

## Library Discovery

- Collapsed library section shows stats summary only.
- Expanded section shows **Snelle keuzes** (max 8 cards from persona/accent/language filters).
- Full marketplace (search, filters, results, load more) mounts only after **Bibliotheek openen**.

## Preview Text Performance

- `previewTextInput` (typing) is split from `appliedPreviewText` (used by recommendation/persona/quick-pick panels).
- Applied text updates on: preview button click (`flushPreviewText`), 800ms debounce, blur, Enter.
- Heavy panels receive `appliedPreviewText` only — typing in advanced settings does not rerender marketplace when sections are closed.

## Language Override Cleanup

- When “Gebruik dezelfde stem voor alle talen” is on, NL/EN/DE/FR override cards are **not rendered**.
- Admins see **Toon debug taaloverschrijvingen**; override cards render only after explicit click.

## Render Performance

- `React.memo` on: `StudioVoiceRecommendationsPanel`, `StudioVoicePersonaPresetsPanel`, `StudioVoiceQuickPicksPanel`, `StudioCharacterVoiceLibrarySection`, `PersonaPresetGroupSection`, `VoiceQuickPickCard`, `VoiceCenterCollapsibleSection`.
- Collapsed sections do not mount panel children (conditional render inside open sections).
- `resolvedMarketplaceContext` is memoized in the parent to stabilize panel props.

## Mobile UX

- Accordion headers and primary actions use `min-h-[44px]`.
- Filters stack in the browse panel (`sm:grid-cols-2`, `lg:grid-cols-4`).
- Preview players use compact variant inside cards.

## Tests/build status

| Check | Status |
|-------|--------|
| `npx prisma validate` | pass |
| `npx prisma generate` | pass |
| `npm run lint` | pass (0 errors) |
| `npm run build` | pass |
| `npm run test` | **2086/2086** pass |

New/updated tests:

- `src/lib/studio-voice-center-ux.test.ts` — helpers + wiring assertions (+10 tests)
- `src/lib/studio-character-form-voice-wiring.test.ts` — updated for collapsible UX
