import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const MARKETPLACE_VIDEO_NAMESPACE = "MARKETPLACE_VIDEO" as const;
export const STUDIO_RENDER_NAMESPACE = "STUDIO_RENDER" as const;
export const STUDIO_LANGUAGE_EXPORT_NAMESPACE = "STUDIO_LANGUAGE_EXPORT" as const;

export const MARKETPLACE_VIDEO_PROFILE = "marketplace-h264-v1" as const;

/** Worker capacity is parameterized. The product policy is chosen by the caller. */
export const MARKETPLACE_WORKER_CERTIFIED_MAX_SECONDS = 90;

export const PORTRAIT_MAX = { width: 720, height: 1280 } as const;
export const LANDSCAPE_MAX = { width: 1280, height: 720 } as const;

export const FFMPEG_TRANSCODE = {
  videoCodec: "libx264",
  preset: "veryfast",
  crf: 23,
  pixelFormat: "yuv420p",
  maxFps: 30,
  audioCodec: "aac",
  audioBitrate: "128k",
  faststart: true,
  scaleFlags: "lanczos",
} as const;

export type MarketplaceVideoFailureCode =
  | "MALFORMED"
  | "NO_VIDEO"
  | "DURATION"
  | "HDR_UNSUPPORTED"
  | "UNSUPPORTED"
  | "OVERSIZE"
  | "SOURCE_MISSING"
  | "BLOB_WRITE"
  | "FFPROBE"
  | "FFMPEG"
  | "BUSY";

export type MarketplaceProbe = {
  durationSeconds: number;
  container: string | null;
  videoCodec: string | null;
  audioCodec: string | null;
  width: number;
  height: number;
  displayWidth: number;
  displayHeight: number;
  frameRate: number | null;
  rotationDegrees: number;
  colorTransfer: string | null;
  colorPrimaries: string | null;
  colorSpace: string | null;
  pixelFormat: string | null;
  hasAudio: boolean;
  hdr: boolean;
};

export type MarketplaceDecision = "passthrough" | "transcode" | "reject";

export type MarketplaceJobResult =
  | {
      ok: true;
      namespace: typeof MARKETPLACE_VIDEO_NAMESPACE;
      decision: "passthrough" | "transcode";
      probe: MarketplaceProbe;
      outputPath: string;
      posterPath: string;
      outputWidth: number;
      outputHeight: number;
      outputDurationSeconds: number;
      outputVideoCodec: string;
      outputAudioCodec: string | null;
      settings: typeof FFMPEG_TRANSCODE;
    }
  | {
      ok: false;
      namespace: typeof MARKETPLACE_VIDEO_NAMESPACE;
      code: MarketplaceVideoFailureCode;
    };

type FfprobeStream = {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  pix_fmt?: string;
  color_transfer?: string;
  color_primaries?: string;
  color_space?: string;
  tags?: { rotate?: string };
  side_data_list?: Array<{ rotation?: number; side_data_type?: string }>;
};

type FfprobeJson = {
  format?: { duration?: string; format_name?: string };
  streams?: FfprobeStream[];
};

const DURATION_TOLERANCE_SECONDS = 0.05;
const MAX_ACCEPTED_FPS = 30;
const REASONABLE_BYTES_PER_SECOND = 900_000;

function even(value: number): number {
  const rounded = Math.max(2, Math.round(value));
  return rounded % 2 === 0 ? rounded : rounded - 1;
}

export function parseFrameRate(value: string | undefined): number | null {
  if (!value || value === "0/0") return null;
  const [num, den] = value.split("/").map((part) => Number(part));
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  return num / den;
}

export function isHdrMetadata(probe: Pick<MarketplaceProbe, "colorTransfer" | "colorPrimaries">): boolean {
  const transfer = (probe.colorTransfer ?? "").toLowerCase();
  const primaries = (probe.colorPrimaries ?? "").toLowerCase();
  return (
    transfer === "smpte2084" ||
    transfer === "arib-std-b67" ||
    transfer === "smpte428" ||
    primaries === "bt2020"
  );
}

export function displaySize(width: number, height: number, rotationDegrees: number): { width: number; height: number } {
  const quarterTurn = Math.abs(rotationDegrees) % 180 === 90;
  return quarterTurn ? { width: height, height: width } : { width, height };
}

