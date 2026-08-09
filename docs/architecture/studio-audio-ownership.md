# Studio Audio Ownership (S.7A)

**Evidence-based scopes. Do not invent a new canonical model yet.**

---

## Ownership matrix

| Audio type | Primary owner today | Also appears on | Notes |
|------------|---------------------|-----------------|-------|
| **Character voice identity** | `StudioCharacter` (`voiceProvider`, `voiceProfile`, `voiceLanguage`, `voiceLock`, `voiceProfilesJson`) | History table; optional BrandKit `voiceAssetId` | Profile encodes clone/library refs (`clone:` / `library:`) — no separate `voiceId` column |
| **Storyboard narration voice** | `StudioStoryboard` voice fields + `StudioStoryboardVoice` rows | Motion handoff / mux | Parallel to Character — dual SoT conflict surface |
| **Scene voice** | Weak — no scene voice columns | `voicePriority`, `voiceAssetOverride` planning | Scene does not own TTS identity |
| **Music theme (planning)** | Storyboard `music*` fields + Music Director | Scene cue overrides | Metadata, not stems |
| **Music stem (asset)** | User audio library (`kind: music`) + link `musicAssetId` | `StudioLibraryAsset` family music | Project-scoped when linked |
| **SFX / ambience stem** | User library `kind: sfx` + `soundAssetId` | Library family sfx | Render = one looped bed |
| **Scene SFX hits** | Sound Director cue IDs / scene overrides | Handoff metadata | **Not** executed as timed hits |
| **Subtitle track** | `StudioStoryboardSubtitleTrack` (storyboard + language) | Motion burn-in | Schema allows library `subtitle` family — little indexing |
| **Translation / language export** | `VideoLanguageExport` + overlay pipeline | Translate tool | Overlay text — not VO remux |
| **Audio mix plan** | Resolved mix plan on Motion handoff | FFmpeg mix | Executable when URLs linked |
| **Brand audio** | BrandKit JSON optional `voiceAssetId` / `musicAssetId` | — | Storage hooks; **not** auto-wired into mix |
| **World audio identity** | World identity JSON (tone / music / ambience direction) | Memory metadata | Not Prisma audio columns |

---

## Critical dual ownership: Voice

| Layer | Owns |
|-------|------|
| Character | Persistent speaker identity (+ lock + history) |
| Storyboard | Narrator / default TTS profile + script |
| Scene | Links to characters; mix priority only |

**S.7B precedence (`resolveVoiceIdentity`):**

- Speaking role + Character with `voiceLock=true` → **Character wins** (storyboard override blocked; no silent replace)
- Narrator / unassigned / project default → Storyboard narration voice
- Provenance always returned (`source`, `reason`, `overrideBlocked`)

Runtime SoT table: `src/lib/studio-audio-ownership.ts`

---

## Scope summary

| Type | Character | Scene | Storyboard | Project/Library | Brand | Global |
|------|-----------|-------|------------|-----------------|-------|--------|
| Voice identity | ✓ | | partial | clone library | optional id | ElevenLabs catalog |
| Narration audio | | | ✓ | | | |
| Music bed | | cues | plan | ✓ stem | optional id | system catalog labels |
| SFX bed | | cues | plan | ✓ stem | | system catalog labels |
| Subtitles | | | ✓ | weak | | |
| Translation overlays | | | | video export | | |
| Mix | | priorities | plan | | | FFmpeg |

---

## Implication for S.7

Unify ownership **before** claiming “Audio Ecosystem” product completeness — especially Character voice vs Storyboard narrator, and planning cues vs executable stems.
