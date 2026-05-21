/**
 * Final assembly — strict provider-video-only source selection (no poster/image placeholders).
 */

import fs from "node:fs/promises";
import path from "node:path";
import {
  buildOrderedTransitionSegments,
  validateOrderedTransitionSegments,
  type TransitionSegmentRecord,
} from "@/server/instant-premium/concat-segment-mapping";
import {
  probeSegmentMotion,
  type SegmentMotionProbe,
} from "@/server/instant-premium/segment-motion-validation";
import { probeVideoSegment } from "@/server/instant-premium/segment-transition";

export const SEGMENT_VIDEO_MISSING = "SEGMENT_VIDEO_MISSING";
export const INVALID_FINAL_ASSEMBLY_SOURCE = "INVALID_FINAL_ASSEMBLY_SOURCE";
export const INVALID_IMAGE_PLACEHOLDER = "INVALID_IMAGE_PLACEHOLDER";

export const MIN_FINAL_SEGMENT_DURATION_SEC = 1;
export const MIN_FINAL_SEGMENT_FRAME_COUNT = 11;

const IMAGE_MEDIA_PATTERN = /\.(jpe?g|png|webp|gif|bmp|avif|heic)(\?|#|$)/i;

export type FinalSegmentSourceKind =
  | "provider_video"
  | "repaired_video"
  | "normalized_video"
  | "animated_vidu"
  | "INVALID_IMAGE_PLACEHOLDER";

export type FinalSegmentTransitionRow = {
  transitionId: string;
  transitionOrder: number;
  segmentIndex: number;
  startImageId: string;
  endImageId: string;
  providerJobId: string | null;
  status: string;
  providerVideoUrl: string;
};

export type FinalSegmentSourceLogEntry = {
  projectId: string;
  transitionOrder: number;
  transitionId: string;
  startImageId: string;
  endImageId: string;
  status: string;
  selectedVideoUrl: string;
  localPath: string;
  sourceKind: FinalSegmentSourceKind;
  durationSec: number;
  frameCount: number;
  motionScore?: number;
  providerJobId?: string | null;
};

export type AdminAssemblyTimelineEntry = {
  segmentIndex: number;
  transitionOrder: number;
  label: string;
  startImageId: string;
  endImageId: string;
  videoUrlPresent: boolean;
  providerVideoUrl: string | null;
  providerJobId: string | null;
  status: string;
};

export class FinalSegmentSourceError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "FinalSegmentSourceError";
    this.code = code;
  }
}

export function isImageLikeMediaUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) {
    return true;
  }
  if (IMAGE_MEDIA_PATTERN.test(trimmed)) {
    return true;
  }
  if (trimmed.includes("/preview") && !trimmed.endsWith(".mp4")) {
    return true;
  }
  return false;
}

export function isAllowedProviderVideoUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || isImageLikeMediaUrl(trimmed)) {
    return false;
  }
  if (trimmed.startsWith("/") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const withoutQuery = trimmed.split("?")[0] ?? trimmed;
    if (/\.(mp4|webm|mov|m4v)$/i.test(withoutQuery)) {
      return true;
    }
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return !isImageLikeMediaUrl(trimmed);
    }
    return trimmed.startsWith("/");
  }
  return false;
}

export function buildFinalSegmentTransitionRows(
  transitions: Array<{
    id: string;
    order: number;
    startImageId: string;
    endImageId: string;
    status: string;
    providerJobId: string | null;
    outputVideoUrl: string | null;
  }>
): FinalSegmentTransitionRow[] {
  const ordered = [...transitions].sort((a, b) => a.order - b.order);
  return ordered.map((t, segmentIndex) => ({
    transitionId: t.id,
    transitionOrder: t.order,
    segmentIndex,
    startImageId: t.startImageId,
    endImageId: t.endImageId,
    providerJobId: t.providerJobId,
    status: t.status,
    providerVideoUrl: (t.outputVideoUrl ?? "").trim(),
  }));
}

export function buildAdminAssemblyTimeline(
  rows: FinalSegmentTransitionRow[]
): AdminAssemblyTimelineEntry[] {
  return rows.map((row) => ({
    segmentIndex: row.segmentIndex,
    transitionOrder: row.transitionOrder,
    label: `${row.startImageId} → ${row.endImageId}`,
    startImageId: row.startImageId,
    endImageId: row.endImageId,
    videoUrlPresent: Boolean(row.providerVideoUrl && row.status === "completed"),
    providerVideoUrl: row.providerVideoUrl || null,
    providerJobId: row.providerJobId,
    status: row.status,
  }));
}

