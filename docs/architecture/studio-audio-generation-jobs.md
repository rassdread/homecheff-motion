# Studio Audio Generation Jobs (S.7B)

## Coverage

| Capability | Before S.7B | After S.7B |
|------------|-------------|------------|
| VOICE_TTS | StudioGenerationJob | StudioGenerationJob (unchanged) |
| VOICE_CLONE | Bare `runBilledProviderRoute` | GenerationJob + idempotency |
| MUSIC_GENERATE | Bare billed route | GenerationJob + idempotency |
| SFX_GENERATE | Bare billed route | GenerationJob + idempotency |
| SUBTITLE_TRANSCRIBE | Bare / mixed | **Deferred** (document only — higher risk) |
| TRANSLATE_EXPORT | Bare / mixed | **Deferred** |

## Required job properties

- idempotency key (`Idempotency-Key` header or `clientMutationId`)
- status / attempt
- chargeFinalized
- result / outputAssetId reference
- owner + scope
- retry / failure semantics via orchestrator

## Credit keys (prices unchanged)

`voice_generation` · `voice_clone` · `music_generation` · `sfx_generation` · `subtitle_transcription` · `translation_export` · `voice_suggestion` · `music_suggestion`

## Cache

`CACHE_HIT` → no new provider call → no new user charge (`skipCapture`).

## Idempotency expectation

| Case | Expected |
|------|----------|
| Same clientMutationId retry | Same job / max one charge |
| New clientMutationId | New job / normal charge |
| Double-click without key | Separate jobs (client should send key) |

Wrapper: `src/server/studio-generation/run-audio-generation-job-route.ts`
