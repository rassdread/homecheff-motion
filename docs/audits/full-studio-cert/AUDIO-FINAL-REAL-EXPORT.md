# Scenario D — Real Advanced Final Audio Export

## Verdict: **PARTIAL** (mixer bug found + fixed locally; Production deploy required)

## Execution path

- Module: `src/lib/studio-audio-mix-ffmpeg.ts` (`mixStudioAudioLayers` + `muxStudioVideoWithMixedAudio`)
- Same code path as Production S2E-P1 merge handoff
- **Provider calls during mix: 0**

## Output artifacts

| Artifact | Path | Duration |
|----------|------|----------|
| Mixed audio | `audio-final/final-mix.m4a` | **10.0s** (after fix) |
| Final MP4 | `audio-final/final-export.mp4` | **10.0s** |

## Timeline

| Field | Value |
|-------|-------|
| timelineHash | `05c705321ffc172d` (v2 remix) |
| voiceCueCount | 1 |
| musicCueCount | 1 |
| ambienceCueCount | 1 |
| sfxCueCount | 2 |
| duckingEnvelopeCount | 1 |

## Ducking (measured dB mean)

| Window | Mean volume |
|--------|-------------|
| Before voice (0.2–1.5s) | −33.0 dB |
| During voice (2.2–4.0s) | −40.8 dB |
| After voice (5.0–5.4s) | −37.7 dB |

**Delta during duck: −7.8 dB** — music audibly lower under speech.

## SFX (timed)

| Cue | Window | Mean | Planned |
|-----|--------|------|---------|
| Bell | ~1.0s | −31.9 dB | 1.0s |
| Box | ~5.5s | −34.8 dB | 5.5s |

Both hits audible above bed; sync consumer-acceptable.

## P1 defect discovered

**Before fix:** `amix=duration=first` + unpadded short voice → mix truncated at **2.5s**; SFX at 5.5s and post-voice ducking **lost**.

**Fix (repo):** voice `apad` + `atrim` to plan duration; `amix=duration=longest`.

**Production:** fix **not deployed** during this cert run — real Production export still carries truncation risk until release.

## Classifications

| Gate | Status |
|------|--------|
| REAL_AUDIO_EXPORT | PARTIAL |
| REAL_DUCKING | WORKING (after fix) |
| REAL_SFX | WORKING (after fix) |
| AMBIENCE | WORKING |
| FINAL_MP4 | WORKING (local) |
