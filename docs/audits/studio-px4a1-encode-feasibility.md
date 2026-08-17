# PX.4A.1 — Client encode feasibility spike

**Date:** 2026-08-17  
**Method:** Playwright `page.setContent` canvas `captureStream` + MediaRecorder. Distinguishes `isTypeSupported` from a real Blob (`type` + `size`).

HomeCheff listing/dish contract: MP4/MOV/M4V, ≤30s, ≤50MB.

## Results

| Family | Probe | `isTypeSupported('video/mp4')` | Real Blob MIME | Real bytes | WebCodecs AVC | Plan |
|--------|--------|--------------------------------|----------------|------------|---------------|------|
| Chrome desktop 148 | Playwright Chromium | Claims **true** | `video/mp4;codecs=avc1.420015` | **>0** | `VideoEncoder` absent in this Playwright Chromium | **mediarecorder-mp4** — HomeCheff-compatible |
| Chromium Android (Pixel 5 profile) | Playwright Chromium mobile | Claims **true** | `video/mp4;codecs=avc1.420015` | **>0** | same | **mediarecorder-mp4** |
| Safari desktop | Playwright WebKit 26.4 | Claims **true** (also claims webm — do not trust) | `video/mp4; codecs=avc1.42000a` | **0** | **supported** | Do **not** treat as proven MP4 |
| Safari iOS | Playwright iPhone 13 / mobile-webkit | Claims **true** | `video/mp4; codecs=avc1.42000a` | **0** | **supported** | Same as desktop Safari |

## Law learned

`MediaRecorder.isTypeSupported` is **not** a successful export.

Chrome 148 in this lab **did** emit a non-empty H.264 MP4 from canvas capture. Playwright WebKit reported an MP4 MIME with **empty bytes**.

## Chosen 4A.5 export architecture (not implemented in 4A.1)

1. **Primary:** MediaRecorder H.264 MP4 when a **non-empty** Blob is produced (proven here on Chromium).
2. **Safari/iOS fallback (smallest, still client, no worker, no wasm bundle):** WebCodecs `avc1` + a small local muxer. WebKit probe reported `VideoEncoder.isConfigSupported(avc1.42001f) === true`.
3. **Unsupported device:** honest copy. No paid render, no worker ffmpeg, no ffmpeg.wasm unless separately approved.

Preview in 4A.1 does **not** encode. This spike only unblocks architecture so 4A.5 is not a surprise.

## Audio

4A.1 has no music. 4A.2/4A.5 must mix audio into the same client encode. Safari empty-video-blob risk applies to muxing too — certify with a non-empty video track first.
