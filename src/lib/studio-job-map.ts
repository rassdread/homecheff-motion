import type { StudioJob } from "@prisma/client";
import type {
  StudioJobCreateInput,
  StudioJobDetail,
  StudioJobListItem,
  StudioJobResult,
  StudioJobStatus,
  StudioJobType,
} from "@/types/studio-job";

function parseInputJson(value: unknown): StudioJobCreateInput {
  if (!value || typeof value !== "object") {
    return {};
  }
  const raw = value as Record<string, unknown>;
  return {
    sceneIds: Array.isArray(raw.sceneIds)
      ? raw.sceneIds.filter((id): id is string => typeof id === "string")
      : undefined,
    imageIds: Array.isArray(raw.imageIds)
      ? raw.imageIds.filter((id): id is string => typeof id === "string")
      : undefined,
    options:
      raw.options && typeof raw.options === "object"
        ? {
            autoSelect:
              (raw.options as Record<string, unknown>).autoSelect === undefined
                ? undefined
                : Boolean((raw.options as Record<string, unknown>).autoSelect),
          }
        : undefined,
  };
}

function parseResultJson(value: unknown): StudioJobResult | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as StudioJobResult;
}

export function mapStudioJobToListItem(row: StudioJob): StudioJobListItem {
  return {
    id: row.id,
    storyboardId: row.storyboardId,
    type: row.type as StudioJobType,
    status: row.status as StudioJobStatus,
    progress: row.progress,
    currentStep: row.currentStep,
    totalSteps: row.totalSteps,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    failedAt: row.failedAt?.toISOString() ?? null,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapStudioJobToDetail(row: StudioJob): StudioJobDetail {
  return {
    ...mapStudioJobToListItem(row),
    input: parseInputJson(row.inputJson),
    result: parseResultJson(row.resultJson),
  };
}
