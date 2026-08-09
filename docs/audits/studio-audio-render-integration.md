# Studio Audio — Render / Motion Integration (S.7A)

---

## Handoff chain

```
Studio storyboard
  → create motion handoff payload
       attach voice (+ subtitle metadata)
       attach music plan (cues)
       attach sound plan (cue IDs)
       attach audio production plan
       attach audio asset plan
       attach audio mix plan (URLs if library linked)
  → Instant / Motion / AnimationProject.studioHandoffJson
  → merge / export
       applyStudioVoiceExportToMergedVideo
       optional multi-layer FFmpeg mix
       optional ASS burn-in
```

---

## What survives into final video

| Asset | Survives? | Condition |
|-------|-----------|-----------|
| Storyboard TTS audio | Yes | Completed `StudioStoryboardVoice` + export enabled |
| Subtitle burn-in | Yes | Track exists + mode burn_in |
| Music bed URL | Yes | Library linked + mixEnabled |
| SFX bed URL | Yes | Library linked + mixEnabled |
| Music Director cues | Metadata only | Not stems |
| Sound Director cue IDs | Metadata only | Not timed hits |
| System catalog asset names | Labels | Not blob URLs |
| Per-scene mix priorities beyond first | Weak | First-scene-driven gains |

---

## Mix reality (executable)

- Layers: voice ± music ± sound
- Ducking: static gain multipliers (not sidechain)
- Music: loop + optional afade in/out from cue behaviors
- Sound: loop + volume
- `musicHardCut` flag: planned, not applied in FFmpeg filter graph reviewed
- Publish mux can reuse same stack

---

## Lost / recomputed / duplicated

| Issue | Detail |
|-------|--------|
| Lost | Scene-timed SFX; multi-stem music; BrandKit auto inject |
| Recomputed | Mix volumes from production plan at resolve time |
| Duplicated | Planning layers + executable mix both on handoff |
| Provider-specific | ElevenLabs blobs; FFmpeg local |

---

## Language export

Overlay translation renders on clean video. **Does not** remux alternate VO per locale (known P2). TTS another language creates a separate voice row — not automatic dub remux.
