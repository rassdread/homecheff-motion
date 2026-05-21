/**
 * Rebuild final output validation — structural checks beyond byte-identical hash.
 */

import fs from "node:fs/promises";
import {
  ExportBlobUploadError,
  uploadPublicBlob,
} from "@/lib/vercel-blob-config";
import { rebuildCandidateBlobPathname } from "@/lib/final-video-storage";
import { getRebuildAssemblyTrace } from "@/server/instant-premium/rebuild-assembly-trace";
import { probeVideoSegment } from "@/server/instant-premium/segment-transition";

export const REBUILD_OUTPUT_VALIDATION_FAILED = "REBUILD_OUTPUT_VALIDATION_FAILED";

export class RebuildOutputValidationError extends Error {
  readonly code = REBUILD_OUTPUT_VALIDATION_FAILED;

  constructor(message: string) {
    super(message);
    this.name = "RebuildOutputValidationError";
  }
}

export type RebuildFinalValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  concatInputCount: number;
  middleSegmentInConcat: boolean;
  finalDurationSec: number | null;
  expectedMinDurationSec: number;
  ffprobeOk: boolean;
};

export function validateRebuildFinalOutput(params: {
  projectId: string;
  finalOutputPath: string;
  expectedSegmentCount: number;
  perSegmentDurationSec: number | null;
}): Promise<RebuildFinalValidationResult> {
  return validateRebuildFinalOutputInner(params);
}

async function validateRebuildFinalOutputInner(params: {
  projectId: string;
  finalOutputPath: string;
  expectedSegmentCount: number;
  perSegmentDurationSec: number | null;
}): Promise<RebuildFinalValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const trace = getRebuildAssemblyTrace(params.projectId);
  const concatSegments =
    trace?.segments.filter((s) => s.concatInputPath?.trim() && s.concatInputHash) ?? [];
  const concatInputCount = concatSegments.length;

  if (concatInputCount !== params.expectedSegmentCount) {
    errors.push(
      `concat trace has ${concatInputCount} input(s); expected ${params.expectedSegmentCount}.`
    );
  }

  const middleSegmentInConcat =
    params.expectedSegmentCount < 2 ||
    concatSegments.some((s) => s.segmentIndex === 1 && Boolean(s.concatInputHash?.trim()));

  if (params.expectedSegmentCount >= 3 && !middleSegmentInConcat) {
    errors.push("middle segment (index 1) missing from concat input trace.");
  }

  const perSeg = params.perSegmentDurationSec ?? 4;
  const expectedMinDurationSec = Math.max(
    1,
    params.expectedSegmentCount * perSeg * 0.65
  );

  let finalDurationSec: number | null = null;
  let ffprobeOk = false;
  try {
    await fs.access(params.finalOutputPath);
    const probed = await probeVideoSegment(params.finalOutputPath);
    if (!probed) {
      errors.push("final output has no readable video stream.");
    } else {
      ffprobeOk = true;
      finalDurationSec = probed.durationSec;
      if (probed.durationSec < expectedMinDurationSec) {
        errors.push(
          `final duration ${probed.durationSec.toFixed(2)}s < expected minimum ${expectedMinDurationSec.toFixed(2)}s (${params.expectedSegmentCount} segments).`
        );
      }
    }
  } catch {
    errors.push(`cannot read final output at ${params.finalOutputPath}`);
  }

  if (trace?.segments.length && trace.segments.length < params.expectedSegmentCount) {
    warnings.push(
      `rebuild trace recorded ${trace.segments.length} segment(s); expected ${params.expectedSegmentCount}.`
    );
  }

  const ok = errors.length === 0;

  console.info("[rebuild-output-validation]", {
    projectId: params.projectId,
    ok,
    concatInputCount,
    expectedSegmentCount: params.expectedSegmentCount,
    middleSegmentInConcat,
    finalDurationSec,
    expectedMinDurationSec,
    errors,
    warnings,
  });

  return {
    ok,
    errors,
    warnings,
    concatInputCount,
    middleSegmentInConcat,
    finalDurationSec,
    expectedMinDurationSec,
    ffprobeOk,
  };
}

const CANDIDATE_BLOB_PROVIDER = "instant-rebuild-candidate";

export async function uploadRebuildCandidateToBlob(params: {
  projectId: string;
  rebuildId: string;
  localPath: string;
}): Promise<string> {
  const body = await fs.readFile(params.localPath);
  if (!body.length) {
    throw new Error("Rebuild candidate file is empty.");
  }
  const uploadTarget = rebuildCandidateBlobPathname(params.projectId, params.rebuildId);
  try {
    const { url } = await uploadPublicBlob({
      pathname: uploadTarget,
      body,
      contentType: "video/mp4",
      addRandomSuffix: false,
      context: {
        projectId: params.projectId,
        uploadTarget,
        provider: CANDIDATE_BLOB_PROVIDER,
      },
    });
    console.info("[rebuild-candidate-upload]", {
      projectId: params.projectId,
      rebuildId: params.rebuildId,
      uploadTarget,
      bytes: body.length,
      url,
    });
    return url;
  } catch (error) {
    if (error instanceof ExportBlobUploadError) {
      throw error;
    }
    throw new Error(
      `Rebuild candidate upload failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
