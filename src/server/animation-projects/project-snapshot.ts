import type { ProjectSnapshotResponse } from "@/types/animation-api";

/** Shape returned by `getAnimationProjectById` / `getAnimationProjectByIdForOwner` includes. */
type ProjectSnapshotSource = {
  id: string;
  status: string;
  intent: string | null;
  presetId: string;
  viduModel: string | null;
  viduResolution: string | null;
  viduDurationSeconds: number | null;
  estimatedCredits: number | null;
  userPrompt: string | null;
  projectType?: string;
  instantOutputDurationSeconds?: number | null;
  instantSelectedChips?: unknown;
  instantUserIntent?: string | null;
  images: Array<{
    id: string;
    order: number;
    fileName: string;
    previewUrl: string | null;
  }>;
  transitions: Array<{
    id: string;
    order: number;
    startImageId: string;
    endImageId: string;
    status: string;
    progress: number;
    outputVideoUrl: string | null;
    errorMessage: string | null;
  }>;
  exports: Array<{
    status: string;
    progress: number;
    provider: string | null;
    providerJobId: string | null;
    outputVideoUrl: string | null;
    errorMessage: string | null;
  }>;
};

function deriveExportLifecycle(project: ProjectSnapshotSource): {
  exportLifecycleStatus: "queued" | "running" | "finalizing" | "completed" | "failed";
  exportPhase:
    | "generating_clips"
    | "merging_clips"
    | "uploading_final"
    | "completed"
    | "failed";
  exportProgressPercent: number;
} {
  if (project.status === "failed") {
    return { exportLifecycleStatus: "failed", exportPhase: "failed", exportProgressPercent: 0 };
  }
  if (project.status === "completed") {
    return {
      exportLifecycleStatus: "completed",
      exportPhase: "completed",
      exportProgressPercent: 100,
    };
  }
  if (project.status === "generating") {
    const count = project.transitions.length;
    const avg =
      count > 0
        ? Math.round(project.transitions.reduce((a, t) => a + (t.progress ?? 0), 0) / count)
        : 5;
    return {
      exportLifecycleStatus: "running",
      exportPhase: "generating_clips",
      exportProgressPercent: Math.max(5, Math.min(95, avg)),
    };
  }
  const latestExport = project.exports[0];
  const p = Math.max(8, Math.min(99, latestExport?.progress ?? 8));
  const phase =
    p >= 85 ? "uploading_final" : "merging_clips";
  return {
    exportLifecycleStatus: p >= 85 ? "finalizing" : "running",
    exportPhase: phase,
    exportProgressPercent: p,
  };
}

export function toProjectSnapshotResponse(project: ProjectSnapshotSource): ProjectSnapshotResponse {
  const lifecycle = deriveExportLifecycle(project);
  return {
    id: project.id,
    status: project.status,
    images: project.images.map((img) => ({
      id: img.id,
      order: img.order,
      fileName: img.fileName,
      previewUrl: img.previewUrl,
    })),
    transitions: project.transitions.map((t) => ({
      id: t.id,
      order: t.order,
      startImageId: t.startImageId,
      endImageId: t.endImageId,
      status: t.status,
      progress: t.progress,
      outputVideoUrl: t.outputVideoUrl,
      errorMessage: t.errorMessage,
    })),
    exports: project.exports.map((e) => ({
      status: e.status,
      progress: e.progress,
      provider: e.provider,
      providerJobId: e.providerJobId,
      outputVideoUrl: e.outputVideoUrl,
      errorMessage: e.errorMessage,
    })),
    intent: project.intent,
    presetId: project.presetId,
    viduModel: project.viduModel,
    viduResolution: project.viduResolution,
    viduDurationSeconds: project.viduDurationSeconds,
    estimatedCredits: project.estimatedCredits,
    userPrompt: project.userPrompt,
    projectType: project.projectType ?? "classic",
    instantOutputDurationSeconds: project.instantOutputDurationSeconds ?? null,
    instantSelectedChips: project.instantSelectedChips ?? null,
    instantUserIntent: project.instantUserIntent ?? null,
    exportLifecycleStatus: lifecycle.exportLifecycleStatus,
    exportPhase: lifecycle.exportPhase,
    exportProgressPercent: lifecycle.exportProgressPercent,
  };
}
