# Studio Audio Continuity (S.7A)

Rates how audio identity survives across scenes / storyboards / projects.

Scale: **STRONG** · **PARTIAL** · **WEAK** · **NONE**

---

## Continuity matrix

| Dimension | Across scenes | Across storyboards | Across projects | Rating | Mechanism |
|-----------|---------------|--------------------|-----------------|--------|-----------|
| **Character voice identity** | Same character → same profile when multi-cast path used | Reuse Character entity | Reuse Character / clone library | **PARTIAL** | Character fields + history; narrator can diverge |
| **Narrator / storyboard voice** | Shared storyboard profile | Per storyboard | Not automatic | **PARTIAL** | `StudioStoryboard` + `StudioStoryboardVoice` |
| **Music theme (planning)** | Scene cue overrides on shared storyboard style | Per storyboard fields | Manual re-apply | **WEAK→PARTIAL** | Director metadata |
| **Music stem** | One project bed looped full timeline | Relink library asset | Reuse library asset | **PARTIAL** | Library ID link |
| **SFX motifs / ambient bed** | One looped bed (not timed hits) | Relink | Reuse library | **WEAK** | Scene cue IDs not rendered |
| **Subtitle style** | Fixed ASS burn-in style | Per language track | Manual | **WEAK** | No user style identity |
| **Language** | Storyboard `voiceLanguage` + subtitle language | Per board / export | Manual | **PARTIAL** | Multi-lang TTS rows; overlay export separate |
| **Brand audio** | — | — | BrandKit IDs if set | **NONE→WEAK** | Unwired into mix |

---

## Character → Scene → Storyboard → Motion → Render

| Hop | Rating | Evidence |
|-----|--------|----------|
| Character → Scene | **WEAK** | No scene voice identity columns |
| Character → Storyboard TTS | **PARTIAL** | Multi-speaker uses character assignment; single narrator uses storyboard profile |
| Storyboard → Motion | **PARTIAL** | Handoff attaches voice/music/sound/mix plans |
| Motion → Render | **PARTIAL** | Mux voice ± linked beds ± burn-in when export enabled |

**Overall Character voice continuity into final video: PARTIAL**

---

## Soft lock model

`voiceLock` on Character is intended to prevent storyboard override. Enforcement:

- Identity warnings (`locked_voice_overridden`, `voice_mismatch`)
- Resolver prefers Character when locked (multi-cast)
- Single-narrator generate path can still use storyboard `voiceProfile`

Not silent substitution by design — but **not hard-enforced** for all TTS paths.

---

## Non-goal of this doc

Does not prescribe ContinuityBundle schema changes. S.7B should decide whether Character voice becomes Continuity-owned identity like visual Character refs.
