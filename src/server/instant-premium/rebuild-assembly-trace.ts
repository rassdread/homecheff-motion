import { logRebuildSourceTrace } from "@/server/instant-premium/rebuild-source-trace";

export type RebuildSegmentTrace = {
  transitionId: string;
  segmentIndex: number;
  sourceVideoUrl: string;
  downloadedFilePath: string;
  downloadedFileHash: string;
  normalizedFilePath?: string;
  normalizedFileHash?: string;
  concatInputPath?: string;
  concatInputHash?: string;
  durationSec?: number;
  frameCountEstimate?: number;
};

export type RebuildAssemblyTrace = {
  projectId: string;
  rebuildId: string;
  workspacePath: string;
  startedAt: string;
  completedAt?: string;
  previousFinalHash: string | null;
  finalOutputPath?: string;
  finalOutputHash?: string;
  segmentHashes: string[];
  identicalOutputDetected: boolean;
  rebuildCandidateUrl?: string | null;
  validationOk?: boolean;
  validationErrors?: string[];
  segments: RebuildSegmentTrace[];
};

const LAST_TRACE = new Map<string, RebuildAssemblyTrace>();
const PREVIOUS_TRACE = new Map<string, RebuildAssemblyTrace>();

export function segmentsChangedSincePreviousRebuild(
  projectId: string,
  currentSegmentHashes: string[]
): boolean {
  const prev = PREVIOUS_TRACE.get(projectId);
  if (!prev?.segmentHashes.length) {
    return true;
  }
  if (prev.segmentHashes.length !== currentSegmentHashes.length) {
    return true;
  }
  return prev.segmentHashes.some((hash, index) => hash !== currentSegmentHashes[index]);
}

export function startRebuildAssemblyTrace(params: {
  projectId: string;
  rebuildId: string;
  workspacePath: string;
  previousFinalHash: string | null;
}): RebuildAssemblyTrace {
  const prior = LAST_TRACE.get(params.projectId);
  if (prior?.finalOutputHash) {
    PREVIOUS_TRACE.set(params.projectId, prior);
  }
  const trace: RebuildAssemblyTrace = {
    projectId: params.projectId,
    rebuildId: params.rebuildId,
    workspacePath: params.workspacePath,
    startedAt: new Date().toISOString(),
    previousFinalHash: params.previousFinalHash,
    segmentHashes: [],
    identicalOutputDetected: false,
    segments: [],
  };
  LAST_TRACE.set(params.projectId, trace);
  return trace;
}

export function getRebuildAssemblyTrace(projectId: string): RebuildAssemblyTrace | null {
  return LAST_TRACE.get(projectId) ?? null;
}

export function upsertRebuildSegmentTrace(
  projectId: string,
  entry: RebuildSegmentTrace
): void {
  const trace = LAST_TRACE.get(projectId);
  if (!trace) {
    return;
  }
  const idx = trace.segments.findIndex((s) => s.segmentIndex === entry.segmentIndex);
  if (idx >= 0) {
    trace.segments[idx] = { ...trace.segments[idx], ...entry };
  } else {
    trace.segments.push(entry);
  }
  trace.segments.sort((a, b) => a.segmentIndex - b.segmentIndex);
  logRebuildSourceTrace({
    projectId,
    rebuildId: trace.rebuildId,
    transitionId: entry.transitionId,
    segmentIndex: entry.segmentIndex,
    sourceVideoUrl: entry.sourceVideoUrl,
    downloadedFilePath: entry.downloadedFilePath,
    normalizedFilePath: entry.normalizedFilePath,
    concatInputPath: entry.concatInputPath,
    fileHash: entry.concatInputHash ?? entry.normalizedFileHash ?? entry.downloadedFileHash,
    duration: entry.durationSec,
    frameCount: entry.frameCountEstimate,
  });
}

export function finalizeRebuildAssemblyTrace(
  projectId: string,
  patch: Partial<
    Pick<
      RebuildAssemblyTrace,
      | "completedAt"
      | "finalOutputPath"
      | "finalOutputHash"
      | "segmentHashes"
      | "identicalOutputDetected"
      | "rebuildCandidateUrl"
      | "validationOk"
      | "validationErrors"
    >
  >
): RebuildAssemblyTrace | null {
  const trace = LAST_TRACE.get(projectId);
  if (!trace) {
    return null;
  }
  Object.assign(trace, patch);
  if (patch.completedAt === undefined) {
    trace.completedAt = new Date().toISOString();
  }
  return trace;
}
