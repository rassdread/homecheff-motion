"use client";

import { includedPhotos, type PhotoVideoComposition } from "@/lib/photo-video/composition";
import type { PhotoVideoContext } from "@/lib/photo-video/constants";
import { PHOTO_VIDEO_WATERMARK_SRC } from "@/lib/photo-video/constants";
import { copyAudioWindow, ownMusicExportWindow } from "@/lib/photo-video/export-audio";
import { photoVideoExportSettings, type PhotoVideoExportStage } from "@/lib/photo-video/export-settings";
import { PHOTO_VIDEO_AUDIO_CODEC, PHOTO_VIDEO_EXPORT_CONTAINER, PHOTO_VIDEO_VIDEO_CODEC } from "@/lib/photo-video/export-muxer";
import {
  looksLikeMp4Bytes,
  toPhotoVideoExportFile,
  validatePhotoVideoExportComposition,
  validatePhotoVideoExportFile,
  type PhotoVideoExportFailReason,
} from "@/lib/photo-video/export-validate";
import { drawPhotoVideoFrame, loadPhotoVideoImage, type PhotoVideoImageCache } from "@/lib/photo-video/render-frame";

export type { PhotoVideoExportStage };

export type PhotoVideoLocalExportResult =
  | { ok: true; file: File; durationSeconds: number; byteLength: number; method: "webcodecs-avc-mp4" }
  | { ok: false; reason: PhotoVideoExportFailReason };

