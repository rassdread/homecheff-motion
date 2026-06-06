# Director V2 Status

**Date:** 2026-06-05  
**Flag:** `NEXT_PUBLIC_STUDIO_DIRECTOR_V2` (default **off**)  
**Integration:** `src/components/studio/studio-scene-composer.tsx` — compose tab swap

---

## Architecture

| File | Role |
|------|------|
| `studio-director-panel-v2.tsx` | Shell: mode toggle, preview strip, accordion sections, inspector column, save |
| `studio-director-scene-preview-strip.tsx` | Scene still + metadata strip |
| `studio-director-inspector-column.tsx` | Right column: arc, focus, emotion, shot, duration |
| `studio-director-v2-mode.ts` | Beginner/expert in localStorage |
| `sections/*.tsx` | Per-domain sections |

---

## Section audit: real vs placeholder

| Section | Beginner | Expert | Editable | Real data | Placeholder? |
|---------|----------|--------|----------|-----------|--------------|
| **Director** | ✅ | ✅ | ✅ purpose, notes | Story flow + AI director | **No** |
| **Characters** | ✅ | ✅ | ✅ toggle cast | Character library | **No** |
| **Camera** | ✅ | ✅ | ✅ shot, motion, focus cards | Scene fields | **No** |
| **Emotion** | ✅ | ✅ | ✅ cards + energy | Scene fields | **No** |
| **Text** | ✅ | ✅ | ❌ read-only | `buildStudioTextBeats()` | **Partial** — preview only |
| **Voice** | ❌ | ✅ | ❌ read-only | Character voice profiles + language tabs | **Partial** — no preview button |
| **Music** | ❌ | ✅ | ✅ cue + energy cards | Scene music fields | **Partial** — no plan summary state |
| **Sound** | ❌ | ✅ | ✅ environment + SFX | Scene sound overrides | **Partial** — no plan summary |
| **Advanced** | ❌ | ✅ | ❌ read-only | Composition + blocking builders | **Partial** — no prompt/motion inspector |

---

## Mode behavior

- **Beginner:** Director, Characters, Camera, Emotion, Text — collapsed voice/music/sound/advanced
- **Expert:** All sections available via accordion
- Mode persisted in `localStorage` key `hc-studio-director-v2-mode`

---

## Duplication when flag ON

Storyboard editor **still renders** at storyboard scope:
- `StudioVoiceDirectorPanel`
- `StudioMusicDirectorPanel`
- `StudioSoundDirectorPanel`
- `StudioAudioProductionDirectorPanel`
- `StudioAudioAssetDirectorPanel`
- `StudioTextBeatsPreviewPanel`
- Composition, placement, blocking panels

**Resolution:** Pixar Workspace hides storyboard stack; workspace uses Director V2 as primary surface.

---

## Sprint completion targets (Phase 4)

### Voice
- [ ] Voice identity per character (exists)
- [ ] Language tabs NL/EN/DE/FR/ES (exists)
- [ ] Lock status badge (exists)
- [ ] **Add:** character voice preview button via existing preview API

### Music
- [ ] Mood/cue cards (exists)
- [ ] **Add:** plan state summary (transition type, start/end behavior)

### Sound
- [ ] Environment cards (exists)
- [ ] **Add:** plan state summary + selected SFX list

### Text
- [ ] Beat preview (exists)
- [ ] **Add:** Studio source badge + beat count summary

### Advanced
- [ ] Composition + blocking (exists read-only)
- [ ] **Add:** prompt preview snippet, motion instruction summary, placement warnings

---

## Usage today

Director V2 is **built but not default**. Production users see V1 compose form unless flag is set. Workspace route will enable V2 unconditionally (no flag dependency in workspace shell).

---

## Tests

- `src/lib/studio-scene-director.test.ts` — V23 director fields
- No dedicated Director V2 component tests — rely on typecheck + storyboard integration