export function assertAllTransitionsHaveProviderVideo(params: {
  projectId: string;
  rows: FinalSegmentTransitionRow[];
  expectedCount: number;
}): void {
  const missing: number[] = [];
  const invalid: number[] = [];

  for (const row of params.rows) {
    if (row.status !== "completed" || !row.providerVideoUrl) {
      missing.push(row.transitionOrder);
      continue;
    }
    if (!isAllowedProviderVideoUrl(row.providerVideoUrl)) {
      invalid.push(row.transitionOrder);
    }
  }

  if (params.rows.length !== params.expectedCount) {
    throw new FinalSegmentSourceError(
      SEGMENT_VIDEO_MISSING,
      `[${params.projectId}] Expected ${params.expectedCount} transitions for final assembly; got ${params.rows.length} rows.`
    );
  }

  if (missing.length > 0) {
    throw new FinalSegmentSourceError(
      SEGMENT_VIDEO_MISSING,
      `[${params.projectId}] Missing completed provider video for transition order(s): ${missing.join(", ")}.`
    );
  }

  if (invalid.length > 0) {
    throw new FinalSegmentSourceError(
      INVALID_IMAGE_PLACEHOLDER,
      `[${params.projectId}] Transition order(s) ${invalid.join(", ")} have image/preview URLs instead of provider video.`
    );
  }
}