export async function encodePhotoVideoLocal(input: {
  composition: PhotoVideoComposition;
  context: PhotoVideoContext;
  audioBlob?: Blob | null;
  placeholderText?: string;
  signal?: AbortSignal;
  onStage?: (stage: PhotoVideoExportStage) => void;
}): Promise<PhotoVideoLocalExportResult> {
  const preflight = validatePhotoVideoExportComposition(input.composition, input.context);
  if (!preflight.ok) return preflight;
  input.onStage?.("prepare");
  if (input.signal?.aborted) return { ok: false, reason: "cancelled" };

  let mediabunny: typeof import("mediabunny");
  try {
    mediabunny = await import("mediabunny");
  } catch {
    return { ok: false, reason: "unsupported" };
  }

  const settings = photoVideoExportSettings({
    ratio: input.composition.ratio,
    durationSeconds: preflight.durationSeconds,
    photoCount: preflight.photoCount,
    context: input.context,
  });
  const videoCodec = await mediabunny.getFirstEncodableVideoCodec([PHOTO_VIDEO_VIDEO_CODEC], {
    width: settings.width,
    height: settings.height,
    quality: new mediabunny.Quality({ bitrate: settings.videoBitrate }),
  });
  if (videoCodec !== PHOTO_VIDEO_VIDEO_CODEC) return { ok: false, reason: "unsupported" };

  const cache: PhotoVideoImageCache = new Map();
  const photos = includedPhotos(input.composition);
  try {
    await Promise.all(photos.map((photo) => loadPhotoVideoImage(photo.previewUrl, cache)));
  } catch {
    return { ok: false, reason: "encode" };
  }
  let watermark: HTMLImageElement | null = null;
  try {
    watermark = await loadPhotoVideoImage(PHOTO_VIDEO_WATERMARK_SRC, cache);
  } catch {
    watermark = null;
  }
  if (!watermark) return { ok: false, reason: "encode" };
  if (input.signal?.aborted) return { ok: false, reason: "cancelled" };

  const canvas = document.createElement("canvas");
  canvas.width = settings.width;
  canvas.height = settings.height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return { ok: false, reason: "unsupported" };

  const target = new mediabunny.BufferTarget();
  const output = new mediabunny.Output({
    format: new mediabunny.Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });
  const videoSource = new mediabunny.CanvasSource(canvas, {
    codec: PHOTO_VIDEO_VIDEO_CODEC,
    quality: new mediabunny.Quality({ bitrate: settings.videoBitrate, bitrateMode: "variable" }),
    keyFrameInterval: 2,
  });
  output.addVideoTrack(videoSource, { frameRate: settings.fps });

  const wantsAudio = input.composition.audio.kind === "ownMusic";
  let audioSource: InstanceType<typeof mediabunny.AudioBufferSource> | null = null;
  let sliced: AudioBuffer | null = null;
  if (wantsAudio) {
    input.onStage?.("music");
    const window = ownMusicExportWindow(input.composition.audio, preflight.durationSeconds);
    const blob = input.audioBlob;
    if (!window || !blob) {
      await output.cancel().catch(() => undefined);
      return { ok: false, reason: "encode" };
    }
    const audioCodec = await mediabunny.getFirstEncodableAudioCodec([PHOTO_VIDEO_AUDIO_CODEC], {
      quality: new mediabunny.Quality({ bitrate: settings.audioBitrate }),
    });
    if (audioCodec !== PHOTO_VIDEO_AUDIO_CODEC) {
      await output.cancel().catch(() => undefined);
      return { ok: false, reason: "unsupported" };
    }
    try {
      sliced = await decodeAndSliceOwnMusic(blob, window.startSeconds, window.durationSeconds, window.volume);
    } catch {
      await output.cancel().catch(() => undefined);
      return { ok: false, reason: "encode" };
    }
    audioSource = new mediabunny.AudioBufferSource({
      codec: PHOTO_VIDEO_AUDIO_CODEC,
      quality: new mediabunny.Quality({ bitrate: settings.audioBitrate }),
    });
    output.addAudioTrack(audioSource);
  }

  try {
    await output.start();
    if (audioSource && sliced) await audioSource.add(sliced);
    input.onStage?.("frames");
    const fps = settings.fps;
    const frameDuration = 1 / fps;
    const totalFrames = Math.max(1, Math.round(preflight.durationSeconds * fps));
    for (let i = 0; i < totalFrames; i += 1) {
      if (input.signal?.aborted) {
        await output.cancel().catch(() => undefined);
        return { ok: false, reason: "cancelled" };
      }
      const t = Math.min(preflight.durationSeconds - 1 / (fps * 2), i * frameDuration);
      drawPhotoVideoFrame({
        ctx,
        composition: input.composition,
        context: input.context,
        timeSeconds: t,
        images: cache,
        watermark,
        placeholderText: input.placeholderText ?? "",
        drawSelection: false,
      });
      await videoSource.add(i * frameDuration, frameDuration, i % Math.round(fps * 2) === 0 ? { keyFrame: true } : undefined);
    }
    input.onStage?.("mux");
    videoSource.close();
    audioSource?.close();
    await output.finalize();
  } catch {
    await output.cancel().catch(() => undefined);
    return { ok: false, reason: "encode" };
  }

  const buffer = target.buffer;
  if (!buffer || buffer.byteLength <= 0) return { ok: false, reason: "empty" };
  if (!looksLikeMp4Bytes(buffer)) return { ok: false, reason: "empty" };
  const blob = new Blob([buffer], { type: PHOTO_VIDEO_EXPORT_CONTAINER });
  const file = toPhotoVideoExportFile(blob);
  const validation = validatePhotoVideoExportFile({
    file,
    durationSeconds: preflight.durationSeconds,
    context: input.context,
    filename: file.name,
  });
  if (!validation.ok) return validation;
  return {
    ok: true,
    file,
    durationSeconds: preflight.durationSeconds,
    byteLength: file.size,
    method: "webcodecs-avc-mp4",
  };
}

async function decodeAndSliceOwnMusic(
  blob: Blob,
  startSeconds: number,
  durationSeconds: number,
  volume: number
): Promise<AudioBuffer> {
  const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) throw new Error("decode");
  const ctx = new Ctx();
  try {
    const bytes = await blob.arrayBuffer();
    const decoded = await ctx.decodeAudioData(bytes.slice(0));
    return copyAudioWindow(decoded, startSeconds, durationSeconds, volume);
  } finally {
    await ctx.close().catch(() => undefined);
  }
}

export function downloadPhotoVideoFile(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
