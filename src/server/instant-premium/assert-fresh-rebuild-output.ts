import {
  finalizeRebuildAssemblyTrace,
  getRebuildAssemblyTrace,
  segmentsChangedSincePreviousRebuild,
} from "@/server/instant-premium/rebuild-assembly-trace";
import { logRebuildIdenticalOutput } from "@/server/instant-premium/rebuild-source-trace";
import {
  STALE_REBUILD_OUTPUT,
  StaleRebuildOutputError,
} from "@/server/instant-premium/stale-rebuild-output";

export function assertFreshRebuildOutput(params: {
  projectId: string;
  rebuildId: string;
  finalOutputPath: string;
  finalOutputHash: string;
  previousFinalHash: string | null;
}): void {
  const trace = getRebuildAssemblyTrace(params.projectId);
  const segmentHashes =
    trace?.segments.map((s) => s.downloadedFileHash).filter(Boolean) ?? [];
  const identicalOutputDetected = Boolean(
    params.previousFinalHash && params.finalOutputHash === params.previousFinalHash
  );

  finalizeRebuildAssemblyTrace(params.projectId, {
    finalOutputPath: params.finalOutputPath,
    finalOutputHash: params.finalOutputHash,
    segmentHashes,
    identicalOutputDetected,
  });

  if (!identicalOutputDetected) {
    return;
  }

  const segmentsChanged = segmentsChangedSincePreviousRebuild(params.projectId, segmentHashes);

  logRebuildIdenticalOutput({
    projectId: params.projectId,
    rebuildId: params.rebuildId,
    previousFinalHash: params.previousFinalHash,
    finalOutputHash: params.finalOutputHash,
    segmentHashes,
    segmentsChangedSincePreviousRebuild: segmentsChanged,
  });

  if (segmentsChanged) {
    throw new StaleRebuildOutputError(
      `[${STALE_REBUILD_OUTPUT}] Rebuilt final is byte-identical to previous final while segment inputs changed.`
    );
  }
}
