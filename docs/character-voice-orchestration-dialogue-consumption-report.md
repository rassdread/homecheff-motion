# Character Voice Orchestration & Dialogue Consumption — Sprint Report

## Delivered

### Planning core
- `buildCharacterVoiceOrchestration()` — cast, speaking/narration/unused characters, voice assignments, moment speakers, dialogue readiness, warnings, director context lines, cast advisories
- `buildStoryboardVoicePlan()` — narrator, speakers, per-scene assignments, voice change estimate
- `buildCharacterVoiceOrchestrationContext()` — AI Director consumption bundle
- `buildInsightsVoiceCastSummary()` — Insights Hub aggregation

### Cast model (P3)
- `StoryCastMember` — voice source (preset/persona/my_voice), status (assigned/missing_voice/voice_disabled)

### Story moment speakers (P4)
- Maps Story Architect moments → carrier character from linked scenes

### Dialogue readiness (P5)
- `single_voice` | `multi_character` | `dialogue_ready` | `voice_missing`

### AI Director (P6)
- `characterVoiceContext` on `StudioDirectorProposal`
- Moment speaker lines in proposal preview UI

### Motion handoff (P8)
- `characterVoicePlan` via `attachCharacterVoicePlanToHandoff()` (optional metadata, no render changes)

### Creation Assistant (P9)
- Tasks: `studio.creationAssistant.task.assignCharacterVoice` — source `character_voice`

### Insights Hub (P10)
- **Stemcast** section with character/voice/clone/persona/preset counts and missing assignments

### Character Voice Panel (P11)
- **Cast overview** — `StudioVoiceCastOverviewPanel` in Voice workspace tool

### Production memory (P12)
- `castCombinations[]` on project memory snapshot
- Frequent cast advisories (manual only)

### i18n (P13)
- Full NL + EN keys under `studio.voiceOrchestration.*`, `studio.insightsHub.voiceCast.*`, creation assistant task

## Key files

| Area | Files |
|------|-------|
| Types | `src/types/studio-character-voice-orchestration.ts` |
| Orchestration | `src/lib/studio-character-voice-orchestration.ts` |
| Cast memory | `src/lib/studio-voice-cast-advisories.ts` |
| Handoff | `src/lib/attach-character-voice-plan-handoff.ts` |
| UI | `src/components/studio/studio-voice-cast-overview-panel.tsx` |
| Tests | `src/lib/studio-character-voice-orchestration-foundation.test.ts` |
| Audit | `docs/character-voice-orchestration-reality-audit.md` |

## Not built (by design)

- New TTS / AI providers or voice engines
- Realtime conversation, lip sync
- Auto speaker selection
- Schema migrations
- Audio generation changes

## Next sprint

1. Bridge orchestration → tagged `voiceNarrationScript` authoring UI
2. Align handoff segment timing with multi-character speakers
3. Voice Director consumption of `buildStoryboardVoicePlan`
4. Motion performance mouth sync from planned speakers

## Validation

Run: `npx prisma validate`, `npx prisma generate`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test`
