# Studio Audio Continuity (S.7A → S.7B)

Rates how audio identity survives across scenes / storyboards / projects.

Scale: **STRONG** · **PARTIAL** · **WEAK** · **NONE**

---

## Continuity matrix

| Dimension | Across scenes | Across storyboards | Across projects | Rating | Mechanism |
|-----------|---------------|--------------------|-----------------|--------|-----------|
| **Character voice identity** | Same character → same profile when speaking-role resolver used | Reuse Character entity | Reuse Character / clone library | **PARTIAL** | Character fields + `resolveVoiceIdentity`; narrator can still diverge on single-narrator path |
| **Narrator / storyboard voice** | Shared storyboard profile | Per storyboard | Not automatic | **PARTIAL** | `StudioStoryboard` + `StudioStoryboardVoice` |
| **Music theme (planning)** | Scene cue overrides on shared storyboard style | Per storyboard fields | Manual re-apply | **WEAK→PARTIAL** | Director metadata |
| **Music stem** | One project bed looped full timeline | Relink library asset | Reuse library asset | **PARTIAL** | Library ID link |
| **SFX motifs / ambient bed** | One looped bed (not timed hits) | Relink | Reuse library | **WEAK** | Scene cue IDs not rendered |
| **Subtitle style** | Fixed ASS burn-in style | Per language track | Manual | **WEAK** | No user style identity |
| **Language** | Storyboard `voiceLanguage` + subtitle language | Per board / export | Manual | **PARTIAL** | Multi-lang TTS rows; overlay export separate |
| **Brand audio** | — | — | BrandKit IDs if set | **NONE→WEAK** | Unwired into mix (`wired: false`) |

---

## Character → Scene → Storyboard → Motion → Render

| Hop | Rating | Evidence |
|-----|--------|----------|
| Character → Scene | **WEAK** | No scene voice identity columns |
| Character → Storyboard TTS | **PARTIAL** | Multi-speaker uses character assignment; single narrator uses storyboard profile |
| Storyboard → Motion | **PARTIAL** | Handoff attaches voice/music/sound/mix; S.7B uses `resolveVoiceIdentity` on voice identity handoff |
| Motion → Render | **PARTIAL** | Mux voice ± linked beds ± burn-in when export enabled |

**Overall Character voice continuity into final video: PARTIAL**  
(Do **not** claim STRONG until Preview E2E cert proves locked voice through render.)

---

## Soft lock model (S.7B)

`voiceLock` on Character prevents silent storyboard replacement for **speaking roles**:

- `resolveVoiceIdentity({ role: "character", ... })` returns `overrideBlocked` when locked + divergent storyboard profile
- Motion voice-identity handoff uses the same precedence
- Narrator / unassigned / project default still use Storyboard voice

---

## ContinuityBundle audio extension (S.7B)

`ContinuityBundle.audio` (optional) carries:

- narrator/default voice
- storyboard language
- project music asset id
- SFX bed asset id
- scene audio intent (planning)
- brand audio refs with `wired: false`

Audio continuity is **metadata/identity**, not provider prompt syntax.
