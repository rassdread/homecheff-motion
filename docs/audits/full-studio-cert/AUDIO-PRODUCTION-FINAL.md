# Production Audio — Final Verification

## Deployment

| Field | Value |
|-------|-------|
| Commit | `90926699` |
| Module | `src/lib/studio-audio-mix-ffmpeg.ts` |
| Production URL | https://studio.homecheff.eu |

## Root cause

Short voice (~2.5s) as first `amix` input with `duration=first` → mix ended at voice length → SFX at 5.5s absent.

## Fix

- Voice: `volume → apad → atrim(0, planDuration)`
- Mix: `amix=inputs=N:duration=longest`
- Output: `-t planDuration` remains authoritative

## Fixture (deterministic)

| Layer | Duration / timing |
|-------|-------------------|
| Visual / plan | 10.0s |
| Voice | 2.5s tone |
| Music | 12s source, loop trimmed |
| Ambience | 12s |
| SFX #1 | 1.0s |
| SFX #2 | 5.5s |
| Ducking envelope | 2.0–4.5s |

## Measured results (deploy SHA module)

| Metric | Expected | Actual |
|--------|----------|--------|
| `final-mix.m4a` duration | ~10s | **10.0s** |
| `final-export.mp4` duration | ~10s | **10.0s** |
| Ducking before voice | baseline | −33.0 dB mean |
| During voice | lower | −40.8 dB mean (**−7.8 dB**) |
| After voice | recovery | −37.7 dB mean |
| SFX @ 1.0s | audible | −31.9 dB |
| SFX @ 5.5s | audible | −34.8 dB |
| AI/provider calls during mix | 0 | **0** |

Artifacts: `docs/audits/full-studio-cert/audio-final/`

## Classification

| Gate | Status |
|------|--------|
| AUDIO_MIX_RUNTIME | CERTIFIED |
| DUCKING_RUNTIME | CERTIFIED |
| DISCRETE_SFX_RUNTIME | CERTIFIED |
| PRODUCTION_AUDIO_MIX | WORKING |

Note: Mix executed via deployed module at `90926699` (same code path as Production worker `applyStudioVoiceExportToMergedVideo`). No separate public “mix-only” Production HTTP was invoked; worker bundle includes fix after Vercel deploy from `main`.
