/**
 * Studio V34.6 — mouth image overlay during active speaker segments (FFmpeg, no Vidu).
 */

import fs from "node:fs/promises";
import path from "node:path";
import {
  characterHasMouthAssetsForOverlay,
  resolveMouthAssetUrl,
} from "@/lib/studio-character-mouth-assets";
import {
  resolveFfmpegForTextOverlay,
  runFfmpegCapture,
} from "@/lib/video-ffmpeg-capability";
import type { MotionCharacterPerformanceFrame } from "@/types/motion-character-performance-export";
import type { CharacterPerformanceProfile } from "@/types/studio-character-performance";

export type MouthAssetOverlayWindow = {
  startSec: number;
  endSec: number;
  assetUrl: string;
  characterId: string;
  mouthState: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export function buildMouthAssetOverlayWindows(params: {
  frames: MotionCharacterPerformanceFrame[];
  profiles: CharacterPerformanceProfile[];
  videoWidth: number;
  videoHeight: number;
  sampleIntervalSeconds?: number;
}): MouthAssetOverlayWindow[] {
  const profileById = new Map(params.profiles.map((p) => [p.characterId, p]));
  const interval = params.sampleIntervalSeconds ?? 0.25;
  const mouthW = Math.max(48, Math.round(params.videoWidth * 0.22));
  const mouthH = Math.max(36, Math.round(mouthW * 0.72));
  const x = Math.round((params.videoWidth - mouthW) / 2);
  const y = Math.round(params.videoHeight * 0.52);

  const activeFrames = params.frames
    .filter((f) => f.activeSpeaker)
    .sort((a, b) => a.time - b.time);

  const windows: MouthAssetOverlayWindow[] = [];
  let current: MouthAssetOverlayWindow | null = null;

  for (const frame of activeFrames) {
    const profile = profileById.get(frame.characterId);
    if (!profile || !characterHasMouthAssetsForOverlay(profile)) {
      continue;
    }
    const assetUrl = resolveMouthAssetUrl(profile, frame.mouthState);
    if (!assetUrl) {
      continue;
    }
    const start = frame.time;
    const end = frame.time + interval;
    if (
      current &&
      current.assetUrl === assetUrl &&
      current.characterId === frame.characterId &&
      Math.abs(current.endSec - start) < interval * 1.5
    ) {
      current.endSec = end;
      continue;
    }
    if (current) {
      windows.push(current);
    }
    current = {
      startSec: start,
      endSec: end,
      assetUrl,
      characterId: frame.characterId,
      mouthState: frame.mouthState,
      x,
      y,
      width: mouthW,
      height: mouthH,
    };
  }
  if (current) {
    windows.push(current);
  }
  return windows;
}

async function materializeMouthAsset(
  assetUrl: string,
  workDir: string,
  cacheKey: string
): Promise<string> {
  if (assetUrl.startsWith("/") && !assetUrl.startsWith("//")) {
    return path.resolve(process.cwd(), "public", assetUrl.replace(/^\//, ""));
  }
  const ext = assetUrl.toLowerCase().includes(".png") ? "png" : "jpg";
  const dest = path.join(workDir, `mouth-asset-${cacheKey}.${ext}`);
  try {
    await fs.access(dest);
    return dest;
  } catch {
    // fetch below
  }
  const response = await fetch(assetUrl, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) {
    throw new Error(`Could not fetch mouth asset (${response.status}).`);
  }
  const buf = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(dest, buf);
  return dest;
}

export async function burnStudioMouthAssetOverlay(params: {
  inputVideoPath: string;
  outputVideoPath: string;
  frames: MotionCharacterPerformanceFrame[];
  profiles: CharacterPerformanceProfile[];
  width: number;
  height: number;
  workDir: string;
}): Promise<{ ok: true; windowCount: number } | { ok: false; message: string }> {
  try {
    const windows = buildMouthAssetOverlayWindows({
      frames: params.frames,
      profiles: params.profiles,
      videoWidth: params.width,
      videoHeight: params.height,
    });
    if (windows.length === 0) {
      return { ok: false, message: "No mouth asset overlay windows to render." };
    }

    const localPaths: string[] = [];
    const urlToLocal = new Map<string, string>();
    for (let i = 0; i < windows.length; i += 1) {
      const win = windows[i]!;
      if (!urlToLocal.has(win.assetUrl)) {
        const local = await materializeMouthAsset(win.assetUrl, params.workDir, String(i));
        urlToLocal.set(win.assetUrl, local);
        localPaths.push(local);
      }
    }

    const uniqueLocals = [...new Set(urlToLocal.values())];
    const binary = await resolveFfmpegForTextOverlay();
    const inputArgs = ["-y", "-i", path.resolve(params.inputVideoPath)];
    for (const local of uniqueLocals) {
      inputArgs.push("-loop", "1", "-i", path.resolve(local));
    }

    const localIndex = new Map(uniqueLocals.map((p, idx) => [p, idx + 1]));
    const parts: string[] = [];
    let last = "[0:v]";

    for (let i = 0; i < windows.length; i += 1) {
      const win = windows[i]!;
      const local = urlToLocal.get(win.assetUrl)!;
      const inputIndex = localIndex.get(local)!;
      const outLabel = i === windows.length - 1 ? "[vout]" : `[vm${i + 1}]`;
      const enable = `between(t\\,${win.startSec}\\,${win.endSec})`;
      parts.push(
        `[${inputIndex}:v]scale=${win.width}:${win.height}:flags=lanczos,format=rgba[ma${i}];` +
          `${last}[ma${i}]overlay=${win.x}:${win.y}:enable='${enable}'${outLabel}`
      );
      last = outLabel;
    }

    const args = [
      ...inputArgs,
      "-filter_complex",
      parts.join(";"),
      "-map",
      "[vout]",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-shortest",
      "-movflags",
      "+faststart",
      path.resolve(params.outputVideoPath),
    ];

    const result = await runFfmpegCapture(binary, args, { timeoutMs: 12 * 60 * 1000 });
    if (result.code !== 0) {
      return {
        ok: false,
        message: result.output.trim().slice(-1200) || "Mouth asset overlay ffmpeg failed.",
      };
    }

    return { ok: true, windowCount: windows.length };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Mouth asset overlay failed.",
    };
  }
}
