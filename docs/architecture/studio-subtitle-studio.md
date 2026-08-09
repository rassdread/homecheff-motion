# Studio Subtitle Studio (S.7E)

Canonical contract: `buildSubtitleStudio()`.

- Tracks per language (Prisma `StudioStoryboardSubtitleTrack` remains SoT)
- Speaker identity via `studio-subtitle-identity` (does not duplicate Character voice)
- Structured styles (`studio-subtitle-style`) — burn-in still fixed ASS `StudioNarration`
- Accessibility metadata (CC, high-contrast style available, reading speed hints)
- Future dubbing / lip-sync marked `NOT_IMPLEMENTED`

Packs: `studio-subtitle-experience-packs.ts` → Matrix `SUBTITLE_TRANSCRIBE` (PARTIAL).
