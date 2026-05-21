/**
 * FFmpeg language export render — worker or local dev only (not Vercel serverless).
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { enrichLanguageTextLayersForRender } from "@/lib/language-text-layers";
import { DEFAULT_TYPOGRAPHY_RENDER_QUALITY } from "@/lib/typography-style-profile";
import {
  languageFinalBlobPathname,
  parseLanguageTextLayerJson,
  type LanguageExportAuditEvent,
} from "@/lib/video-language-export";
import {
  resolveFfmpegBinaries,
  VideoToolsMissingError,
} from "@/lib/ffmpeg/resolve-app-ffmpeg";
import { applyTypographyPreservedOverlay } from "@/server/instant-premium/typography-compositor";
import { probeVideoSegment } from "@/server/instant-premium/segment-transition";
import { uploadPublicBlob } from "@/lib/vercel-blob-config";
import { downloadLanguageExportVideoToFile } from "@/server/instant-premium/language-export-io";

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
    await resolveFfmpegBinaries();
    const sourcePath = path.join(workDir, "source.mp4");
    const outputPath = path.join(workDir, "output.mp4");
    await downloadLanguageExportVideoToFile(row.sourceFinalVideoUrl, sourcePath);

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
    const message =
      error instanceof VideoToolsMissingError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Language export render failed.";
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
