# Final Video Audio Evidence

**Status:** NOT_RUN

## Required evidence (pending browser cert)

For each pilot track, at least one export with:

- ffprobe: audio stream present
- Duration plausible vs composition
- Non-silent segment in selected window
- Volume 0% vs non-zero functional difference

## Methodology (planned)

1. FREE_LOCAL export with catalog track + known fragment offset (non-zero start)
2. ffprobe `-show_streams` on output MP4
3. Optional RMS spot-check on audio segment (not acoustic fingerprint claim)

## Verdict

**FINAL_VIDEO_AUDIO: NOT_RUN**