/**
 * Never upscale. Portrait stays within 720×1280. Landscape stays within 1280×720.
 * A 608×1080 source stays 608×1080.
 */
export function targetDimensions(width: number, height: number): { width: number; height: number; scaled: boolean } {
  const portrait = height > width;
  const maxW = portrait ? PORTRAIT_MAX.width : LANDSCAPE_MAX.width;
  const maxH = portrait ? PORTRAIT_MAX.height : LANDSCAPE_MAX.height;
  const scale = Math.min(1, maxW / width, maxH / height);
  return {
    width: even(width * scale),
    height: even(height * scale),
    scaled: scale < 0.999,
  };
}

export function decideMarketplaceVideo(input: {
  probe: MarketplaceProbe;
  sourceBytes: number;
  maxDurationSeconds: number;
}): { decision: MarketplaceDecision; code?: MarketplaceVideoFailureCode; output: { width: number; height: number } } {
  const { probe } = input;
  const output = targetDimensions(probe.displayWidth, probe.displayHeight);
  if (!probe.videoCodec || probe.width < 2 || probe.height < 2) {
    return { decision: "reject", code: "NO_VIDEO", output };
  }
  if (!Number.isFinite(probe.durationSeconds) || probe.durationSeconds <= 0) {
    return { decision: "reject", code: "MALFORMED", output };
  }
  if (probe.durationSeconds > input.maxDurationSeconds + DURATION_TOLERANCE_SECONDS) {
    return { decision: "reject", code: "DURATION", output };
  }
  if (probe.hdr) {
    return { decision: "reject", code: "HDR_UNSUPPORTED", output };
  }
  const container = (probe.container ?? "").toLowerCase();
  const mp4 = container.includes("mp4") || container.includes("mov") || container.includes("isom");
  const h264 = probe.videoCodec === "h264";
  const audioOk = !probe.hasAudio || probe.audioCodec === "aac";
  const fpsOk = probe.frameRate == null || probe.frameRate <= MAX_ACCEPTED_FPS + 0.05;
  const pixelsOk = !output.scaled;
  const sizeOk = input.sourceBytes <= probe.durationSeconds * REASONABLE_BYTES_PER_SECOND;
  const orientationOk = probe.rotationDegrees % 360 === 0;
  if (mp4 && h264 && audioOk && fpsOk && pixelsOk && sizeOk && orientationOk && probe.pixelFormat === "yuv420p") {
    return { decision: "passthrough", output };
  }
  return { decision: "transcode", output };
}

function run(command: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on("data", (chunk) => out.push(chunk as Buffer));
    child.stderr.on("data", (chunk) => err.push(chunk as Buffer));
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        code: code ?? 1,
        stdout: Buffer.concat(out).toString("utf8"),
        stderr: Buffer.concat(err).toString("utf8"),
      });
    });
  });
}

