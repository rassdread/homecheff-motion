# Studio S.7E — Subtitles & Translation

**Date:** 2026-08-09  
**Branch:** `feat/studio-s7e-subtitles-translation`  
**S.7D baseline freeze:** `ef33c715`  
**Base main:** `c0803b18`

## Product law

```
Subtitle owns readable language
Translation owns localized meaning
Creative Director recommends (forced: false)
Prompt Matrix assembles
Provider Transform converts
GenerationJob executes
Render burns or exports
```

Reuse never regenerates. Dubbing / lip-sync remain `NOT_IMPLEMENTED`.

## Delivered

| Area | Status |
|------|--------|
| Subtitle Studio | PASS (`buildSubtitleStudio`) |
| Translation Studio | PASS (`buildTranslationStudio`, overlay_export only) |
| Language identity | PASS |
| Subtitle identity / styling | PASS |
| Localization plan | PASS (future_* planned only) |
| Subtitle Experience Packs | PASS → Matrix `SUBTITLE_TRANSCRIBE` PARTIAL |
| Translation Experience Packs | PASS → Matrix `TRANSLATE_EXPORT` PARTIAL |
| Libraries organize | PASS (reuseWithoutCharge) |
| Accessibility metadata | PASS (CC, speaker labels, high-contrast style available) |
| CD direction | PASS (`forced: false`) |
| Workspace adapter | PASS (no redesign) |
| Continuity helper | PASS |
| Matrix mapping helper | PASS (AudioSpecification) |
| Provider Transform ownership | Unchanged |
| GenerationJob for STT/Translate | Deferred (honest; documented for S.8) |
| S.8 billing prep | PASS (`studio-audio-s8-billing-inputs.md`) |
| Billing / credits | Unchanged |

## Security / privacy / performance

| Gate | Result | Notes |
|------|--------|-------|
| Security | PASS | Existing subtitle routes enforce `storyboard.ownerId`; contracts do not expose cross-user data |
| Privacy | PASS | Scripts/dialogue/translations stay in owned storyboard/export SoTs; no new provider metadata leak paths |
| Performance | PASS | Planning metadata only — no provider calls in S.7E modules |

## Absolute rules honored

No Voice/Music/SFX/FFmpeg/Render/Matrix/Jobs/Billing rewrite · no fake dubbing/lip-sync.

## Code map

| Module | Role |
|--------|------|
| `studio-subtitle-studio.ts` | Canonical Subtitle Studio |
| `studio-subtitle-identity.ts` | Speaker identity |
| `studio-subtitle-style.ts` | Structured styles |
| `studio-translation-studio.ts` | Translation Studio |
| `studio-language-identity.ts` | Language identity |
| `studio-localization.ts` | Localization surfaces |
| `studio-subtitle-experience-packs.ts` | Subtitle packs |
| `studio-translation-experience-packs.ts` | Translation packs |
| `studio-language-library-organize.ts` | Library buckets |
| `studio-subtitle-translation-direction.ts` | CD recommend |
| `studio-subtitle-translate-matrix-mapping.ts` | Matrix mapping |
| `studio-subtitle-translate-continuity.ts` | Continuity |
| `studio-workspace-subtitle-translate-entity.ts` | Workspace adapter |

## Docs

- `docs/architecture/studio-subtitle-studio.md`
- `docs/architecture/studio-translation-studio.md`
- `docs/architecture/studio-language-identity.md`
- `docs/architecture/studio-localization.md`
- `docs/audits/studio-audio-s8-billing-inputs.md` (S.8 mandatory input)

## Honest deferrals (non-blocking for S.7E contracts; input for S.8)

- STT / translation GenerationJob wrap still deferred (bare billed routes)
- Burn-in still fixed ASS `StudioNarration` (styles = planning metadata)
- Sound descriptions / WCAG engine = future

## Certification checklist (fill after Preview/Production)

- [ ] Lint / Build / Tests / TypeScript PASS
- [ ] Preview GREEN
- [ ] Merged to main
- [ ] Production smoke
- [ ] Final GO for S.8
