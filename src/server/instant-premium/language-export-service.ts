import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import {
  enrichLanguageTextLayersForRender,
  extractLanguageTextLayersFromProject,
  mergeLanguageTextLayerOverrides,
} from "@/lib/language-text-layers";
import { resolveInstantVideoDimensions } from "@/lib/locked-text-layer";
import { DEFAULT_TYPOGRAPHY_RENDER_QUALITY } from "@/lib/typography-style-profile";
import { getAnimationProjectByIdForViewer } from "@/server/animation-projects/queries";
import { isInstantLikeProject } from "@/server/instant-premium/instant-project-utils";
import { isInstantPremiumExportCompleted } from "@/lib/instant-premium-export-status";
import { translateLanguageTextLayers } from "@/lib/translate-language-text";
import {
  isLanguageExportCode,
  languageExportLabel,
  languageFinalBlobPathname,
  MAX_LANGUAGE_EXPORTS_PER_PROJECT,
  parseLanguageTextLayerJson,
  type LanguageExportAuditEvent,
  type LanguageExportCode,
  type LanguageTextLayerRecord,
} from "@/lib/video-language-export";
import { applyTypographyPreservedOverlay } from "@/server/instant-premium/typography-compositor";
import { renderTypographyPreviewDataUrl } from "@/server/instant-premium/typography-svg-renderer";
import { probeVideoSegment } from "@/server/instant-premium/segment-transition";
import { uploadPublicBlob } from "@/lib/vercel-blob-config";

export const LANGUAGE_EXPORT_IN_PROGRESS = "LANGUAGE_EXPORT_IN_PROGRESS";
export const LANGUAGE_EXPORT_LIMIT = "LANGUAGE_EXPORT_LIMIT";
export const LANGUAGE_EXPORT_NO_BASE = "LANGUAGE_EXPORT_NO_BASE";

function absolutePublicPath(...segments: string[]): string {
  return path.join(process.cwd(), "public", ...segments);
}

async function downloadVideoToFile(url: string, dest: string): Promise<void> {
  const trimmed = url.trim();
  if (trimmed.startsWith("/")) {
    const relative = trimmed.replace(/^\/+/, "");
    const abs = absolutePublicPath(...relative.split("/"));
    await fs.copyFile(abs, dest);
    return;
  }
  const res = await fetch(trimmed, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) {
    throw new Error(`Could not download source video (${res.status}).`);
  }
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
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

  const base = extractLanguageTextLayersFromProject(project);
  const merged = mergeLanguageTextLayerOverrides(base, params.textLayerOverrides);

  let translationProvider = "none";
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
  };
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

  void executeLanguageExportRender(row.id).catch((err) => {
    console.error("[language-export]", {
      exportId: row.id,
      projectId: params.projectId,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  return { exportId: row.id };
}

export async function executeLanguageExportRender(exportId: string): Promise<void> {
  const row = await prisma.videoLanguageExport.findUnique({
    where: { id: exportId },
    include: {
      project: {
        include: { exports: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
    },
  });
  if (!row?.project) {
    return;
  }

  await prisma.videoLanguageExport.update({
    where: { id: exportId },
    data: { status: "rendering", updatedAt: new Date() },
  });

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `hc-lang-export-${exportId}-`));
  try {
    const sourcePath = path.join(workDir, "source.mp4");
    const outputPath = path.join(workDir, "output.mp4");
    await downloadVideoToFile(row.sourceFinalVideoUrl, sourcePath);

    const layers = parseLanguageTextLayerJson(row.textLayerJson);
    const probed = await probeVideoSegment(sourcePath);
    const totalDurationMs = Math.max(
      1000,
      Math.round((probed?.durationSec ?? row.project.instantOutputDurationSeconds ?? 8) * 1000)
    );
    const enriched = enrichLanguageTextLayersForRender({
      layers,
      languageCode: row.languageCode,
      aspectRatio: row.project.aspectRatio,
      viduResolution: row.project.viduResolution,
    });

    const compositor = await applyTypographyPreservedOverlay({
      inputVideoPath: sourcePath,
      outputVideoPath: outputPath,
      layers: enriched,
      languageCode: row.languageCode,
      aspectRatio: row.project.aspectRatio,
      viduResolution: row.project.viduResolution,
      totalDurationMs,
      typographyRenderQuality: DEFAULT_TYPOGRAPHY_RENDER_QUALITY,
    });

    const blobPath = languageFinalBlobPathname(
      row.projectId,
      row.languageCode,
      row.version
    );
    const buffer = await fs.readFile(outputPath);
    const { url } = await uploadPublicBlob({
      pathname: blobPath,
      body: buffer,
      contentType: "video/mp4",
      addRandomSuffix: false,
      context: {
        projectId: row.projectId,
        uploadTarget: blobPath,
        provider: "language_export",
      },
    });

    const audit = (row.translationAuditJson as { events?: LanguageExportAuditEvent[] }) ?? {
      events: [],
    };
    const completedEvent: LanguageExportAuditEvent = {
      type: "language_export",
      billingImpact: "none",
      aiCreditsUsed: 0,
      provider: "internal_text_overlay",
      languageCode: row.languageCode,
      projectId: row.projectId,
      sourceFinalVideoUrl: row.sourceFinalVideoUrl,
      outputVideoUrl: url,
      recordedAt: new Date().toISOString(),
      status: "completed",
    };

    await prisma.videoLanguageExport.update({
      where: { id: exportId },
      data: {
        status: "completed",
        outputVideoUrl: url,
        completedAt: new Date(),
        errorMessage: null,
        translationAuditJson: {
          events: [...(audit.events ?? []), completedEvent],
        } as object,
      },
    });

    console.info("[language-export]", {
      phase: "completed",
      exportId,
      projectId: row.projectId,
      languageCode: row.languageCode,
      outputVideoUrl: url,
      layerCount: layers.length,
      compositorMethod: compositor.method,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Language export render failed.";
    await prisma.videoLanguageExport.update({
      where: { id: exportId },
      data: {
        status: "failed",
        errorMessage: message,
        updatedAt: new Date(),
      },
    });
    throw error;
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
