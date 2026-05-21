import type { FinalExportStage } from "@/lib/export-timeout";

export type ActiveFinalExportStage = {
  projectId: string;
  stage: FinalExportStage;
  startedAt: string;
  activeSegment?: number;
  ffmpegCommand?: string;
  exportId?: string | null;
};

const ACTIVE = new Map<string, ActiveFinalExportStage>();

export function setFinalExportStage(
  projectId: string,
  stage: FinalExportStage,
  meta?: { activeSegment?: number; ffmpegCommand?: string; exportId?: string | null }
): void {
  ACTIVE.set(projectId, {
    projectId,
    stage,
    startedAt: new Date().toISOString(),
    activeSegment: meta?.activeSegment,
    ffmpegCommand: meta?.ffmpegCommand,
    exportId: meta?.exportId,
  });
}

export function clearFinalExportStage(projectId: string): void {
  ACTIVE.delete(projectId);
}

export function getFinalExportStage(projectId: string): ActiveFinalExportStage | null {
  return ACTIVE.get(projectId) ?? null;
}

export function elapsedMsForStage(projectId: string): number {
  const row = ACTIVE.get(projectId);
  if (!row?.startedAt) {
    return 0;
  }
  return Math.max(0, Date.now() - new Date(row.startedAt).getTime());
}
