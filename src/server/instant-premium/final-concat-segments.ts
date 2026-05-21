/**
 * Resolve per-segment concat inputs with animated-source priority.
 */

import type { CompositePosterMotionResult } from "@/server/instant-premium/poster-motion/poster-motion-compositor";
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

export async function resolveFinalConcatSegmentPaths(params: {
  segments: SegmentCompositeMeta[];
  expectedSegmentCount: number;
}): Promise<{ paths: string[]; sourceTypes: string[] }> {
  const sorted = [...params.segments].sort((a, b) => a.segmentIndex - b.segmentIndex);
  if (sorted.length !== params.expectedSegmentCount) {
    throw new Error(
      `Compositor segment count ${sorted.length} !== expected ${params.expectedSegmentCount}.`
    );
  }

  const paths: string[] = new Array(params.expectedSegmentCount);
  const sourceTypes: string[] = new Array(params.expectedSegmentCount);

  for (const segment of sorted) {
    const idx = segment.segmentIndex;
    if (idx < 0 || idx >= params.expectedSegmentCount) {
      throw new Error(`Compositor segmentIndex ${idx} out of range.`);
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
    }
    candidates.push({
      path: segment.animatedViduPath,
      sourceType: "animated_vidu",
      priority: 3,
    });

    const resolved = await resolveConcatSegmentPath({
      segmentIndex: idx,
      animatedViduPath: segment.animatedViduPath,
      candidates,
    });
    paths[idx] = resolved.path;
    sourceTypes[idx] = resolved.sourceType;
  }

  if (paths.some((p) => !p)) {
    throw new Error("Missing concat path for one or more segment indices.");
  }

  return { paths, sourceTypes };
}
