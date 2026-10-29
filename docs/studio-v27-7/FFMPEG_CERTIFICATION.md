# FFmpeg certification

| Check | Result |
|---|---|
| Live binary | VERIFIED. `/health/video` reports `/usr/bin/ffmpeg`, drawtext, readable DejaVu font |
| Live H.264 | NOT_VERIFIED. The health route does not list encoders. No live encode was run |
| Live AAC | NOT_VERIFIED. Same reason |
| Local worker H.264 and AAC | VERIFIED in V27.6 on Homebrew FFmpeg, 720×1280, one AAC stream after the existing mixer |
| Local in-process three-scene matrix | VERIFIED in V27.6 |
| Debian image from `Dockerfile.worker` | NOT_RUN. Docker is not installed. The image was not built |
| Second FFmpeg install | Not done |

`LOCAL_FFMPEG_PASS` stands. `ISOLATED_RENDER_RUNTIME_PASS` for the Docker image is BLOCKED. `LIVE_CODEC_READ_ONLY_VERIFIED` is limited to the binary and drawtext, not H.264 or AAC.
