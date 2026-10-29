# FFmpeg runtime certification

## Isolated Vercel function

Project `prj_DsEQB7Sgm7rDm4kdBhkCn2LH9N0k` (not the live project). Deployment `dpl_ACFQ45zP4s7f4vC6V3bgwBoByx8a`. Request `GET /api/probe.js` returned HTTP 200.

```json
{
  "platform": "linux",
  "arch": "x64",
  "node": "v24.21.0",
  "vercel": true,
  "checks": [
    {"bin": "/usr/bin/ffmpeg", "exit": null, "error": "ENOENT"},
    {"bin": "/usr/local/bin/ffmpeg", "exit": null, "error": "ENOENT"},
    {"bin": "ffmpeg", "exit": null, "error": "ENOENT"}
  ],
  "h264": false,
  "aac": false,
  "tmp": true
}
```

H.264 and AAC are not available because no FFmpeg binary exists. `/tmp` exists. Function memory and a film-sized temp write were not measured.

## Production configuration

`FFMPEG_PATH` is set on preview and production. The decrypted value is one of `/usr/bin/ffmpeg`, `/usr/local/bin/ffmpeg`, `/usr/bin/ffprobe`, or `/usr/local/bin/ffprobe`. The exact string is not recorded here. The isolated function shows those stock paths are absent.

`VIDEO_RENDER_MODE` on preview and production is `worker`.

## Local macOS

The Node 24 export test resolved Homebrew FFmpeg at `/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg` and ffprobe at `/opt/homebrew/bin/ffprobe`. Outputs were H.264 video and AAC audio. That binary is not the production binary.

Verdict: Linux FFmpeg compatibility on the Vercel function is FAIL. Local FFmpeg compatibility is PASS.
