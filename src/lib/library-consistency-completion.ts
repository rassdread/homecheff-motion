import { ensureCompletedGenerationInLibrary } from "@/server/studio/library-consistency-service";
import type {
  LibraryConsistencyRecord,
  LibraryFusionMetadata,
  LibraryMotionMetadata,
  LibraryPublishMetadata,
} from "@/types/library-consistency";
import type { MotionActionPresetMetadata } from "@/types/motion-action-presets";
import { parsePosterMotionSettings } from "@/lib/poster-motion-preserve";

export type RegisterMotionOutputInput = {
  ownerId: string;
  createdBy: string;
  projectId: string;
  projectTitle?: string | null;
  exportId: string;
  finalVideoUrl: string;
  storageKey: string;
  thumbnailUrl?: string | null;
  storyboardId?: string | null;
  durationSec?: number | null;
  renderVersion?: string | null;
  hcProjectId?: string | null;
  actionPreset?: MotionActionPresetMetadata | null;
};

export function extractActionPresetFromPosterSettings(
  raw: unknown
): MotionActionPresetMetadata | null {
  const settings = parsePosterMotionSettings(raw);
  return settings.hcActionPreset ?? null;
}

export async function registerMotionOutputInLibrary(
  input: RegisterMotionOutputInput
): Promise<LibraryConsistencyRecord> {
  const motionMetadata: LibraryMotionMetadata = {
    storyboardId: input.storyboardId ?? null,
    durationSec: input.durationSec ?? null,
    previewUrl: input.thumbnailUrl ?? input.finalVideoUrl,
    finalVideoUrl: input.finalVideoUrl,
    renderVersion: input.renderVersion ?? "1",
    exportId: input.exportId,
    actionPresetId: input.actionPreset?.actionPresetId ?? null,
    actionPresetCategory: input.actionPreset?.actionPresetCategory ?? null,
    actionPresetTitle: input.actionPreset?.actionPresetTitle ?? null,
    promptTemplate: input.actionPreset?.promptTemplate ?? null,
    feasibilityNote: input.actionPreset?.feasibilityNote ?? null,
    requirementAnalyzedAt: input.actionPreset?.requirementMetadata?.analyzedAt ?? null,
    requirementAvailableCount: input.actionPreset?.requirementMetadata?.availableCount ?? null,
    requirementMissingCount: input.actionPreset?.requirementMetadata?.missingCount ?? null,
    requirementPlanStepIds: input.actionPreset?.requirementMetadata?.planStepIds ?? null,
  };

  return ensureCompletedGenerationInLibrary({
    ownerId: input.ownerId,
    createdBy: input.createdBy,
    generationType: "motion_output",
    assetUrl: input.finalVideoUrl,
    storageKey: input.storageKey,
    thumbnailUrl: input.thumbnailUrl ?? input.finalVideoUrl,
    assetName: input.projectTitle?.trim() || `Motion video ${input.projectId.slice(0, 8)}`,
    promptSummary: `Motion render export ${input.exportId}`,
    projectId: input.hcProjectId ?? input.projectId,
    projectTitle: input.projectTitle ?? null,
    sourceModule: "motion",
    backingId: input.exportId,
    mimeType: "video/mp4",
    assetType: "motion_video",
    workflow: "motion_render",
    storyboardId: input.storyboardId ?? null,
    motionMetadata,
    usedInModules: ["motion", "studio"],
  });
}

export type RegisterPublishExportInput = {
  ownerId: string;
  createdBy: string;
  projectId: string;
  projectTitle?: string | null;
  exportUrl: string;
  storageKey: string;
  thumbnailUrl?: string | null;
  publishProfile?: string | null;
  format?: string;
  durationSec?: number | null;
};

export async function registerPublishExportInLibrary(
  input: RegisterPublishExportInput
): Promise<LibraryConsistencyRecord> {
  const publishMetadata: LibraryPublishMetadata = {
    publishProfile: input.publishProfile ?? null,
    format: input.format ?? "mp4",
    durationSec: input.durationSec ?? null,
    exportUrl: input.exportUrl,
  };

  return ensureCompletedGenerationInLibrary({
    ownerId: input.ownerId,
    createdBy: input.createdBy,
    generationType: "publish_export",
    assetUrl: input.exportUrl,
    storageKey: input.storageKey,
    thumbnailUrl: input.thumbnailUrl ?? null,
    assetName: input.projectTitle?.trim() || `Publish export ${input.projectId.slice(0, 8)}`,
    promptSummary: `Publish export ${input.format ?? "mp4"}`,
    projectId: input.projectId,
    projectTitle: input.projectTitle ?? null,
    sourceModule: "publish",
    backingId: input.storageKey.split("/").pop()?.replace(/\.\w+$/, "") ?? input.projectId,
    mimeType: "video/mp4",
    assetType: "publish_export",
    workflow: "publish_export",
    publishMetadata,
    usedInModules: ["publish", "studio"],
  });
}

