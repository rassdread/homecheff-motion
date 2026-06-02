/**
 * Final assembly — strict provider-video-only source selection (no poster/image placeholders).
 */

import {
  buildOrderedTransitionSegments,
  validateOrderedTransitionSegments,
  type TransitionSegmentRecord,
} from "@/server/instant-premium/concat-segment-mapping";
import {
  probeSegmentMotion,
  type SegmentMotionProbe,
} from "@/server/instant-premium/segment-motion-validation";
import { setFinalExportStage } from "@/server/instant-premium/final-export-stage";
import { upsertRebuildSegmentTrace } from "@/server/instant-premium/rebuild-assembly-trace";
import { probeVideoSegment } from "@/server/instant-premium/segment-transition";
import {
  assertFinalAssemblyTransitionInvariant,
  logTransitionTableDebug,
} from "@/server/instant-premium/final-assembly-invariants";
import {
  expectedAssemblySegmentCount,
  getStoryModePrimaryTransition,
  isStoryInstantMode,
  selectTransitionsForProviderStorageValidation,
} from "@/server/instant-premium/story-mode-transitions";
import {
  assertUniqueCanonicalProviderSources,
  downloadCanonicalProviderVideo,
  logProviderVideoStorage,
  resolveCanonicalOutputVideoUrl,
  type CanonicalProviderSegment,
  type CanonicalProviderTransitionInput,
  ProviderVideoPipelineError,
} from "@/server/instant-premium/canonical-provider-video";

export { DUPLICATE_PROVIDER_VIDEO_SOURCE } from "@/server/instant-premium/canonical-provider-video";

export function wrapProviderVideoPipelineError(error: unknown): FinalSegmentSourceError {
  if (error instanceof FinalSegmentSourceError) {
    return error;
  }
  if (error instanceof ProviderVideoPipelineError) {
    return new FinalSegmentSourceError(error.code, error.message);
  }
  throw error;
}

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