export function logFinalSegmentSource(entry: FinalSegmentSourceLogEntry): void {
  console.info("[final-segment-source]", entry);
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function absolutePublicPath(...segments: string[]): string {
  return path.join(process.cwd(), "public", ...segments);
}

export async function downloadProviderVideoToWorkDir(params: {
  url: string;
  workDir: string;
  segmentIndex: number;
}): Promise<string> {
  const trimmed = params.url.trim();
  if (trimmed.startsWith("/")) {
    const relative = trimmed.replace(/^\/+/, "");
    const abs = absolutePublicPath(...relative.split("/"));
    if (!(await pathExists(abs))) {
      throw new FinalSegmentSourceError(
        SEGMENT_VIDEO_MISSING,
        `Missing local provider video: ${trimmed}`
      );
    }
    const dest = path.join(params.workDir, `provider-seg-${params.segmentIndex}.mp4`);
    await fs.copyFile(abs, dest);
    return dest;
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const response = await fetch(trimmed, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) {
      throw new FinalSegmentSourceError(
        SEGMENT_VIDEO_MISSING,
        `Could not download provider video (${response.status}): ${trimmed}`
      );
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length <= 0) {
      throw new FinalSegmentSourceError(SEGMENT_VIDEO_MISSING, `Empty provider video: ${trimmed}`);
    }
    const dest = path.join(params.workDir, `provider-seg-${params.segmentIndex}.mp4`);
    await fs.writeFile(dest, buffer);
    return dest;
  }
  throw new FinalSegmentSourceError(
    INVALID_FINAL_ASSEMBLY_SOURCE,
    `Unsupported provider video URL: ${trimmed}`
  );
}

export async function validateProviderVideoFile(params: {
  localPath: string;
  segmentIndex: number;
  projectId: string;
}): Promise<{
  probed: NonNullable<Awaited<ReturnType<typeof probeVideoSegment>>>;
  motion: SegmentMotionProbe;
  sourceKind: FinalSegmentSourceKind;
}> {
  const probed = await probeVideoSegment(params.localPath);
  if (!probed) {
    throw new FinalSegmentSourceError(
      INVALID_FINAL_ASSEMBLY_SOURCE,
      `[${params.projectId}] Segment ${params.segmentIndex} has no video stream.`
    );
  }

  const motion = await probeSegmentMotion(params.localPath);
  const frameCount = motion?.frameCountEstimate ?? Math.round(probed.durationSec * probed.fps);
  const durationSec = probed.durationSec;

  if (durationSec < MIN_FINAL_SEGMENT_DURATION_SEC) {
    throw new FinalSegmentSourceError(
      INVALID_IMAGE_PLACEHOLDER,
      `[${params.projectId}] Segment ${params.segmentIndex} duration ${durationSec}s < ${MIN_FINAL_SEGMENT_DURATION_SEC}s.`
    );
  }

  if (frameCount < MIN_FINAL_SEGMENT_FRAME_COUNT) {
    throw new FinalSegmentSourceError(
      INVALID_IMAGE_PLACEHOLDER,
      `[${params.projectId}] Segment ${params.segmentIndex} frame count ${frameCount} < ${MIN_FINAL_SEGMENT_FRAME_COUNT}.`
    );
  }

  let sourceKind: FinalSegmentSourceKind = "provider_video";
  if (motion?.likelyFrozen) {
    sourceKind = INVALID_IMAGE_PLACEHOLDER;
  }

  return {
    probed,
    motion: motion ?? {
      durationSec,
      frameCountEstimate: frameCount,
      fps: probed.fps,
      motionScore: 0,
      identicalFrameRatio: 1,
      likelyFrozen: true,
      rejectedReason: "frozen_provider_video",
    },
    sourceKind,
  };
}

export async function prepareFinalSegmentProviderVideos(params: {
  projectId: string;
  transitions: Array<{
    id: string;
    order: number;
    startImageId: string;
    endImageId: string;
    status: string;
    providerJobId: string | null;
    outputVideoUrl: string | null;
  }>;
  workDir: string;
}): Promise<{
  orderedSegments: TransitionSegmentRecord[];
  providerVideoPaths: string[];
  sourceLogs: FinalSegmentSourceLogEntry[];
  timeline: AdminAssemblyTimelineEntry[];
}> {
  const rows = buildFinalSegmentTransitionRows(params.transitions);
  assertAllTransitionsHaveProviderVideo({
    projectId: params.projectId,
    rows,
    expectedCount: params.transitions.length,
  });

  const orderedSegments = buildOrderedTransitionSegments(
    rows.map((r) => ({
      id: r.transitionId,
      order: r.transitionOrder,
      startImageId: r.startImageId,
      endImageId: r.endImageId,
      outputVideoUrl: r.providerVideoUrl,
    }))
  );
  validateOrderedTransitionSegments(orderedSegments);

  const providerVideoPaths: string[] = new Array(rows.length);
  const sourceLogs: FinalSegmentSourceLogEntry[] = [];

  for (const seg of orderedSegments) {
    const row = rows[seg.segmentIndex]!;
    const localPath = await downloadProviderVideoToWorkDir({
      url: row.providerVideoUrl,
      workDir: params.workDir,
      segmentIndex: seg.segmentIndex,
    });
    const validated = await validateProviderVideoFile({
      localPath,
      segmentIndex: seg.segmentIndex,
      projectId: params.projectId,
    });

    if (validated.sourceKind === INVALID_IMAGE_PLACEHOLDER) {
      throw new FinalSegmentSourceError(
        INVALID_FINAL_ASSEMBLY_SOURCE,
        `[${params.projectId}] Segment ${seg.segmentIndex} (order ${row.transitionOrder}) is a still/image placeholder, not provider motion video.`
      );
    }

    providerVideoPaths[seg.segmentIndex] = localPath;
    const entry: FinalSegmentSourceLogEntry = {
      projectId: params.projectId,
      transitionOrder: row.transitionOrder,
      transitionId: row.transitionId,
      startImageId: row.startImageId,
      endImageId: row.endImageId,
      status: row.status,
      selectedVideoUrl: row.providerVideoUrl,
      localPath,
      sourceKind: "provider_video",
      durationSec: validated.probed.durationSec,
      frameCount: validated.motion.frameCountEstimate,
      motionScore: validated.motion.motionScore,
      providerJobId: row.providerJobId,
    };
    logFinalSegmentSource(entry);
    sourceLogs.push(entry);
  }

  return {
    orderedSegments,
    providerVideoPaths,
    sourceLogs,
    timeline: buildAdminAssemblyTimeline(rows),
  };
}

export function assertNoInvalidAssemblySources(params: {
  projectId: string;
  sourceKinds: FinalSegmentSourceKind[];
  segmentIndexes: number[];
}): void {
  for (let i = 0; i < params.sourceKinds.length; i += 1) {
    const kind = params.sourceKinds[i]!;
    if (kind === INVALID_IMAGE_PLACEHOLDER) {
      throw new FinalSegmentSourceError(
        INVALID_FINAL_ASSEMBLY_SOURCE,
        `[${params.projectId}] Segment ${params.segmentIndexes[i] ?? i} sourceKind=${kind}.`
      );
    }
  }
}