export type RegisterFusionVariantInput = {
  ownerId: string;
  createdBy: string;
  assetUrl: string;
  storageKey: string;
  thumbnailUrl?: string | null;
  assetName?: string | null;
  promptSummary?: string | null;
  projectId?: string | null;
  projectTitle?: string | null;
  fusionMetadata?: LibraryFusionMetadata | null;
};

export function buildFusionLibraryFields(metadata?: LibraryFusionMetadata | null): {
  fusionIntent: string | null;
  fusionArchetype: string | null;
  fusionMetadata: LibraryFusionMetadata | null;
  workflow: string;
} {
  return {
    fusionIntent: metadata?.fusionIntent ?? null,
    fusionArchetype: metadata?.fusionArchetype ?? null,
    fusionMetadata: metadata ?? null,
    workflow: "fusion",
  };
}

export async function registerFusionVariantInLibrary(
  input: RegisterFusionVariantInput
): Promise<LibraryConsistencyRecord> {
  const fusion = buildFusionLibraryFields(input.fusionMetadata);
  return ensureCompletedGenerationInLibrary({
    ownerId: input.ownerId,
    createdBy: input.createdBy,
    generationType: "editor_variant",
    assetUrl: input.assetUrl,
    storageKey: input.storageKey,
    thumbnailUrl: input.thumbnailUrl ?? input.assetUrl,
    assetName: input.assetName ?? "Fusion variant",
    promptSummary: input.promptSummary ?? null,
    projectId: input.projectId ?? null,
    projectTitle: input.projectTitle ?? null,
    sourceModule: "editor",
    backingId: input.storageKey.split("/").pop()?.replace(/\.png$/i, "") ?? undefined,
    assetType: "fusion_output",
    workflow: fusion.workflow,
    fusionIntent: fusion.fusionIntent,
    fusionArchetype: fusion.fusionArchetype,
    fusionMetadata: fusion.fusionMetadata,
    usedInModules: ["editor", "studio"],
  });
}

export function resolveMotionExportStorageKey(projectId: string, outputVideoUrl: string): string {
  const trimmed = outputVideoUrl.trim();
  if (trimmed.startsWith("/generated/")) {
    return trimmed.slice(1);
  }
  try {
    const parsed = new URL(trimmed, "https://homecheff.local");
    const pathname = parsed.pathname.replace(/^\//, "");
    if (pathname) {
      return pathname;
    }
  } catch {
    // fall through
  }
  return `generated/animations/projects/${projectId}/final.mp4`;
}

export type MotionExportProjectSnapshot = {
  id: string;
  ownerId: string;
  title?: string | null;
  studioSourceStoryboardId?: string | null;
  instantOutputDurationSeconds?: number | null;
  viduDurationSeconds?: number | null;
  instantPosterMotionSettings?: unknown;
};

export async function syncCompletedMotionExportToLibrary(input: {
  project: MotionExportProjectSnapshot;
  exportId: string;
  outputVideoUrl: string;
  renderVersion?: string | null;
  hcProjectId?: string | null;
}): Promise<LibraryConsistencyRecord | null> {
  const finalVideoUrl = input.outputVideoUrl.trim();
  if (!finalVideoUrl) {
    return null;
  }
  const storageKey = resolveMotionExportStorageKey(input.project.id, finalVideoUrl);
  const durationSec =
    input.project.instantOutputDurationSeconds ?? input.project.viduDurationSeconds ?? null;
  const actionPreset = extractActionPresetFromPosterSettings(
    input.project.instantPosterMotionSettings
  );

  return registerMotionOutputInLibrary({
    ownerId: input.project.ownerId,
    createdBy: input.project.ownerId,
    projectId: input.project.id,
    projectTitle: input.project.title ?? null,
    exportId: input.exportId,
    finalVideoUrl,
    storageKey,
    thumbnailUrl: finalVideoUrl,
    storyboardId: input.project.studioSourceStoryboardId ?? null,
    durationSec,
    renderVersion: input.renderVersion ?? "1",
    hcProjectId: input.hcProjectId ?? input.project.id,
    actionPreset,
  });
}
