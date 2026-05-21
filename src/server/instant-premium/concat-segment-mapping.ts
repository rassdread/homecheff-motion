/**
 * Strict segment index / path ordering for final animated concat.
 */

import path from "node:path";
import type { SegmentJoinPlan } from "@/lib/exact-frame-continuity";
import { probeVideoSegment } from "@/server/instant-premium/segment-transition";

export const INVALID_SEGMENT_MAPPING = "INVALID_SEGMENT_MAPPING";

export class InvalidSegmentMappingError extends Error {
  readonly code = INVALID_SEGMENT_MAPPING;

  constructor(message: string) {
    super(message);
    this.name = "InvalidSegmentMappingError";
  }
}

export type TransitionSegmentRecord = {
  segmentIndex: number;
  transitionId: string;
  order: number;
  startImageId: string;
  endImageId: string;
  outputVideoUrl: string;
};

export type ConcatSegmentMapEntry = {
  segmentIndex: number;
  sourceSegmentId: string;
  order: number;
  startImageId: string;
  endImageId: string;
  sourceVideoUrl: string;
  selectedSourcePath: string;
  normalizedPath?: string;
  repairedPath?: string;
  joinPlanIndex?: number;
  joinMode?: string;
  continuityMode?: string;
  sharedKeyframe?: boolean;
  outputDurationSec?: number;
  sourceType?: string;
};

/** Canonical play order: ascending transition.order. */
export function orderTransitionsByOrder<T extends { order: number }>(transitions: T[]): T[] {
  return [...transitions].sort((a, b) => a.order - b.order);
}

export function buildOrderedTransitionSegments(
  transitions: Array<{
    id: string;
    order: number;
    startImageId: string;
    endImageId: string;
    outputVideoUrl: string;
  }>
): TransitionSegmentRecord[] {
  const ordered = orderTransitionsByOrder(transitions);
  return ordered.map((t, segmentIndex) => ({
    segmentIndex,
    transitionId: t.id,
    order: t.order,
    startImageId: t.startImageId,
    endImageId: t.endImageId,
    outputVideoUrl: t.outputVideoUrl.trim(),
  }));
}

export function validateOrderedTransitionSegments(segments: TransitionSegmentRecord[]): void {
  const indexSet = new Set<number>();
  const idSet = new Set<string>();
  const urlSet = new Set<string>();

  for (const seg of segments) {
    if (indexSet.has(seg.segmentIndex)) {
      throw new InvalidSegmentMappingError(
        `Duplicate segmentIndex ${seg.segmentIndex} in transition mapping.`
      );
    }
    indexSet.add(seg.segmentIndex);

    if (idSet.has(seg.transitionId)) {
      throw new InvalidSegmentMappingError(
        `Duplicate transition id ${seg.transitionId} in segment mapping.`
      );
    }
    idSet.add(seg.transitionId);

    if (urlSet.has(seg.outputVideoUrl)) {
      throw new InvalidSegmentMappingError(
        `Duplicate outputVideoUrl for segmentIndex ${seg.segmentIndex} (${seg.transitionId}).`
      );
    }
    urlSet.add(seg.outputVideoUrl);

    if (seg.segmentIndex < 0 || !Number.isInteger(seg.segmentIndex)) {
      throw new InvalidSegmentMappingError(`Invalid segmentIndex ${seg.segmentIndex}.`);
    }
  }

  for (let i = 0; i < segments.length; i += 1) {
    const expected = i;
    if (segments[i]!.segmentIndex !== expected) {
      throw new InvalidSegmentMappingError(
        `Segment index gap: expected segmentIndex ${expected}, got ${segments[i]!.segmentIndex}.`
      );
    }
  }

  for (let i = 0; i < segments.length - 1; i += 1) {
    const current = segments[i]!;
    const next = segments[i + 1]!;
    if (current.endImageId !== next.startImageId) {
      throw new InvalidSegmentMappingError(
        `Transition chain break at join ${i}→${i + 1}: end ${current.endImageId} ≠ start ${next.startImageId}.`
      );
    }
  }
}

