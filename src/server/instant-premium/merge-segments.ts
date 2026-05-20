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
  perSegmentDurationSec: number | null;
  segmentUrls: string[];
};

export class MergeSegmentsValidationError extends Error {
  readonly code = MERGE_SEGMENTS_MISSING;

  constructor(message: string) {
    super(message);
    this.name = "MergeSegmentsValidationError";
  }
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
    perSegmentDurationSec,
    segmentUrls,
  } = input;

  if (segmentCount > 1 && concatInputCount <= 1) {
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

  if (
    typeof perSegmentDurationSec === "number" &&
    Number.isFinite(perSegmentDurationSec) &&
    perSegmentDurationSec > 0 &&
    segmentCount > 0
  ) {
    const sourceDurationSec = segmentCount * perSegmentDurationSec;
    const minCoverage = expectedDurationSec * 0.85;
    if (sourceDurationSec < minCoverage) {
      throw new MergeSegmentsValidationError(
        `[${projectId}] Source segments cover ~${sourceDurationSec}s but final target is ${expectedDurationSec}s.`
      );
    }
  }
}