/** @deprecated Use downloadCanonicalProviderVideo — always fresh canonical download. */
export async function downloadProviderVideoToWorkDir(params: {
  url: string;
  workDir: string;
  segmentIndex: number;
  segmentCount?: number;
  transitionId?: string;
  projectId?: string;
}): Promise<string> {
  const { canonicalProviderVideoPath } = await downloadCanonicalProviderVideo({
    canonicalOutputVideoUrl: params.url,
    workDir: params.workDir,
    transitionId: params.transitionId ?? `seg-${params.segmentIndex}`,
    segmentIndex: params.segmentIndex,
    segmentCount: params.segmentCount,
    projectId: params.projectId ?? "unknown",
  });
  return canonicalProviderVideoPath;
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

  const sourceKind: FinalSegmentSourceKind = "provider_video";
  if (motion?.likelyFrozen) {
    console.warn("[final-segment-source]", {
      projectId: params.projectId,
      segmentIndex: params.segmentIndex,
      warning: "low_motion_score_not_excluding",
      motionScore: motion?.motionScore,
      identicalFrameRatio: motion?.identicalFrameRatio,
    });
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
  instantMode?: string | null;
  images: Array<{ id: string; order: number }>;
  transitions: Array<{
    id: string;
    order: number;
    startImageId: string;
    endImageId: string;
    status: string;
    provider: string | null;
    providerJobId: string | null;
    outputVideoUrl: string | null;
    updatedAt?: Date | string | null;
  }>;
  workDir: string;
  strictRebuild?: boolean;
  sourceKindsBySegmentIndex?: Record<number, FinalSegmentSourceKind>;
}): Promise<{
  orderedSegments: TransitionSegmentRecord[];
  providerVideoPaths: string[];
  canonicalProviderVideoPaths: string[];
  canonicalSegments: CanonicalProviderSegment[];
  sourceLogs: FinalSegmentSourceLogEntry[];
  timeline: AdminAssemblyTimelineEntry[];
}> {
  assertFinalAssemblyTransitionInvariant({
    projectId: params.projectId,
    images: params.images,
    transitions: params.transitions,
    instantMode: params.instantMode,
  });

  const storyMode = isStoryInstantMode(params.instantMode);
  const assemblySegmentCount = expectedAssemblySegmentCount(
    params.images.length,
    params.instantMode
  );
  const rows = buildFinalSegmentTransitionRows(params.transitions);
  const assemblyRows = storyMode
    ? rows.filter((row) => row.transitionOrder === 0)
    : rows;
  assertAllTransitionsHaveProviderVideo({
    projectId: params.projectId,
    rows: assemblyRows,
    expectedCount: assemblySegmentCount,
  });

  logTransitionTableDebug({
    projectId: params.projectId,
    imageCount: params.images.length,
    expectedTransitionCount: assemblySegmentCount,
    transitions: rows.map((row) => ({
      index: row.segmentIndex,
      id: row.transitionId,
      order: row.transitionOrder,
      status: row.status,
      startImageId: row.startImageId,
      endImageId: row.endImageId,
      outputVideoUrlPresent: Boolean(row.providerVideoUrl),
      providerJobId: row.providerJobId,
      sourceKind: params.sourceKindsBySegmentIndex?.[row.segmentIndex] ?? "provider_video",
    })),
  });

  const primaryRow = storyMode ? getStoryModePrimaryTransition(rows) : null;
  const segmentRows =
    storyMode && primaryRow ?
      [primaryRow]
    : rows.filter((r) => Boolean(r.providerVideoUrl));
  const orderedSegments = buildOrderedTransitionSegments(
    segmentRows.map((r, index) => ({
      id: r.transitionId,
      order: index,
      startImageId: r.startImageId,
      endImageId: r.endImageId,
      outputVideoUrl: r.providerVideoUrl,
    }))
  );
  validateOrderedTransitionSegments(orderedSegments);

  const transitionsForProviderStorage = selectTransitionsForProviderStorageValidation(
    params.instantMode,
    params.transitions
  );
  const storageInputs: CanonicalProviderTransitionInput[] = transitionsForProviderStorage.map(
    (t) => ({
      transitionId: t.id,
      segmentIndex: rows.find((r) => r.transitionId === t.id)?.segmentIndex ?? t.order,
      transitionOrder: t.order,
      status: t.status,
      provider: t.provider,
      providerJobId: t.providerJobId,
      outputVideoUrl: t.outputVideoUrl,
      updatedAt: t.updatedAt,
    })
  );

  try {
    await logProviderVideoStorage({
      projectId: params.projectId,
      transitions: storageInputs,
    });
  } catch (error) {
    throw wrapProviderVideoPipelineError(error);
  }

  const providerVideoPaths: string[] = new Array(orderedSegments.length);
  const canonicalSegments: CanonicalProviderSegment[] = [];
  const sourceLogs: FinalSegmentSourceLogEntry[] = [];

  for (const seg of orderedSegments) {
    const row =
      segmentRows.find((r) => r.transitionId === seg.transitionId) ??
      rows[seg.segmentIndex]!;
    const transitionInput = params.transitions.find((t) => t.id === row.transitionId)!;
    setFinalExportStage(params.projectId, "download_segments", {
      activeSegment: seg.segmentIndex,
    });

    try {
      const canonicalUrl = resolveCanonicalOutputVideoUrl({
        status: row.status,
        outputVideoUrl: row.providerVideoUrl,
      });
      const { canonicalProviderVideoPath, downloadedHash } = await downloadCanonicalProviderVideo({
        canonicalOutputVideoUrl: canonicalUrl,
        workDir: params.workDir,
        transitionId: row.transitionId,
        segmentIndex: seg.segmentIndex,
        segmentCount: orderedSegments.length,
        projectId: params.projectId,
      });

      const validated = await validateProviderVideoFile({
        localPath: canonicalProviderVideoPath,
        segmentIndex: seg.segmentIndex,
        projectId: params.projectId,
      });

      if (validated.sourceKind === INVALID_IMAGE_PLACEHOLDER) {
        throw new FinalSegmentSourceError(
          INVALID_FINAL_ASSEMBLY_SOURCE,
          `[${params.projectId}] Segment ${seg.segmentIndex} (order ${row.transitionOrder}) is a still/image placeholder, not provider motion video.`
        );
      }

      providerVideoPaths[seg.segmentIndex] = canonicalProviderVideoPath;
      canonicalSegments.push({
        transitionId: row.transitionId,
        segmentIndex: seg.segmentIndex,
        transitionOrder: row.transitionOrder,
        canonicalOutputVideoUrl: canonicalUrl,
        canonicalProviderVideoPath,
        downloadedHash,
        provider: transitionInput.provider,
        providerJobId: row.providerJobId,
      });

      if (params.strictRebuild) {
        upsertRebuildSegmentTrace(params.projectId, {
          transitionId: row.transitionId,
          segmentIndex: seg.segmentIndex,
          sourceVideoUrl: canonicalUrl,
          downloadedFilePath: canonicalProviderVideoPath,
          downloadedFileHash: downloadedHash,
          durationSec: validated.probed.durationSec,
          frameCountEstimate: validated.motion.frameCountEstimate,
        });
      }
      const entry: FinalSegmentSourceLogEntry = {
        projectId: params.projectId,
        transitionOrder: row.transitionOrder,
        transitionId: row.transitionId,
        startImageId: row.startImageId,
        endImageId: row.endImageId,
        status: row.status,
        selectedVideoUrl: canonicalUrl,
        localPath: canonicalProviderVideoPath,
        sourceKind: "provider_video",
        durationSec: validated.probed.durationSec,
        frameCount: validated.motion.frameCountEstimate,
        motionScore: validated.motion.motionScore,
        providerJobId: row.providerJobId,
      };
      logFinalSegmentSource(entry);
      sourceLogs.push(entry);
    } catch (error) {
      throw wrapProviderVideoPipelineError(error);
    }
  }

  try {
    assertUniqueCanonicalProviderSources({
      projectId: params.projectId,
      segments: canonicalSegments,
    });
  } catch (error) {
    throw wrapProviderVideoPipelineError(error);
  }

  return {
    orderedSegments,
    providerVideoPaths,
    canonicalProviderVideoPaths: providerVideoPaths,
    canonicalSegments,
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
