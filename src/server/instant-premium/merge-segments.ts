import {
  expectedAssemblySegmentCount,
  isStoryInstantMode,
} from "@/server/instant-premium/story-mode-transitions";

export const MERGE_SEGMENTS_MISSING = "MERGE_SEGMENTS_MISSING";

export type MergeSegmentLogEntry = {
  projectId: string;
  segmentCount: number;
  segmentIndex: number;
  segmentUrl: string;
  duration: number | null;
  mode: string;
};

export function logMergeSegment(entry: MergeSegmentLogEntry): void {
  console.info("[merge-segments]", entry);
}

export type ValidateMergeSegmentsInput = {
  projectId: string;
  segmentCount: number;
  concatInputCount: number;
  expectedDurationSec: number;
  /** Transition mode: per-clip Vidu segment duration estimate. */
  perSegmentDurationSec: number | null;
  /**
   * Story multiframe: sum of ffprobe durations on provider clip(s).
   * When set, compared to expectedDurationSec instead of segmentCount × perSegmentDurationSec.
   */
  actualSourceDurationSec?: number | null;
  segmentUrls: string[];
};

export class MergeSegmentsValidationError extends Error {
  readonly code = MERGE_SEGMENTS_MISSING;

  constructor(message: string) {
    super(message);
    this.name = "MergeSegmentsValidationError";
  }
}

const MIN_COVERAGE_RATIO = 0.85;

export function sumProbedSegmentDurationsSec(durations: number[]): number | null {
  const valid = durations.filter((d) => typeof d === "number" && Number.isFinite(d) && d > 0);
  if (valid.length === 0) {
    return null;
  }
  return valid.reduce((sum, d) => sum + d, 0);
}

export function resolveMergeSourceDurationSec(input: {
  segmentCount: number;
  perSegmentDurationSec: number | null;
  actualSourceDurationSec?: number | null;
}): number | null {
  const actual = input.actualSourceDurationSec;
  if (typeof actual === "number" && Number.isFinite(actual) && actual > 0) {
    return actual;
  }
  if (
    typeof input.perSegmentDurationSec === "number" &&
    Number.isFinite(input.perSegmentDurationSec) &&
    input.perSegmentDurationSec > 0 &&
    input.segmentCount > 0
  ) {
    return input.segmentCount * input.perSegmentDurationSec;
  }
  return null;
}

export function buildMergeSegmentsValidationInput(params: {
  projectId: string;
  instantMode: string | null | undefined;
  imageCount: number;
  concatInputCount: number;
  expectedDurationSec: number;
  perSegmentDurationSec: number | null;
  segmentUrls: string[];
  probedSegmentDurationsSec?: number[];
}): ValidateMergeSegmentsInput {
  const segmentCount = expectedAssemblySegmentCount(params.imageCount, params.instantMode);
  const storyMultiframe =
    isStoryInstantMode(params.instantMode) && segmentCount === 1;

  if (storyMultiframe) {
    return {
      projectId: params.projectId,
      segmentCount,
      concatInputCount: params.concatInputCount,
      expectedDurationSec: params.expectedDurationSec,
      perSegmentDurationSec: null,
      actualSourceDurationSec: sumProbedSegmentDurationsSec(
        params.probedSegmentDurationsSec ?? []
      ),
      segmentUrls: params.segmentUrls,
    };
  }

  return {
    projectId: params.projectId,
    segmentCount,
    concatInputCount: params.concatInputCount,
    expectedDurationSec: params.expectedDurationSec,
    perSegmentDurationSec: params.perSegmentDurationSec,
    segmentUrls: params.segmentUrls,
  };
}

/**
 * Fail before final export when multi-segment projects would produce a single-clip merge.
 */
export function validateMergeSegmentsBeforeExport(input: ValidateMergeSegmentsInput): void {
  const {
    projectId,
    segmentCount,
    concatInputCount,
    expectedDurationSec,
    segmentUrls,
  } = input;

  if (segmentCount > 1 && concatInputCount !== segmentCount) {
    throw new MergeSegmentsValidationError(
      `[${projectId}] Expected ${segmentCount} concat inputs but got ${concatInputCount}.`
    );
  }

  const distinctUrls = new Set(segmentUrls.map((u) => u.trim()).filter(Boolean));
  if (segmentCount > 1 && distinctUrls.size <= 1) {
    throw new MergeSegmentsValidationError(
      `[${projectId}] All ${segmentCount} segments share the same video URL; cannot build a multi-scene final.`
    );
  }

  const sourceDurationSec = resolveMergeSourceDurationSec(input);
  if (sourceDurationSec != null) {
    const minCoverage = expectedDurationSec * MIN_COVERAGE_RATIO;
    if (sourceDurationSec < minCoverage) {
      throw new MergeSegmentsValidationError(
        `[${projectId}] Source segments cover ~${sourceDurationSec.toFixed(1)}s but final target is ${expectedDurationSec}s.`
      );
    }
  }
}
