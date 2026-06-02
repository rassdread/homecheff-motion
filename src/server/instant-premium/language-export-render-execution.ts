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
import { applyStorySceneTextOverlay } from "@/server/animation-export/story-text-overlay";
import { parseInstantSceneTexts } from "@/lib/story-overlay-templates";
import { resolveInstantVideoDimensions } from "@/lib/locked-text-layer";

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
    const sourceUrl =
      row.sourceCleanVideoUrl?.trim() ||
      row.sourceFinalVideoUrl?.trim() ||
      "";
    const sourcePath = path.join(workDir, "source.mp4");
    const outputPath = path.join(workDir, "output.mp4");
    await downloadLanguageExportVideoToFile(sourceUrl, sourcePath);

    const probed = await probeVideoSegment(sourcePath);
    const totalDurationMs = Math.max(
      1000,
      Math.round((probed?.durationSec ?? row.project.instantOutputDurationSeconds ?? 8) * 1000)
    );
    const overlayDurationSec =
      probed?.durationSec ?? row.project.instantOutputDurationSeconds ?? 8;
    const dims = resolveInstantVideoDimensions(
      row.project.aspectRatio,
      row.project.viduResolution
    );

    let compositorMethod = "story_overlay";

    if (row.overlayRenderMode === "story_overlay") {
      const sceneTexts = parseInstantSceneTexts(row.sceneTextsJson);
      await applyStorySceneTextOverlay({
        inputVideoPath: sourcePath,
        outputVideoPath: outputPath,
        sceneTexts,
        durationSeconds: overlayDurationSec,
        width: probed?.width ?? dims.width,
        height: probed?.height ?? dims.height,
        workDir,
      });
    } else {
      const layers = parseLanguageTextLayerJson(row.textLayerJson);
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
      compositorMethod = compositor.method;
    }

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
      sourceFinalVideoUrl: sourceUrl,
      outputVideoUrl: url,
      recordedAt: new Date().toISOString(),
      status: "completed",
    };

    await prisma.$transaction([
      prisma.videoLanguageExport.updateMany({
        where: {
          projectId: row.projectId,
          languageCode: row.languageCode,
          id: { not: exportId },
        },
        data: { isDefault: false },
      }),
      prisma.videoLanguageExport.update({
        where: { id: exportId },
        data: {
          status: "completed",
          outputVideoUrl: url,
          completedAt: new Date(),
          errorMessage: null,
          isDefault: true,
          translationAuditJson: {
            events: [...(audit.events ?? []), completedEvent],
          } as object,
        },
      }),
    ]);

    console.info("[language-export]", {
      phase: "completed",
      exportId,
      projectId: row.projectId,
      languageCode: row.languageCode,
      outputVideoUrl: url,
      overlayRenderMode: row.overlayRenderMode,
      compositorMethod,
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
