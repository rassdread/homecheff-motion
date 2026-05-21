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
}): Promise<string[]> {
  const paths: string[] = [];

  for (const segment of params.segments) {
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
      segmentIndex: segment.segmentIndex,
      animatedViduPath: segment.animatedViduPath,
      candidates,
    });
    paths.push(resolved.path);
  }

  return paths;
}
