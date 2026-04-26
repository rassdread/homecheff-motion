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

export function toProjectSnapshotResponse(project: ProjectSnapshotSource): ProjectSnapshotResponse {
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
  };
}
