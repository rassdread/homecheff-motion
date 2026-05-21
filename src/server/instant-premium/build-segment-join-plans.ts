/**
 * Build per-join continuity plans for instant premium merge.
 */

import {
  buildSegmentJoinPlan,
  type SegmentJoinPlan,
} from "@/lib/exact-frame-continuity";
import { transitionDurationSeconds } from "@/server/instant-premium/segment-transition";
import type { SegmentTransitionType } from "@/lib/segment-transition-types";
import { scoreKeyframePairWithPixels } from "@/server/instant-premium/keyframe-image-similarity";
import { validateJoinPlansAlignment } from "@/server/instant-premium/concat-segment-mapping";

export type TransitionWithImages = {
  order: number;
  startImageId: string;
  endImageId: string;
  startPreviewUrl: string | null;
  endPreviewUrl: string | null;
};

export async function buildSegmentJoinPlansForProject(params: {
  transitions: TransitionWithImages[];
  transitionType: SegmentTransitionType;
}): Promise<SegmentJoinPlan[]> {
  const sorted = [...params.transitions].sort((a, b) => a.order - b.order);
  const baseSec = transitionDurationSeconds(params.transitionType);
  const plans: SegmentJoinPlan[] = [];

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const current = sorted[i]!;
    const next = sorted[i + 1]!;
    const score = await scoreKeyframePairWithPixels({
      endImageId: current.endImageId,
      startImageId: next.startImageId,
      endPreviewUrl: current.endPreviewUrl,
      startPreviewUrl: next.startPreviewUrl,
    });
    plans.push(
      buildSegmentJoinPlan({
        segmentA: i,
        segmentB: i + 1,
        score,
        baseTransitionSec: baseSec,
      })
    );
  }

  validateJoinPlansAlignment(plans, sorted.length);
  return plans;
}
