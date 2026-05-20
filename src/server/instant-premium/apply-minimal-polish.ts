import path from "node:path";
import {
  buildMinimalPolishVideoFilter,
  type MinimalCompositorInput,
} from "@/lib/premium-minimal-compositor";
import type { FxPresetId } from "@/lib/premium-fx-presets";
import {
  FINAL_MERGE_DISABLE_AUDIO,
  FINAL_MERGE_VIDEO_CRF,
  FINAL_MERGE_VIDEO_PRESET,
} from "@/lib/media-export-constants";
import { resolveFfmpegForTextOverlay, runFfmpegCapture } from "@/lib/video-ffmpeg-capability";

/** Lightweight color/glow pass on merged output — never overlays static posters. */
export async function applyMinimalPolishToVideo(input: {
  inputPath: string;
  outputPath: string;
  fxPreset: FxPresetId;
}): Promise<boolean> {
  const filter = buildMinimalPolishVideoFilter({
    enabled: true,
    fxPreset: input.fxPreset,
  } satisfies MinimalCompositorInput);
  if (!filter) {
    return false;
  }
  const ffmpeg = await resolveFfmpegForTextOverlay();
  const args = [
    "-y",
    "-i",
    input.inputPath,
    "-vf",
    filter,
    "-c:v",
    "libx264",
    "-preset",
    FINAL_MERGE_VIDEO_PRESET,
    "-crf",
    String(FINAL_MERGE_VIDEO_CRF),
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
  ];
  if (FINAL_MERGE_DISABLE_AUDIO) {
    args.push("-an");
  } else {
    args.push("-c:a", "copy");
  }
  args.push(input.outputPath);

  const result = await runFfmpegCapture(ffmpeg, args, { timeoutMs: 10 * 60 * 1000 });
  if (result.code !== 0) {
    throw new Error(
      `Minimal polish failed (${path.basename(input.inputPath)}): ${result.output?.slice(-400) ?? "ffmpeg error"}`
    );
  }
  return true;
}
