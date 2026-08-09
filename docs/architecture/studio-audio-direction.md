# Studio Audio Direction (S.7D)

Creative Director music & sound advisors:

- `recommendMusicDirection` — genre, tempo, emotion, instrumentation, energy
- `recommendSoundDirection` — ambience, effects, environment, density, movement, cinematic level

Both return `forced: false` — never auto-apply.

Directors **must not** call ElevenLabs (see `studio-audio-director-boundary.ts`).

Brand audio concepts (`studio-brand-audio.ts`) are contract-only (`wired: false`).