export async function probeMarketplaceFile(filePath: string, ffprobePath = "ffprobe"): Promise<MarketplaceProbe | null> {
  const result = await run(ffprobePath, [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);
  if (result.code !== 0) return null;
  let parsed: FfprobeJson;
  try {
    parsed = JSON.parse(result.stdout) as FfprobeJson;
  } catch {
    return null;
  }
  const video = (parsed.streams ?? []).find((stream) => stream.codec_type === "video");
  if (!video?.width || !video.height) return null;
  const audio = (parsed.streams ?? []).find((stream) => stream.codec_type === "audio");
  const sideRotation = video.side_data_list?.find((item) => typeof item.rotation === "number")?.rotation ?? 0;
  const tagRotation = Number(video.tags?.rotate ?? 0);
  const rotationDegrees = Number.isFinite(sideRotation) && sideRotation !== 0 ? sideRotation : tagRotation || 0;
  const display = displaySize(video.width, video.height, rotationDegrees);
  const probe: MarketplaceProbe = {
    durationSeconds: Number(parsed.format?.duration ?? 0),
    container: parsed.format?.format_name ?? null,
    videoCodec: video.codec_name ?? null,
    audioCodec: audio?.codec_name ?? null,
    width: video.width,
    height: video.height,
    displayWidth: display.width,
    displayHeight: display.height,
    frameRate: parseFrameRate(video.avg_frame_rate ?? video.r_frame_rate),
    rotationDegrees,
    colorTransfer: video.color_transfer ?? null,
    colorPrimaries: video.color_primaries ?? null,
    colorSpace: video.color_space ?? null,
    pixelFormat: video.pix_fmt ?? null,
    hasAudio: Boolean(audio),
    hdr: false,
  };
  probe.hdr = isHdrMetadata(probe);
  return probe;
}

async function posterFrom(input: {
  ffmpegPath: string;
  sourcePath: string;
  posterPath: string;
  durationSeconds: number;
}): Promise<boolean> {
  const offsets = [Math.min(1.2, Math.max(0.4, input.durationSeconds * 0.18)), Math.max(0.2, input.durationSeconds * 0.45)];
  for (const offset of offsets) {
    const result = await run(input.ffmpegPath, [
      "-y",
      "-ss",
      offset.toFixed(3),
      "-i",
      input.sourcePath,
      "-frames:v",
      "1",
      "-q:v",
      "3",
      input.posterPath,
    ]);
    if (result.code === 0) return true;
  }
  return false;
}

export async function processMarketplaceVideoFile(input: {
  sourcePath: string;
  workDir: string;
  maxDurationSeconds: number;
  sourceBytes?: number;
  ffmpegPath?: string;
  ffprobePath?: string;
}): Promise<MarketplaceJobResult> {
  const ffmpegPath = input.ffmpegPath ?? process.env.FFMPEG_PATH ?? "ffmpeg";
  const ffprobePath = input.ffprobePath ?? process.env.FFPROBE_PATH ?? "ffprobe";
  const maxDurationSeconds = input.maxDurationSeconds;
  if (!Number.isFinite(maxDurationSeconds) || maxDurationSeconds <= 0 || maxDurationSeconds > 120) {
    return { ok: false, namespace: MARKETPLACE_VIDEO_NAMESPACE, code: "DURATION" };
  }
  let probe: MarketplaceProbe | null;
  try {
    probe = await probeMarketplaceFile(input.sourcePath, ffprobePath);
  } catch {
    return { ok: false, namespace: MARKETPLACE_VIDEO_NAMESPACE, code: "FFPROBE" };
  }
  if (!probe) return { ok: false, namespace: MARKETPLACE_VIDEO_NAMESPACE, code: "FFPROBE" };
  const sourceBytes = input.sourceBytes ?? (await readFile(input.sourcePath)).byteLength;
  const decision = decideMarketplaceVideo({ probe, sourceBytes, maxDurationSeconds });
  if (decision.decision === "reject") {
    return { ok: false, namespace: MARKETPLACE_VIDEO_NAMESPACE, code: decision.code ?? "UNSUPPORTED" };
  }
  await mkdir(input.workDir, { recursive: true });
  const outputPath = path.join(input.workDir, "canonical.mp4");
  const posterPath = path.join(input.workDir, "poster.jpg");
  const args =
    decision.decision === "passthrough"
      ? ["-y", "-i", input.sourcePath, "-map", "0:v:0", "-map", "0:a?", "-c", "copy", "-movflags", "+faststart", outputPath]
      : [
          "-y",
          "-i",
          input.sourcePath,
          "-vf",
          `scale=${decision.output.width}:${decision.output.height}:flags=${FFMPEG_TRANSCODE.scaleFlags},fps=${FFMPEG_TRANSCODE.maxFps},format=${FFMPEG_TRANSCODE.pixelFormat}`,
          "-c:v",
          FFMPEG_TRANSCODE.videoCodec,
          "-preset",
          FFMPEG_TRANSCODE.preset,
          "-crf",
          String(FFMPEG_TRANSCODE.crf),
          "-pix_fmt",
          FFMPEG_TRANSCODE.pixelFormat,
          ...(probe.hasAudio
            ? ["-map", "0:v:0", "-map", "0:a:0", "-c:a", FFMPEG_TRANSCODE.audioCodec, "-b:a", FFMPEG_TRANSCODE.audioBitrate]
            : ["-map", "0:v:0", "-an"]),
          "-movflags",
          "+faststart",
          outputPath,
        ];
  const encoded = await run(ffmpegPath, args);
  if (encoded.code !== 0) return { ok: false, namespace: MARKETPLACE_VIDEO_NAMESPACE, code: "FFMPEG" };
  const posterOk = await posterFrom({
    ffmpegPath,
    sourcePath: outputPath,
    posterPath,
    durationSeconds: probe.durationSeconds,
  });
  if (!posterOk) return { ok: false, namespace: MARKETPLACE_VIDEO_NAMESPACE, code: "FFMPEG" };
  const outputProbe = await probeMarketplaceFile(outputPath, ffprobePath);
  if (!outputProbe || outputProbe.videoCodec !== "h264") {
    return { ok: false, namespace: MARKETPLACE_VIDEO_NAMESPACE, code: "FFMPEG" };
  }
  if (probe.hasAudio && outputProbe.audioCodec !== "aac") {
    return { ok: false, namespace: MARKETPLACE_VIDEO_NAMESPACE, code: "FFMPEG" };
  }
  if (outputProbe.durationSeconds > maxDurationSeconds + DURATION_TOLERANCE_SECONDS) {
    return { ok: false, namespace: MARKETPLACE_VIDEO_NAMESPACE, code: "DURATION" };
  }
  return {
    ok: true,
    namespace: MARKETPLACE_VIDEO_NAMESPACE,
    decision: decision.decision,
    probe,
    outputPath,
    posterPath,
    outputWidth: outputProbe.displayWidth,
    outputHeight: outputProbe.displayHeight,
    outputDurationSeconds: outputProbe.durationSeconds,
    outputVideoCodec: outputProbe.videoCodec,
    outputAudioCodec: outputProbe.audioCodec,
    settings: FFMPEG_TRANSCODE,
  };
}

export function marketplaceJobAdmission(input: {
  studioActive: number;
  marketplaceActive: number;
}): "ok" | "busy" {
  if (input.studioActive > 0 || input.marketplaceActive > 0) return "busy";
  return "ok";
}

export function workerMaxDurationCap(): number {
  return process.env.MARKETPLACE_VIDEO_ALLOW_HEADROOM === "1" ? 120 : 90;
}

export function isAllowedCallbackUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return url.hostname === "homecheff.eu" || url.hostname === "www.homecheff.eu";
  } catch {
    return false;
  }
}

