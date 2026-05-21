/**
 * Seamless joins between ordered segments — shared keyframe at each boundary first.
 */

import type { SegmentJoinPlan } from "@/lib/exact-frame-continuity";
import { buildSegmentJoinPlan, scoreKeyframePairQuick } from "@/lib/exact-frame-continuity";
import type { TransitionSegmentRecord } from "@/server/instant-premium/concat-segment-mapping";
import { scoreKeyframePairWithPixels } from "@/server/instant-premium/keyframe-image-similarity";
import { transitionDurationSeconds } from "@/server/instant-premium/segment-transition";
import type { SegmentTransitionType } from "@/lib/segment-transition-types";
import { validateJoinPlansAlignment } from "@/server/instant-premium/concat-segment-mapping";

export type SharedKeyframeJoinInput = {
  segmentA: number;
  segmentB: number;
  endImageId: string;
  startImageId: string;
  endPreviewUrl: string | null;
  startPreviewUrl: string | null;
  sharedKeyframe: boolean;
};

/** Resolve boundary pair for join segmentA → segmentB (shared poster frame when ids match). */
export function resolveSharedKeyframeJoinInput(
  currentEndImageId: string,
  currentEndPreviewUrl: string | null,
  nextStartImageId: string,
  nextStartPreviewUrl: string | null,
  segmentA: number,
  segmentB: number
): SharedKeyframeJoinInput {
  const sharedKeyframe = currentEndImageId === nextStartImageId;
  const endUrl = currentEndPreviewUrl?.trim() || null;
  const startUrl = nextStartPreviewUrl?.trim() || null;
  const unified = sharedKeyframe ? endUrl || startUrl : endUrl;
  return {
    segmentA,
    segmentB,
    endImageId: currentEndImageId,
    startImageId: nextStartImageId,
    endPreviewUrl: unified,
    startPreviewUrl: sharedKeyframe ? unified : startUrl,
    sharedKeyframe,
  };
}

export type SeamlessJoinLogEntry = {
  joinIndex: number;
  segmentA: number;
  segmentB: number;
  sharedKeyframe: boolean;
  startImageId: string;
  endImageId: string;
  similarity: number;
  joinMode: string;
  continuityMode: string;
  transitionSec: number;
  mergeDissolveRatio: number;
  applyExposureCorrection: boolean;
};

export function logSeamlessSegmentJoin(entry: SeamlessJoinLogEntry): void {
  console.info("[seamless-segment-join]", entry);
}

export type BuildSeamlessJoinPlansParams = {
  orderedSegments: TransitionSegmentRecord[];
  imagePreviewById: Map<string, string | null | undefined>;
  transitionType: SegmentTransitionType;
};

/**
 * Build join plans after segment order is validated.
 * Scores the shared boundary keyframe (segment[i].end === segment[i+1].start).
 */
export async function buildSeamlessJoinPlansForOrderedSegments(
  params: BuildSeamlessJoinPlansParams
): Promise<SegmentJoinPlan[]> {
  const { orderedSegments, imagePreviewById, transitionType } = params;
  const baseSec = transitionDurationSeconds(transitionType);
  const plans: SegmentJoinPlan[] = [];

  for (let i = 0; i < orderedSegments.length - 1; i += 1) {
    const current = orderedSegments[i]!;
    const next = orderedSegments[i + 1]!;
    const boundary = resolveSharedKeyframeJoinInput(
      current.endImageId,
      imagePreviewById.get(current.endImageId) ?? null,
      next.startImageId,
      imagePreviewById.get(next.startImageId) ?? null,
      current.segmentIndex,
      next.segmentIndex
    );

    const score =
      boundary.sharedKeyframe &&
      boundary.endPreviewUrl &&
      boundary.startPreviewUrl &&
      boundary.endPreviewUrl === boundary.startPreviewUrl
        ? scoreKeyframePairQuick({
            endImageId: boundary.endImageId,
            startImageId: boundary.startImageId,
            endPreviewUrl: boundary.endPreviewUrl,
            startPreviewUrl: boundary.startPreviewUrl,
          })
        : await scoreKeyframePairWithPixels({
            endImageId: boundary.endImageId,
            startImageId: boundary.startImageId,
            endPreviewUrl: boundary.endPreviewUrl,
            startPreviewUrl: boundary.startPreviewUrl,
          });

    const plan = buildSegmentJoinPlan({
      segmentA: i,
      segmentB: i + 1,
      score,
      baseTransitionSec: baseSec,
    });

    plans.push({
      ...plan,
      reason: boundary.sharedKeyframe
        ? `${plan.reason};shared_keyframe`
        : plan.reason,
    });

    logSeamlessSegmentJoin({
      joinIndex: i,
      segmentA: plan.segmentA,
      segmentB: plan.segmentB,
      sharedKeyframe: boundary.sharedKeyframe,
      startImageId: boundary.startImageId,
      endImageId: boundary.endImageId,
      similarity: plan.similarity,
      joinMode: plan.joinMode,
      continuityMode: plan.mode,
      transitionSec: plan.transitionSec,
      mergeDissolveRatio: plan.mergeDissolveRatio,
      applyExposureCorrection: plan.applyExposureCorrection ?? false,
    });
  }

  validateJoinPlansAlignment(plans, orderedSegments.length);
  return plans;
}
