import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import type { LanguageTextLayerSourceStats } from "@/lib/canonical-language-text-layers";
import {
  enrichLanguageTextLayersForRender,
  extractLanguageTextLayersWithStats,
  mergeLanguageTextLayerOverrides,
} from "@/lib/language-text-layers";
import { recoverLanguageTextLayersFromFinalVideo } from "@/server/instant-premium/recover-language-text-layers-from-video";
import { syncProjectLanguageTextLayers } from "@/server/instant-premium/persist-language-text-layers";
import { resolveInstantVideoDimensions } from "@/lib/locked-text-layer";
import { DEFAULT_TYPOGRAPHY_RENDER_QUALITY } from "@/lib/typography-style-profile";
import { getAnimationProjectByIdForViewer } from "@/server/animation-projects/queries";
import { isInstantLikeProject } from "@/server/instant-premium/instant-project-utils";
import { isInstantPremiumExportCompleted } from "@/lib/instant-premium-export-status";
import { LANGUAGE_EXPORT_NO_LAYERS } from "@/lib/language-export-prepare";
import { buildLanguageExportPreviews } from "@/lib/language-export-prepare";
import { translateLanguageTextLayers } from "@/lib/translate-language-text";
import {
  isLanguageExportCode,
  languageExportLabel,
  MAX_LANGUAGE_EXPORTS_PER_PROJECT,
  parseLanguageTextLayerJson,
  type LanguageExportAuditEvent,
  type LanguageExportCode,
  type LanguageTextLayerRecord,
} from "@/lib/video-language-export";
import { renderTypographyPreviewDataUrl } from "@/server/instant-premium/typography-svg-renderer";
import { downloadLanguageExportVideoToFile } from "@/server/instant-premium/language-export-io";
import { triggerWorkerLanguageExport } from "@/lib/video-worker-client";
import {
  assertVideoWorkerConfiguredForRender,
  shouldRunFfmpegLocally,
} from "@/lib/video-ffmpeg-runtime";
import type { InstantSceneText } from "@/lib/story-overlay-templates";
import {
  LANGUAGE_EXPORT_NO_CLEAN,
  prepareStorySceneTexts,
  projectUsesStoryOverlay,
  resolveCleanVideoUrlForOverlay,
  storySourceLanguageCode,
} from "@/lib/story-language-export";
import { parseSceneTextsJson } from "@/lib/translate-scene-texts";

export const LANGUAGE_EXPORT_IN_PROGRESS = "LANGUAGE_EXPORT_IN_PROGRESS";
export const LANGUAGE_EXPORT_LIMIT = "LANGUAGE_EXPORT_LIMIT";
export const LANGUAGE_EXPORT_NO_BASE = "LANGUAGE_EXPORT_NO_BASE";

export class LanguageExportPrepareError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "LanguageExportPrepareError";
    this.code = code;
  }
}

export async function listVideoLanguageExports(projectId: string) {
  return prisma.videoLanguageExport.findMany({
    where: { projectId },
    orderBy: [{ languageCode: "asc" }, { version: "desc" }],
  });
}

export async function markLanguageExportsNeedsRefresh(projectId: string): Promise<void> {
  await prisma.videoLanguageExport.updateMany({
    where: {
      projectId,
      status: "completed",
    },
    data: {
      status: "needs_refresh",
      updatedAt: new Date(),
    },
  });
}

