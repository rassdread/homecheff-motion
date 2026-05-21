/**
 * Resolve per-segment concat inputs with animated-source priority.
 */

import type { CompositePosterMotionResult } from "@/server/instant-premium/poster-motion/poster-motion-compositor";
import {
  FinalSegmentSourceError,
  INVALID_FINAL_ASSEMBLY_SOURCE,
  INVALID_IMAGE_PLACEHOLDER,
  SEGMENT_VIDEO_MISSING,
  type FinalSegmentSourceKind,
} from "@/server/instant-premium/final-segment-source";
import {
  resolveConcatSegmentPath,
  type ConcatSegmentSourceType,
  type ResolveConcatSegmentCandidate,
} from "@/server/instant-premium/segment-motion-validation";

export type SegmentCompositeMeta = {
  segmentIndex: number;
  animatedViduPath: string;
  compositorResult?: CompositePosterMotionResult;
};

export function compositorSourceType(
  result: CompositePosterMotionResult | undefined
): ConcatSegmentSourceType | null {
  if (!result) {
    return null;
  }
  if (result.motionBlendApplied) {
    return "blended";
  }
  if (result.usedPassthroughFallback) {
    return "normalized";
  }
  if (result.usedStaticFallback) {
    return "static_fallback";
  }
  return null;
}

export function mapConcatSourceTypeToKind(
  sourceType: ConcatSegmentSourceType,
  allowStaticFallback: boolean
): FinalSegmentSourceKind {
  switch (sourceType) {
    case "animated_vidu":
      return "animated_vidu";
    case "repaired":
      return "repaired_video";
    case "normalized":
      return "normalized_video";
    case "blended":
      return "provider_video";
    case "static_fallback":
      return allowStaticFallback ? "provider_video" : INVALID_IMAGE_PLACEHOLDER;
    default:
      return "provider_video";
  }
}

export async function resolveFinalConcatSegmentPaths(params: {
  segments: SegmentCompositeMeta[];
  expectedSegmentCount: number;
  /** Still-image poster encode — off by default for completed projects */
  allowStaticFallback?: boolean;
}): Promise<{
  paths: string[];
  sourceTypes: ConcatSegmentSourceType[];
  sourceKinds: FinalSegmentSourceKind[];
}> {
  const allowStatic = params.allowStaticFallback === true;
  const sorted = [...params.segments].sort((a, b) => a.segmentIndex - b.segmentIndex);
  if (sorted.length !== params.expectedSegmentCount) {
    throw new FinalSegmentSourceError(
      SEGMENT_VIDEO_MISSING,
      `Compositor segment count ${sorted.length} !== expected ${params.expectedSegmentCount}.`
    );
  }

  const paths: string[] = new Array(params.expectedSegmentCount);
  const sourceTypes: ConcatSegmentSourceType[] = new Array(params.expectedSegmentCount);
  const sourceKinds: FinalSegmentSourceKind[] = new Array(params.expectedSegmentCount);

  for (const segment of sorted) {
    const idx = segment.segmentIndex;
    if (idx < 0 || idx >= params.expectedSegmentCount) {
      throw new FinalSegmentSourceError(
        INVALID_FINAL_ASSEMBLY_SOURCE,
        `Compositor segmentIndex ${idx} out of range.`
      );
    }

    const processedPath = segment.compositorResult?.outputPath;
    const compositorType = compositorSourceType(segment.compositorResult);

    const candidates: ResolveConcatSegmentCandidate[] = [];
    if (processedPath && compositorType && compositorType !== "static_fallback") {
      candidates.push({
        path: processedPath,
        sourceType: compositorType,
        priority: compositorType === "blended" ? 1 : 2,
      });
    } else if (processedPath && compositorType === "static_fallback" && allowStatic) {
      candidates.push({
        path: processedPath,
        sourceType: "static_fallback",
        priority: 4,
      });
    } else if (processedPath && compositorType === "static_fallback" && !allowStatic) {
      console.warn("[final-concat-source]", {
        segmentIndex: idx,
        action: "reject_static_fallback",
        processedPath,
        note: "using_animated_vidu_only",
      });
    }

    candidates.push({
      path: segment.animatedViduPath,
      sourceType: "animated_vidu",
      priority: 3,
    });

    let resolved: Awaited<ReturnType<typeof resolveConcatSegmentPath>>;
    try {
      resolved = await resolveConcatSegmentPath({
        segmentIndex: idx,
        animatedViduPath: segment.animatedViduPath,
        candidates,
        requireAnimated: !allowStatic,
      });
    } catch (error) {
      if (error instanceof FinalSegmentSourceError) {
        throw error;
      }
      throw error;
    }

    const kind = mapConcatSourceTypeToKind(resolved.sourceType, allowStatic);
    if (kind === INVALID_IMAGE_PLACEHOLDER) {
      throw new FinalSegmentSourceError(
        INVALID_FINAL_ASSEMBLY_SOURCE,
        `Segment ${idx} resolved to static/image placeholder; provider video required.`
      );
    }

    paths[idx] = resolved.path;
    sourceTypes[idx] = resolved.sourceType;
    sourceKinds[idx] = kind;
  }

  if (paths.some((p) => !p)) {
    throw new FinalSegmentSourceError(
      SEGMENT_VIDEO_MISSING,
      "Missing concat path for one or more segment indices."
    );
  }

  return { paths, sourceTypes, sourceKinds };
}
