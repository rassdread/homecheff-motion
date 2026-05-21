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
import { translateLanguageTextLayers } from "@/lib/translate-language-text";
import {
  isLanguageExportCode,
  languageExportLabel,
  MAX_LANGUAGE_EXPORTS_PER_PROJECT,
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

export async function createAndRenderLanguageExport(params: {
  projectId: string;
  viewer: { id: string; role: string };
  languageCode: string;
  textLayerOverrides?: LanguageTextLayerRecord[];
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

  if (shouldRunFfmpegLocally()) {
    const { executeLanguageExportRender } = await import(
      "@/server/instant-premium/language-export-render-execution"
    );
    void executeLanguageExportRender(row.id).catch((err) => {
      console.error("[language-export]", {
        exportId: row.id,
        projectId: params.projectId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  } else {
    assertVideoWorkerConfiguredForRender();
    triggerWorkerLanguageExport(row.id);
  }

  return { exportId: row.id };
}
