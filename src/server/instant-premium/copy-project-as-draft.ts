import { prisma } from "@/lib/prisma";
import { appendBundleAuditEntry } from "@/lib/bundle-audit";
import { languageCodeToLabel } from "@/lib/draft-lineage";
import {
  COPY_SOURCE_NOT_FOUND,
  type CopyAsDraftRequest,
  isCopyAsDraftSourceReady,
  resolveCopyAsDraftSource,
} from "@/lib/resolve-copy-as-draft-source";
import { getAnimationProjectById } from "@/server/animation-projects/queries";
import { isInstantLikeProject } from "@/server/instant-premium/instant-project-utils";
import {
  ensureFullRerenderDraftForProject,
  type FullRerenderDraftProject,
} from "@/server/instant-premium/full-rerender-draft-service";

export const COPY_AS_DRAFT_WRONG_TYPE = "COPY_AS_DRAFT_WRONG_TYPE";
export const COPY_AS_DRAFT_NOT_READY = "COPY_AS_DRAFT_NOT_READY";
export const COPY_AS_DRAFT_FORBIDDEN = "COPY_AS_DRAFT_FORBIDDEN";

export type CopyProjectAsDraftResult =
  | {
      ok: true;
      draftProjectId: string;
      sourceProjectId: string;
      editVersionPath: string;
    }
  | { ok: false; code: string; message: string };

function buildDraftCopyTitle(source: {
  title: string | null;
  userPrompt: string | null;
  instantUserIntent: string | null;
}): string {
  const base =
    source.title?.trim() ||
    source.userPrompt?.trim()?.slice(0, 72) ||
    source.instantUserIntent?.trim()?.slice(0, 72) ||
    "Motion";
  return `${base} — kopie`;
}

function projectRowToDraftEnsureShape(
  project: NonNullable<Awaited<ReturnType<typeof getAnimationProjectById>>>
): FullRerenderDraftProject {
  return {
    id: project.id,
    instantSceneTexts: project.instantSceneTexts,
    instantUserIntent: project.instantUserIntent,
    instantTransitionSeconds: project.instantTransitionSeconds,
    instantMode: project.instantMode,
    images: project.images.map((img) => ({
      id: img.id,
      previewUrl: img.previewUrl,
      viduInputUrl: img.viduInputUrl,
      fileName: img.fileName,
    })),
  };
}

/**
 * Creates a new draft AnimationProject copied from a completed instant project.
 * The source project is never mutated (no export clear, no generating status).
 */
