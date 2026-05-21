import {
  finalizeRebuildAssemblyTrace,
  getRebuildAssemblyTrace,
  segmentsChangedSincePreviousRebuild,
} from "@/server/instant-premium/rebuild-assembly-trace";
import { isPlainConcatSafeMode } from "@/server/instant-premium/final-assembly-safe-mode";
import { logRebuildIdenticalOutput } from "@/server/instant-premium/rebuild-source-trace";
import {
  REBUILD_OUTPUT_VALIDATION_FAILED,
  RebuildOutputValidationError,
  uploadRebuildCandidateToBlob,
  validateRebuildFinalOutput,
} from "@/server/instant-premium/rebuild-output-validation";
import { STALE_REBUILD_OUTPUT } from "@/server/instant-premium/stale-rebuild-output";

export type RebuildFreshnessEvaluation = {
  identicalOutputDetected: boolean;
  segmentsChangedSincePreviousRebuild: boolean;
  previousFinalHash: string | null;
  finalOutputHash: string;
  rebuildCandidateUrl: string | null;
  plainConcatSafeMode: boolean;
};

export type FinalizeRebuildOutputParams = {
  projectId: string;
  rebuildId: string;
  finalOutputPath: string;
  finalOutputHash: string;
  previousFinalHash: string | null;
  expectedSegmentCount: number;
  perSegmentDurationSec: number | null;
};

export type FinalizeRebuildOutputResult = RebuildFreshnessEvaluation & {
  validationOk: boolean;
  validationErrors: string[];
  validationWarnings: string[];
};

/**
 * Upload rebuild candidate, validate concat structure, and finalize trace.
 * Does not throw for byte-identical hash alone — only when structural validation fails.
 */
export async function finalizeRebuildOutput(
  params: FinalizeRebuildOutputParams
): Promise<FinalizeRebuildOutputResult> {
  const plainConcatSafeMode = isPlainConcatSafeMode();
  const trace = getRebuildAssemblyTrace(params.projectId);
  const segmentHashes =
    trace?.segments.map((s) => s.downloadedFileHash).filter(Boolean) ?? [];
  const identicalOutputDetected = Boolean(
    params.previousFinalHash && params.finalOutputHash === params.previousFinalHash
  );
  const segmentsChanged = segmentsChangedSincePreviousRebuild(
    params.projectId,
    segmentHashes
  );

  let rebuildCandidateUrl: string | null = null;
  try {
    rebuildCandidateUrl = await uploadRebuildCandidateToBlob({
      projectId: params.projectId,
      rebuildId: params.rebuildId,
      localPath: params.finalOutputPath,
    });
  } catch (error) {
    console.warn("[rebuild-candidate-upload]", {
      projectId: params.projectId,
      rebuildId: params.rebuildId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const validation = await validateRebuildFinalOutput({
    projectId: params.projectId,
    finalOutputPath: params.finalOutputPath,
    expectedSegmentCount: params.expectedSegmentCount,
    perSegmentDurationSec: params.perSegmentDurationSec,
  });

  finalizeRebuildAssemblyTrace(params.projectId, {
    finalOutputPath: params.finalOutputPath,
    finalOutputHash: params.finalOutputHash,
    segmentHashes,
    identicalOutputDetected,
    rebuildCandidateUrl: rebuildCandidateUrl ?? undefined,
    validationOk: validation.ok,
    validationErrors: validation.errors,
  });

  if (identicalOutputDetected) {
    logRebuildIdenticalOutput({
      projectId: params.projectId,
      rebuildId: params.rebuildId,
      previousFinalHash: params.previousFinalHash,
      finalOutputHash: params.finalOutputHash,
      segmentHashes,
      segmentsChangedSincePreviousRebuild: segmentsChanged,
      rebuildCandidateUrl,
      validationOk: validation.ok,
      plainConcatSafeMode,
    });
  }

  if (!validation.ok) {
    throw new RebuildOutputValidationError(
      `[${REBUILD_OUTPUT_VALIDATION_FAILED}] ${validation.errors.join(" ")}` +
        (rebuildCandidateUrl ? ` Candidate: ${rebuildCandidateUrl}` : "")
    );
  }

  if (
    identicalOutputDetected &&
    segmentsChanged &&
    !plainConcatSafeMode
  ) {
    console.warn("[rebuild-output]", {
      projectId: params.projectId,
      rebuildId: params.rebuildId,
      code: STALE_REBUILD_OUTPUT,
      warning: "identical_output_hash_with_changed_segments",
      note: "uploading_anyway_validation_passed",
      rebuildCandidateUrl,
    });
  }

  return {
    identicalOutputDetected,
    segmentsChangedSincePreviousRebuild: segmentsChanged,
    previousFinalHash: params.previousFinalHash,
    finalOutputHash: params.finalOutputHash,
    rebuildCandidateUrl,
    plainConcatSafeMode,
    validationOk: validation.ok,
    validationErrors: validation.errors,
    validationWarnings: validation.warnings,
  };
}
