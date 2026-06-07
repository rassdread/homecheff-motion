# Voice Clone Library — Sprint Report (P7–P11)

## Audit summary

| Area | Finding | Action |
|------|---------|--------|
| `cloneCharacterVoice()` | Delegates to `createUserVoiceClone({ linkCharacterId })` | Studio-wide clone + optional character link |
| Voice clone storage | Blob manifest `studio/{ownerId}/voice-clones/manifest.json` | No Prisma migration |
| Character voice preview | `normalizeVoiceProfileForSynthesis()` on preview path | Clone refs preserved |
| Storyboard narration | `analyzeVoiceDirector()` → `resolvePlanningVoiceProfile()` | Clone refs preserved |
| Motion narration | Same voice director + ElevenLabs `buildVoiceRequest` | Clone refs preserved |
| `normalizeStudioVoiceProfileId()` | Was collapsing `clone:` → `warm_narrator` in Voice Director panel | Fixed with `resolvePlanningVoiceProfile()` |

## Built

### P7 — User voice library
- `buildUserVoiceLibrary()` — `cloneId`, `name`, `previewUrl`, `createdAt`, `language`, `status`, usage counts
- API: `GET /api/studio/user-voice-library`, `POST/PATCH /api/studio/voice-clones`
- UI: **Mijn stemmen** — preview, rename, link via Character Voice Center, usage counts

### P8 — Clone workflow
- `StudioVoiceCloneWorkflow` — upload **or** MediaRecorder → sample preview → clone → clone preview → save to library
- Clones registered in manifest; optional `linkCharacterId` only when assigning from character context

### P9 — Character Voice Center
- Source tabs: Preset / Persona / **Mijn stem**
- My voices list with inline preview; no standalone clone page in workspace inline flow

### P10 — Production memory & advisories
- Memory tracks clone `profileId` + `displayName` (manifest + character `voiceDescription`)
- Director proposal: `frequentCloneAdvisories` — e.g. “Je gebruikt meestal Sergio Voice Clone”
- Production brief + Creation Assistant optional advisory — **never auto-select**

### P11 — Clone retention
- `resolvePlanningVoiceProfile()` / `normalizeStoredVoiceProfile()` end-to-end
- Voice Director panel read-only for clone/library refs on storyboard
- Project memory uses `voiceProfileLabelKeyForPlanning()`

## Explicitly not in sprint
- Delete clone
- New TTS provider
- Schema migrations
- Auto voice selection

## Tests
- `src/lib/studio-user-voice-library-foundation.test.ts`
- Extended `studio-voice-director.test.ts` (clone retention)

## Validation
Run Riedel when ready: `npm run lint`, `npm run build`, `npm run test`.