export function validateJoinPlansAlignment(
  joinPlans: SegmentJoinPlan[],
  segmentCount: number
): void {
  const expectedJoins = Math.max(0, segmentCount - 1);
  if (joinPlans.length !== expectedJoins) {
    throw new InvalidSegmentMappingError(
      `Expected ${expectedJoins} join plans for ${segmentCount} segments; got ${joinPlans.length}.`
    );
  }
  for (let i = 0; i < joinPlans.length; i += 1) {
    const plan = joinPlans[i]!;
    if (plan.segmentA !== i || plan.segmentB !== i + 1) {
      throw new InvalidSegmentMappingError(
        `Join plan ${i} maps ${plan.segmentA}→${plan.segmentB}; expected ${i}→${i + 1}.`
      );
    }
  }
}

export function validateUniqueConcatPaths(
  paths: string[],
  options?: { allowDuplicateIndices?: boolean }
): void {
  if (paths.length === 0) {
    throw new InvalidSegmentMappingError("No concat paths provided.");
  }

  const resolved = paths.map((p) => path.resolve(p));
  for (let i = 0; i < resolved.length; i += 1) {
    for (let j = i + 1; j < resolved.length; j += 1) {
      if (resolved[i] === resolved[j]) {
        throw new InvalidSegmentMappingError(
          `Segments ${i} and ${j} point to the same media file: ${resolved[i]}`
        );
      }
    }
  }

  if (!options?.allowDuplicateIndices && paths.some((p) => !p?.trim())) {
    throw new InvalidSegmentMappingError("Empty concat path in segment list.");
  }
}

export async function assertFinalConcatInputOrder(params: {
  projectId: string;
  paths: string[];
  segmentCount: number;
  minDurationSec?: number;
}): Promise<void> {
  const { projectId, paths, segmentCount, minDurationSec = 0.2 } = params;

  if (paths.length !== segmentCount) {
    throw new InvalidSegmentMappingError(
      `[${projectId}] Concat input count ${paths.length} !== segment count ${segmentCount}.`
    );
  }

  validateUniqueConcatPaths(paths);

  for (let i = 0; i < paths.length; i += 1) {
    const probed = await probeVideoSegment(paths[i]!);
    if (!probed || probed.durationSec < minDurationSec) {
      throw new InvalidSegmentMappingError(
        `[${projectId}] Segment ${i} invalid duration (${probed?.durationSec ?? 0}s).`
      );
    }
  }
}

export function logConcatSegmentMap(entries: ConcatSegmentMapEntry[]): void {
  for (const entry of entries) {
    console.info("[concat-segment-map]", entry);
  }
  console.info("[concat-segment-map]", {
    phase: "final_concat_order",
    playOrder: entries.map((e) => e.segmentIndex + 1),
    paths: entries.map((e) => e.selectedSourcePath),
    transitionIds: entries.map((e) => e.sourceSegmentId),
  });
}

export function buildConcatSegmentMapEntries(params: {
  segments: TransitionSegmentRecord[];
  pathsToConcat: string[];
  localSegmentPaths: string[];
  joinPlans: SegmentJoinPlan[];
  sourceTypes?: Array<string | undefined>;
}): ConcatSegmentMapEntry[] {
  const { segments, pathsToConcat, localSegmentPaths, joinPlans, sourceTypes } = params;

  return segments.map((seg) => {
    const joinPlanIndex =
      seg.segmentIndex < joinPlans.length ? seg.segmentIndex : undefined;
    const join = joinPlanIndex != null ? joinPlans[joinPlanIndex] : undefined;
    const nextSeg = segments[seg.segmentIndex + 1];
    const sharedKeyframe =
      nextSeg != null && seg.endImageId === nextSeg.startImageId;
    return {
      segmentIndex: seg.segmentIndex,
      sourceSegmentId: seg.transitionId,
      order: seg.order,
      startImageId: seg.startImageId,
      endImageId: seg.endImageId,
      sourceVideoUrl: seg.outputVideoUrl,
      selectedSourcePath: pathsToConcat[seg.segmentIndex]!,
      normalizedPath: localSegmentPaths[seg.segmentIndex],
      joinPlanIndex,
      joinMode: join?.joinMode,
      continuityMode: join?.mode,
      sharedKeyframe,
      sourceType: sourceTypes?.[seg.segmentIndex],
    };
  });
}
