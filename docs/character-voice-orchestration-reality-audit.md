# Character Voice Orchestration — Reality Audit

## Existing voice systems

| System | Role today | Speaker-aware? |
|--------|------------|----------------|
| Character Voice Center | Per-character preset/persona/clone | Character only |
| `resolveCharacterVoiceIdentity` | Single source of truth for profile | Yes |
| `buildCharacterVoiceAssignments` | Cast → voice profiles | Yes |
| `parseSpeakerTaggedScript` / `[Name]` tags | Multi-line dialogue format | Yes |
| `buildMultiCharacterNarrationScript` | Auto one speaker/scene (primary char) | Partial |
| `analyzeVoiceDirector` | Storyboard narrator script | No (single voice) |
| `generateStoryboardVoice` | TTS single or multi-character | Execution |
| Motion handoff `activeSpeaker` | Primary character per scene | Partial |
| Story Architect | Narrative moments (departure…closing) | No speakers |
| Story Beat Translation | Scene copy from moments | No speakers |
| Production memory `voices[]` | Profile frequency | Storyboard-level |
| AI Director proposal | Character voice summary + clone advisories | Partial |

## Where speaker information was lost

1. **Voice Director** — `buildVoiceScriptBundle` produces one narrator line per scene, no `[Speaker]` tags.
2. **Director proposal preview** — shows narrator script, not cast dialogue plan.
3. **Beat translation** — entity `character` is a string label, not cast voice assignment.
4. **Handoff timing** — multi-character TTS uses synthetic `speaker-${i}` scene IDs; handoff segments use single-narrator timing.
5. **Creation Assistant** — tasks were “pick a profile”, not “who speaks this scene”.

## Overlap

- `resolveActiveSpeakerForScene` (primary character) vs `resolveSceneSpeaker` (text heuristic in blocking).
- `characterVoiceAssignments` on handoff vs new orchestration plan (complementary: assignments = profiles, plan = speakers).

## What already could support dialogue

- Multi-character TTS path when `assignments.length >= 2` or tagged script.
- Speaker tags in saved `voiceNarrationScript`.
- Performance handoff reads `voiceSegments[].speaker`.

## Gap (this sprint)

Unified **planning** layer: cast, moment speakers, scene speakers, dialogue readiness — without new TTS/AI/schema.