export async function copyInstantPremiumProjectAsDraft(params: {
  sourceProjectId: string;
  userId: string;
  isAdmin?: boolean;
} & CopyAsDraftRequest): Promise<CopyProjectAsDraftResult> {
  const source = await getAnimationProjectById(params.sourceProjectId);
  if (!source) {
    return { ok: false, code: COPY_AS_DRAFT_FORBIDDEN, message: "Project not found." };
  }

  if (!params.isAdmin && source.ownerId !== params.userId) {
    return { ok: false, code: COPY_AS_DRAFT_FORBIDDEN, message: "Project not found." };
  }

  if (!isInstantLikeProject(source)) {
    return {
      ok: false,
      code: COPY_AS_DRAFT_WRONG_TYPE,
      message: "Only Motion instant projects can be copied as a concept.",
    };
  }

  if (source.status === "draft") {
    return {
      ok: false,
      code: COPY_AS_DRAFT_NOT_READY,
      message: "This project is already a concept draft.",
    };
  }

  const resolved = resolveCopyAsDraftSource(source, params);
  if (!resolved || !isCopyAsDraftSourceReady({ project: source, resolved })) {
    return {
      ok: false,
      code: COPY_SOURCE_NOT_FOUND,
      message: "Selected version could not be copied.",
    };
  }

  const overrides = resolved.overrides;
  const title = buildDraftCopyTitle({
    title: source.title,
    userPrompt: overrides.userPrompt ?? source.userPrompt,
    instantUserIntent: overrides.instantUserIntent ?? source.instantUserIntent,
  });
  const sourceLanguage = resolved.sourceLanguage;
  const sourceVersion = resolved.sourceVersion;
  const copiedAt = new Date();

  const draftProjectId = await prisma.$transaction(async (tx) => {
    const draft = await tx.animationProject.create({
      data: {
        ownerId: source.ownerId,
        title,
        status: "draft",
        sourceProjectId: source.id,
        sourceLanguage,
        sourceVersion,
        draftCopiedAt: copiedAt,
        bundleName: source.bundleName,
        bundleKey: source.bundleKey,
        bundleAuditJson: appendBundleAuditEntry(null, {
          type: "draft_created",
          userId: params.userId,
          before: null,
          after: `${languageCodeToLabel(sourceLanguage)} v${sourceVersion}`,
          meta: {
            sourceProjectId: source.id,
            draftFrom: "copy_as_draft",
            renderVersionId: resolved.renderVersion?.id ?? null,
            languageExportId: resolved.languageExport?.id ?? null,
          },
        }) as object,
        projectType: source.projectType,
        instantMode: overrides.instantMode ?? source.instantMode,
        instantTransitionSeconds:
          overrides.instantTransitionSeconds ?? source.instantTransitionSeconds,
        instantSceneTexts:
          overrides.instantSceneTexts ?? source.instantSceneTexts ?? undefined,
        instantSelectedChips:
          overrides.instantSelectedChips ?? source.instantSelectedChips ?? undefined,
        instantUserIntent: overrides.instantUserIntent ?? source.instantUserIntent,
        instantLockedTextLayers: source.instantLockedTextLayers ?? undefined,
        languageTextLayersJson:
          overrides.languageTextLayersJson ?? source.languageTextLayersJson ?? undefined,
        instantLockedTextMode:
          overrides.instantLockedTextMode ?? source.instantLockedTextMode,
        instantTextRenderMode:
          overrides.instantTextRenderMode ?? source.instantTextRenderMode,
        instantHybridOverlayStyle:
          overrides.instantHybridOverlayStyle ?? source.instantHybridOverlayStyle,
        instantPosterMotionSettings: source.instantPosterMotionSettings ?? undefined,
        instantDetectedTextMetadata: source.instantDetectedTextMetadata ?? undefined,
        instantOutputDurationSeconds:
          overrides.instantOutputDurationSeconds ?? source.instantOutputDurationSeconds,
        instantStoryboardDurationSeconds:
          overrides.instantStoryboardDurationSeconds ??
          source.instantStoryboardDurationSeconds,
        stylePreset: overrides.stylePreset ?? source.stylePreset,
        aspectRatio: overrides.aspectRatio ?? source.aspectRatio,
        presetId: overrides.presetId ?? source.presetId,
        viduModel: source.viduModel,
        viduResolution: source.viduResolution,
        viduDurationSeconds: source.viduDurationSeconds,
        estimatedCredits: source.estimatedCredits,
        advancedSettingsEnabled: source.advancedSettingsEnabled,
        userPrompt: overrides.userPrompt ?? source.userPrompt,
        intent: overrides.intent ?? source.intent,
        globalPromptContext: overrides.globalPromptContext ?? source.globalPromptContext,
        studioHandoffJson: source.studioHandoffJson ?? undefined,
        studioIntelligenceJson: source.studioIntelligenceJson ?? undefined,
        studioSourceStoryboardId: source.studioSourceStoryboardId ?? undefined,
        studioSourceStoryboardTitle: source.studioSourceStoryboardTitle ?? undefined,
        studioHandoffVersion: source.studioHandoffVersion ?? undefined,
        studioImportedAt: source.studioImportedAt ?? undefined,
        studioIntelligenceStatus: source.studioIntelligenceStatus ?? undefined,
        studioRefreshedAt: source.studioRefreshedAt ?? undefined,
        studioRefreshAuditJson: source.studioRefreshAuditJson ?? undefined,
        studioLastStaleReason: source.studioLastStaleReason ?? undefined,
      },
    });

    const orderedImages = [...source.images].sort((a, b) => a.order - b.order);
    for (const image of orderedImages) {
      await tx.animationImage.create({
        data: {
          projectId: draft.id,
          order: image.order,
          fileName: image.fileName,
          mimeType: image.mimeType,
          sizeBytes: image.sizeBytes,
          storageKey: image.storageKey,
          previewUrl: image.previewUrl,
          hasBakedText: image.hasBakedText,
          bakedTextProtectionStatus: image.bakedTextProtectionStatus,
          bakedTextExactCopy: image.bakedTextExactCopy,
          bakedTextMaskRegion: image.bakedTextMaskRegion ?? undefined,
          bakedTextBlocksJson: image.bakedTextBlocksJson ?? undefined,
          viduInputUrl: image.viduInputUrl,
          instantTextPatches: image.instantTextPatches ?? undefined,
          posterMotionLayersJson: image.posterMotionLayersJson ?? undefined,
          studioSceneId: image.studioSceneId,
          studioSceneImageId: image.studioSceneImageId,
        },
      });
    }

    return draft.id;
  });

  const draftProject = await getAnimationProjectById(draftProjectId);
  if (!draftProject) {
    return {
      ok: false,
      code: COPY_AS_DRAFT_NOT_READY,
      message: "Draft project could not be loaded after copy.",
    };
  }

  await ensureFullRerenderDraftForProject(projectRowToDraftEnsureShape(draftProject));

  return {
    ok: true,
    draftProjectId,
    sourceProjectId: source.id,
    editVersionPath: `/videos/${encodeURIComponent(draftProjectId)}/edit-version`,
  };
}
