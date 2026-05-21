export type RebuildSourceTraceLog = {
  projectId: string;
  rebuildId: string;
  transitionId: string;
  segmentIndex: number;
  sourceVideoUrl: string;
  downloadedFilePath?: string;
  normalizedFilePath?: string;
  concatInputPath?: string;
  fileHash?: string;
  duration?: number;
  frameCount?: number;
};

export function logRebuildSourceTrace(entry: RebuildSourceTraceLog): void {
  console.info("[rebuild-source-trace]", entry);
}

export function logRebuildIdenticalOutput(data: Record<string, unknown>): void {
  console.warn("[rebuild-identical-output]", data);
}