export async function prepareLanguageTextLayers(params: {
  projectId: string;
  languageCode: LanguageExportCode;
  textLayerOverrides?: LanguageTextLayerRecord[];
}): Promise<{
  layers: LanguageTextLayerRecord[];
  translationProvider: string;
  typographyRenderQuality: typeof DEFAULT_TYPOGRAPHY_RENDER_QUALITY;
  translationFailed?: boolean;
  translationMessage?: string;
  layerSourceStats: LanguageTextLayerSourceStats;
}> {
  const project = await prisma.animationProject.findUnique({
    where: { id: params.projectId },
    include: {
      images: { orderBy: { order: "asc" } },
      exports: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!project || !isInstantLikeProject(project)) {
    throw new Error("Instant Premium project not found.");
  }

  const { merged, stats: layerSourceStats } = await resolveTranslatableLanguageTextLayers({
    project,
    textLayerOverrides: params.textLayerOverrides,
  });

  if (merged.length === 0) {
    throw new LanguageExportPrepareError(
      LANGUAGE_EXPORT_NO_LAYERS,
      "No translatable text layers found on this project."
    );
  }

  let translationProvider = "none";
  let translationFailed = false;
  let translationMessage: string | undefined;
  let layers: LanguageTextLayerRecord[];

  if (params.languageCode === "original") {
    layers = merged.map((l) => ({ ...l, translatedText: l.sourceText }));
  } else {
    const translated = await translateLanguageTextLayers({
      layers: merged,
      targetLanguage: params.languageCode,
    });
    layers = translated.layers;
    translationProvider = translated.provider;
    if (translated.translationFailed) {
      translationFailed = true;
      translationMessage =
        translated.translationError?.trim() ||
        "Automatic translation failed; edit text manually.";
    }
  }

  const enriched = enrichLanguageTextLayersForRender({
    layers,
    languageCode: params.languageCode,
    aspectRatio: project.aspectRatio,
    viduResolution: project.viduResolution,
    quality: DEFAULT_TYPOGRAPHY_RENDER_QUALITY,
  });

  const withPreviews = await attachTypographyPreviews({
    layers: enriched,
    languageCode: params.languageCode,
    aspectRatio: project.aspectRatio,
    viduResolution: project.viduResolution,
  });

  return {
    layers: withPreviews,
    translationProvider,
    typographyRenderQuality: DEFAULT_TYPOGRAPHY_RENDER_QUALITY,
    translationFailed: translationFailed || undefined,
    translationMessage,
    layerSourceStats,
  };
}

async function resolveTranslatableLanguageTextLayers(params: {
  project: {
    id: string;
    languageTextLayersJson: unknown;
    instantLockedTextLayers: unknown;
    instantDetectedTextMetadata: unknown;
    instantOutputDurationSeconds: number | null;
    stylePreset: string | null;
    aspectRatio: string | null;
    viduResolution: string | null;
    images: Array<{ bakedTextBlocksJson: unknown; order: number }>;
    exports: Array<{ outputVideoUrl: string | null; status: string }>;
  };
  textLayerOverrides?: LanguageTextLayerRecord[];
}): Promise<{ merged: LanguageTextLayerRecord[]; stats: LanguageTextLayerSourceStats }> {
  const extracted = extractLanguageTextLayersWithStats(params.project);
  let merged = mergeLanguageTextLayerOverrides(extracted.layers, params.textLayerOverrides);
  if (merged.length > 0) {
    return { merged, stats: extracted.stats };
  }

  const latestExport = params.project.exports[0];
  const finalUrl = latestExport?.outputVideoUrl?.trim() ?? "";
  if (!finalUrl) {
    return { merged: [], stats: extracted.stats };
  }

  if (!shouldRunFfmpegLocally()) {
    return { merged: [], stats: extracted.stats };
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `hc-lang-prepare-${params.project.id}-`));
  const videoPath = path.join(workDir, "final.mp4");
  try {
    await downloadLanguageExportVideoToFile(finalUrl, videoPath);
    const recovery = await recoverLanguageTextLayersFromFinalVideo({
      finalVideoPath: videoPath,
      stylePreset: params.project.stylePreset,
      durationSeconds: params.project.instantOutputDurationSeconds,
    });

    if (recovery.layers.length === 0) {
      console.warn("[language-export]", {
        projectId: params.project.id,
        phase: "ocr_recovery_empty",
        error: recovery.error ?? null,
      });
      return { merged: [], stats: extracted.stats };
    }

    await syncProjectLanguageTextLayers({
      projectId: params.project.id,
      recoverySource: "ocr_recovery",
      extraLayers: recovery.layers,
    });

    const refreshed = await prisma.animationProject.findUnique({
      where: { id: params.project.id },
      include: { images: { orderBy: { order: "asc" } } },
    });
    if (!refreshed) {
      return { merged: [], stats: extracted.stats };
    }

    const afterRecovery = extractLanguageTextLayersWithStats(refreshed);
    merged = mergeLanguageTextLayerOverrides(afterRecovery.layers, params.textLayerOverrides);
    return { merged, stats: afterRecovery.stats };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function attachTypographyPreviews(params: {
  layers: LanguageTextLayerRecord[];
  languageCode: string;
  aspectRatio: string | null;
  viduResolution: string | null;
}): Promise<LanguageTextLayerRecord[]> {
  const { width, height } = resolveInstantVideoDimensions(
    params.aspectRatio,
    params.viduResolution
  );
  const out: LanguageTextLayerRecord[] = [];
  for (const layer of params.layers) {
    if (!layer.fit || !layer.typography) {
      out.push(layer);
      continue;
    }
    try {
      const previewDataUrl = await renderTypographyPreviewDataUrl({
        layer,
        languageCode: params.languageCode,
        canvasWidth: width,
        canvasHeight: height,
        fit: layer.fit,
      });
      out.push({ ...layer, previewDataUrl });
    } catch {
      out.push(layer);
    }
  }
  return out;
}

async function queueLanguageExportRender(exportId: string, projectId: string): Promise<void> {
  if (shouldRunFfmpegLocally()) {
    const { executeLanguageExportRender } = await import(
      "@/server/instant-premium/language-export-render-execution"
    );
    void executeLanguageExportRender(exportId).catch((err) => {
      console.error("[language-export]", {
        exportId,
        projectId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  } else {
    assertVideoWorkerConfiguredForRender();
    triggerWorkerLanguageExport(exportId);
  }
}

function storyCompositionAudit(params: {
  sourceLanguage: LanguageExportCode;
  targetLanguage: LanguageExportCode;
  translationProvider: string;
  projectId: string;
  sourceCleanVideoUrl: string;
}): object {
  return {
    sourceLanguage: params.sourceLanguage,
    targetLanguage: params.targetLanguage,
    events: [
      {
        type: "language_composition",
        billingImpact: "none",
        aiCreditsUsed: 0,
        provider: params.translationProvider,
        languageCode: params.targetLanguage,
        projectId: params.projectId,
        sourceFinalVideoUrl: params.sourceCleanVideoUrl,
        recordedAt: new Date().toISOString(),
        status: "draft",
      },
    ],
  };
}

export async function createDraftStoryLanguageComposition(params: {
  projectId: string;
  viewer: { id: string; role: string };
  languageCode: LanguageExportCode;
  sceneTexts: InstantSceneText[];
  translationProvider: string;
  sourceLanguage?: LanguageExportCode;
  targetLanguage?: LanguageExportCode;
}): Promise<{ exportId: string }> {
  const projectRecord = await getAnimationProjectByIdForViewer(params.projectId, params.viewer);
  if (!projectRecord || !isInstantLikeProject(projectRecord)) {
    throw new Error("Instant Premium project not found.");
  }

  const project = await prisma.animationProject.findUnique({
    where: { id: params.projectId },
    include: {
      exports: { orderBy: { createdAt: "desc" }, take: 1 },
      languageExports: true,
    },
  });
  if (!project) {
    throw new Error("Instant Premium project not found.");
  }

  const latestExport = project.exports[0];
  const exportCompleted = isInstantPremiumExportCompleted(
    project.status,
    latestExport?.status
  );
  if (!exportCompleted) {
    throw new Error(LANGUAGE_EXPORT_NO_BASE);
  }

  const cleanUrl = resolveCleanVideoUrlForOverlay(project);
  if (!cleanUrl) {
    throw new Error(LANGUAGE_EXPORT_NO_CLEAN);
  }

  if (project.languageExports.length >= MAX_LANGUAGE_EXPORTS_PER_PROJECT) {
    throw new Error(LANGUAGE_EXPORT_LIMIT);
  }

  const active = project.languageExports.find(
    (row) =>
      row.languageCode === params.languageCode &&
      (row.status === "queued" || row.status === "rendering")
  );
  if (active) {
    throw new Error(LANGUAGE_EXPORT_IN_PROGRESS);
  }

  const existingDraft = project.languageExports.find(
    (row) => row.languageCode === params.languageCode && row.status === "draft"
  );
  if (existingDraft) {
    await prisma.videoLanguageExport.update({
      where: { id: existingDraft.id },
      data: {
        sceneTextsJson: params.sceneTexts as object,
        translationProvider: params.translationProvider,
        translationAuditJson: storyCompositionAudit({
          sourceLanguage: params.sourceLanguage ?? storySourceLanguageCode(),
          targetLanguage: params.targetLanguage ?? params.languageCode,
          translationProvider: params.translationProvider,
          projectId: params.projectId,
          sourceCleanVideoUrl: cleanUrl,
        }) as object,
        updatedAt: new Date(),
      },
    });
    return { exportId: existingDraft.id };
  }

  const maxVersion = project.languageExports
    .filter((r) => r.languageCode === params.languageCode)
    .reduce((max, r) => Math.max(max, r.version), 0);
  const version = maxVersion + 1;

  const row = await prisma.videoLanguageExport.create({
    data: {
      projectId: params.projectId,
      languageCode: params.languageCode,
      languageLabel: languageExportLabel(params.languageCode, "nl"),
      status: "draft",
      overlayRenderMode: "story_overlay",
      sourceCleanVideoUrl: cleanUrl,
      sourceFinalVideoUrl: cleanUrl,
      sceneTextsJson: params.sceneTexts as object,
      textLayerJson: [] as object,
      translationProvider: params.translationProvider,
      version,
      translationAuditJson: storyCompositionAudit({
        sourceLanguage: params.sourceLanguage ?? storySourceLanguageCode(),
        targetLanguage: params.targetLanguage ?? params.languageCode,
        translationProvider: params.translationProvider,
        projectId: params.projectId,
        sourceCleanVideoUrl: cleanUrl,
      }) as object,
    },
  });

  return { exportId: row.id };
}

export async function prepareLanguageExport(params: {
  projectId: string;
  languageCode: LanguageExportCode;
  textLayerOverrides?: LanguageTextLayerRecord[];
  sceneTextOverrides?: InstantSceneText[];
  viewer?: { id: string; role: string };
}) {
  const project = await prisma.animationProject.findUnique({
    where: { id: params.projectId },
    include: {
      images: { orderBy: { order: "asc" } },
      exports: { orderBy: { createdAt: "desc" }, take: 1 },
      languageExports: true,
    },
  });
  if (!project || !isInstantLikeProject(project)) {
    throw new Error("Instant Premium project not found.");
  }

  if (projectUsesStoryOverlay(project) || params.sceneTextOverrides?.length) {
    const existingDraft = project.languageExports.find(
      (row) => row.languageCode === params.languageCode && row.status === "draft"
    );
    if (existingDraft && !params.sceneTextOverrides?.length) {
      return {
        mode: "story_overlay" as const,
        exportId: existingDraft.id,
        sceneTexts: parseSceneTextsJson(existingDraft.sceneTextsJson),
        translationProvider: existingDraft.translationProvider ?? "user_reviewed",
        translationFailed: false,
        message: null,
        sourceLanguage: storySourceLanguageCode(),
        targetLanguage: params.languageCode,
      };
    }

    const prepared = await prepareStorySceneTexts({
      project,
      languageCode: params.languageCode,
      sceneTextOverrides: params.sceneTextOverrides,
    });

    let exportId: string | null = null;
    if (params.viewer && params.languageCode !== "original") {
      const draft = await createDraftStoryLanguageComposition({
        projectId: params.projectId,
        viewer: params.viewer,
        languageCode: params.languageCode,
        sceneTexts: prepared.sceneTexts,
        translationProvider: prepared.translationProvider,
        sourceLanguage: prepared.sourceLanguage,
        targetLanguage: prepared.targetLanguage,
      });
      exportId = draft.exportId;
    }

    return {
      mode: "story_overlay" as const,
      exportId,
      sceneTexts: prepared.sceneTexts,
      translationProvider: prepared.translationProvider,
      translationFailed: prepared.translationFailed,
      message: prepared.translationMessage ?? null,
      sourceLanguage: prepared.sourceLanguage,
      targetLanguage: prepared.targetLanguage,
    };
  }

  const prepared = await prepareLanguageTextLayers({
    projectId: params.projectId,
    languageCode: params.languageCode,
    textLayerOverrides: params.textLayerOverrides,
  });
  const layers = prepared.layers;
  const previews = buildLanguageExportPreviews(layers);
  return {
    mode: "typography" as const,
    layers,
    textLayers: layers,
    previews,
    layerCount: layers.length,
    translationProvider: prepared.translationProvider,
    typographyRenderQuality: prepared.typographyRenderQuality,
    translationFailed: prepared.translationFailed ?? false,
    message: prepared.translationMessage ?? null,
    layerSourceStats: prepared.layerSourceStats,
  };
}

export async function updateLanguageExportTexts(params: {
  exportId: string;
  viewer: { id: string; role: string };
  sceneTexts?: InstantSceneText[];
  textLayers?: LanguageTextLayerRecord[];
}): Promise<void> {
  const row = await prisma.videoLanguageExport.findUnique({
    where: { id: params.exportId },
    include: { project: true },
  });
  if (!row?.project) {
    throw new Error("Language export not found.");
  }
  const viewerProject = await getAnimationProjectByIdForViewer(row.projectId, params.viewer);
  if (!viewerProject) {
    throw new Error("Language export not found.");
  }

  if (row.overlayRenderMode === "story_overlay") {
    if (!params.sceneTexts?.length) {
      throw new Error("sceneTexts required for story overlay version.");
    }
    await prisma.videoLanguageExport.update({
      where: { id: params.exportId },
      data: {
        sceneTextsJson: params.sceneTexts as object,
        status: "needs_refresh",
        updatedAt: new Date(),
      },
    });
    return;
  }

  if (!params.textLayers?.length) {
    throw new Error("textLayers required for typography version.");
  }
  const renderLayers = enrichLanguageTextLayersForRender({
    layers: params.textLayers,
    languageCode: row.languageCode as LanguageExportCode,
    aspectRatio: row.project.aspectRatio,
    viduResolution: row.project.viduResolution,
  });
  await prisma.videoLanguageExport.update({
    where: { id: params.exportId },
    data: {
      textLayerJson: renderLayers as object,
      status: "needs_refresh",
      updatedAt: new Date(),
    },
  });
}

export async function rerenderLanguageExport(params: {
  exportId: string;
  viewer: { id: string; role: string };
}): Promise<{ exportId: string }> {
  const row = await prisma.videoLanguageExport.findUnique({
    where: { id: params.exportId },
    include: { project: { include: { languageExports: true } } },
  });
  if (!row?.project) {
    throw new Error("Language export not found.");
  }
  await getAnimationProjectByIdForViewer(row.projectId, params.viewer);

  if (row.status === "rendering" || row.status === "queued") {
    throw new Error(LANGUAGE_EXPORT_IN_PROGRESS);
  }

  if (row.status === "completed") {
    const sceneTexts =
      row.overlayRenderMode === "story_overlay" && row.sceneTextsJson ?
        parseSceneTextsJson(row.sceneTextsJson)
      : undefined;
    const textLayers =
      row.textLayerJson ?
        parseLanguageTextLayerJson(row.textLayerJson as LanguageTextLayerRecord[])
      : undefined;
    return createAndRenderLanguageExport({
      projectId: row.projectId,
      viewer: params.viewer,
      languageCode: row.languageCode,
      textLayerOverrides: textLayers,
      sceneTextOverrides: sceneTexts,
    });
  }

  await prisma.videoLanguageExport.update({
    where: { id: params.exportId },
    data: { status: "queued", errorMessage: null, updatedAt: new Date() },
  });
  await queueLanguageExportRender(params.exportId, row.projectId);
  return { exportId: params.exportId };
}

export async function createAndRenderLanguageExport(params: {
  projectId: string;
  viewer: { id: string; role: string };
  languageCode: string;
  textLayerOverrides?: LanguageTextLayerRecord[];
  sceneTextOverrides?: InstantSceneText[];
  exportId?: string;
  versionNote?: string;
}): Promise<{ exportId: string }> {
  if (!isLanguageExportCode(params.languageCode)) {
    throw new Error("Unsupported language code.");
  }
  const languageCode = params.languageCode;

  const projectRecord = await getAnimationProjectByIdForViewer(
    params.projectId,
    params.viewer
  );
  if (!projectRecord || !isInstantLikeProject(projectRecord)) {
    throw new Error("Instant Premium project not found.");
  }

  const project = await prisma.animationProject.findUnique({
    where: { id: params.projectId },
    include: {
      images: { orderBy: { order: "asc" } },
      exports: { orderBy: { createdAt: "desc" }, take: 1 },
      languageExports: true,
    },
  });
  if (!project) {
    throw new Error("Instant Premium project not found.");
  }

  const latestExport = project.exports[0];
  const sourceFinalVideoUrl = latestExport?.outputVideoUrl?.trim() ?? "";
  const exportCompleted = isInstantPremiumExportCompleted(
    project.status,
    latestExport?.status
  );
  if (!exportCompleted || !sourceFinalVideoUrl) {
    throw new Error(LANGUAGE_EXPORT_NO_BASE);
  }

  if (project.languageExports.length >= MAX_LANGUAGE_EXPORTS_PER_PROJECT) {
    throw new Error(LANGUAGE_EXPORT_LIMIT);
  }

  const active = project.languageExports.find(
    (row) =>
      row.languageCode === languageCode &&
      (row.status === "queued" || row.status === "rendering")
  );
  if (active) {
    throw new Error(LANGUAGE_EXPORT_IN_PROGRESS);
  }

  const maxVersion = project.languageExports
    .filter((r) => r.languageCode === languageCode)
    .reduce((max, r) => Math.max(max, r.version), 0);
  const version = maxVersion + 1;
  const versionNote = params.versionNote?.trim() || null;

  const useStoryOverlay =
    projectUsesStoryOverlay(project) || (params.sceneTextOverrides?.length ?? 0) > 0;

  if (useStoryOverlay) {
    const cleanUrl = resolveCleanVideoUrlForOverlay(project);
    if (!cleanUrl) {
      throw new Error(LANGUAGE_EXPORT_NO_CLEAN);
    }

    const draftExportId = params.exportId?.trim();
    const draftRow =
      draftExportId ?
        project.languageExports.find((row) => row.id === draftExportId)
      : project.languageExports.find(
          (row) => row.languageCode === languageCode && row.status === "draft"
        );

    const prepared = await prepareStorySceneTexts({
      project,
      languageCode,
      sceneTextOverrides: params.sceneTextOverrides,
      skipTranslation: Boolean(params.sceneTextOverrides?.length),
    });

    if (draftRow?.status === "draft") {
      await prisma.videoLanguageExport.update({
        where: { id: draftRow.id },
        data: {
          sceneTextsJson: prepared.sceneTexts as object,
          translationProvider: prepared.translationProvider,
          status: "queued",
          errorMessage: null,
          translationAuditJson: {
            sourceLanguage: storySourceLanguageCode(),
            targetLanguage: languageCode,
            events: [
              {
                type: "language_export",
                billingImpact: "none",
                aiCreditsUsed: 0,
                provider: "internal_text_overlay",
                languageCode,
                projectId: params.projectId,
                sourceFinalVideoUrl: cleanUrl,
                recordedAt: new Date().toISOString(),
                status: "started",
              } satisfies LanguageExportAuditEvent,
            ],
          } as object,
          updatedAt: new Date(),
        },
      });
      await queueLanguageExportRender(draftRow.id, params.projectId);
      return { exportId: draftRow.id };
    }

    const row = await prisma.videoLanguageExport.create({
      data: {
        projectId: params.projectId,
        languageCode,
        languageLabel: languageExportLabel(languageCode, "nl"),
        status: "queued",
        overlayRenderMode: "story_overlay",
        sourceCleanVideoUrl: cleanUrl,
        sourceFinalVideoUrl: cleanUrl,
        sceneTextsJson: prepared.sceneTexts as object,
        textLayerJson: [] as object,
        translationProvider: prepared.translationProvider,
        version,
        versionNote,
        translationAuditJson: {
          sourceLanguage: storySourceLanguageCode(),
          targetLanguage: languageCode,
          events: [
            {
              type: "language_export",
              billingImpact: "none",
              aiCreditsUsed: 0,
              provider: "internal_text_overlay",
              languageCode,
              projectId: params.projectId,
              sourceFinalVideoUrl: cleanUrl,
              recordedAt: new Date().toISOString(),
              status: "started",
            } satisfies LanguageExportAuditEvent,
          ],
        } as object,
      },
    });
    await queueLanguageExportRender(row.id, params.projectId);
    return { exportId: row.id };
  }

  const prepared = await prepareLanguageTextLayers({
    projectId: params.projectId,
    languageCode,
    textLayerOverrides: params.textLayerOverrides,
  });
  const renderLayers = enrichLanguageTextLayersForRender({
    layers: prepared.layers,
    languageCode,
    aspectRatio: project.aspectRatio,
    viduResolution: project.viduResolution,
  });

  const row = await prisma.videoLanguageExport.create({
    data: {
      projectId: params.projectId,
      languageCode,
      languageLabel: languageExportLabel(languageCode, "nl"),
      status: "queued",
      sourceFinalVideoUrl,
      textLayerJson: renderLayers as object,
      translationProvider: prepared.translationProvider,
      version,
      versionNote,
      translationAuditJson: {
        events: [
          {
            type: "language_export",
            billingImpact: "none",
            aiCreditsUsed: 0,
            provider: "internal_text_overlay",
            languageCode,
            projectId: params.projectId,
            sourceFinalVideoUrl,
            recordedAt: new Date().toISOString(),
            status: "started",
          } satisfies LanguageExportAuditEvent,
        ],
      } as object,
    },
  });

  await queueLanguageExportRender(row.id, params.projectId);

  return { exportId: row.id };
}
