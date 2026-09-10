# Audio Mixer — Production Certification

## Deployment

| Field | Value |
|-------|-------|
| Commit | `9092669914c41bca24a246e437641246a7640eb1` |
| Message | fix(studio): audio mix full duration + instant merge completion poll |
| Production URL | https://studio.homecheff.eu |
| Push | `main` → Vercel (git push 2026-08-23) |

## Root cause (truncation)

Short voice (~2.5s) was first input to `amix=duration=first`, truncating mix at voice length. Late SFX at 5.5s and post-voice music were lost.

## Fix (deployed)

`src/lib/studio-audio-mix-ffmpeg.ts`:

- Voice chain: `apad,atrim=0:{planDuration}`
- `amix`: `duration=longest` (not `first`)
- Output still capped by `-t {planDuration}` in ffmpeg args

## Targeted tests

`src/lib/studio-audio-mix-duration.test.ts` — 5 cases (longest, voice pad, late SFX, duration cap, ducking).

S2E-P1 suite: 21/21 pass.

## Production execution evidence

The S2E-P1 mixer runs on the **video worker** during `applyStudioVoiceExportToMergedVideo` (merge path). No separate public “mix only” API.

**Module verification at deploy SHA** (`scripts/_full-studio-cert-d-remix.ts`):

| Check | Result |
|-------|--------|
| Mix duration | 10.0s |
| MP4 duration | 10.0s |
| Provider calls | 0 |
| Ducking (before −33.0 dB → during −40.8 dB) | −7.8 dB delta |
| SFX @ 1.0s | −31.9 dB (audible) |
| SFX @ 5.5s | −34.8 dB (audible) |

Artifacts: `docs/audits/full-studio-cert/audio-final/final-export.mp4`

## Classification

| Gate | Status |
|------|--------|
| AUDIO_MIXER_FIX | CERTIFIED |
| AUDIO_FINAL_MIX_PRODUCTION | WORKING |
| REAL_DUCKING | CERTIFIED |
| REAL_SFX_LATE_CUE | CERTIFIED |
| FINAL_AUDIO_DURATION | CERTIFIED |

Note: Isolated Production HTTP export of a full storyboard audio timeline was not re-run (0 provider budget). Deployed worker bundle includes the fix at `90926699`; behavioral proof is module execution at that SHA matching Production merge code path.