const JOB_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isMarketplaceJobId(value: string): boolean {
  return JOB_ID_RE.test(value);
}

export function parseMarketplaceJobRequest(body: unknown): {
  ok: true;
  sourceUrl: string;
  maxDurationSeconds: number;
  callbackUrl: string | null;
} | { ok: false; code: MarketplaceVideoFailureCode | "BAD_REQUEST" } {
  if (!body || typeof body !== "object") return { ok: false, code: "BAD_REQUEST" };
  const record = body as Record<string, unknown>;
  const sourceUrl = typeof record.sourceUrl === "string" ? record.sourceUrl : "";
  const maxDurationSeconds = Number(record.maxDurationSeconds);
  if (!isAllowedMarketplaceSourceUrl(sourceUrl)) return { ok: false, code: "SOURCE_MISSING" };
  if (!sourceUrl.includes("/marketplace-video-sources/")) return { ok: false, code: "SOURCE_MISSING" };
  if (!Number.isFinite(maxDurationSeconds) || maxDurationSeconds <= 0) {
    return { ok: false, code: "DURATION" };
  }
  if (maxDurationSeconds > workerMaxDurationCap()) return { ok: false, code: "DURATION" };
  const callbackUrl = typeof record.callbackUrl === "string" ? record.callbackUrl : null;
  if (callbackUrl && !isAllowedCallbackUrl(callbackUrl)) return { ok: false, code: "BAD_REQUEST" };
  if (record.profile !== undefined && record.profile !== MARKETPLACE_VIDEO_PROFILE) {
    return { ok: false, code: "BAD_REQUEST" };
  }
  return { ok: true, sourceUrl, maxDurationSeconds, callbackUrl };
}

export function isAllowedMarketplaceSourceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export async function writeJobNote(filePath: string, note: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(note));
}
