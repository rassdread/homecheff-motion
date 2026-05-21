/**
 * Reusable typography compositing pipeline (multilingual, subtitles, campaigns).
 */

import type { LanguageTextLayerRecord } from "@/lib/video-language-export";
import type { TypographyRenderQuality } from "@/lib/typography-style-profile";
import { DEFAULT_TYPOGRAPHY_RENDER_QUALITY } from "@/lib/typography-style-profile";

export type TypographyCompositorPass = {
  passId: string;
  layerId: string;
  method: "svg_raster" | "drawtext_fallback";
  quality: TypographyRenderQuality;
};

export type TypographyPipelineContext = {
  projectId: string;
  languageCode: string;
  canvasWidth: number;
  canvasHeight: number;
  quality: TypographyRenderQuality;
  /** Reuse for affiliate / subtitle / template flows */
  pipelineKind: "language_export" | "subtitle" | "affiliate" | "template";
};

export function createTypographyPipelineContext(params: {
  projectId: string;
  languageCode: string;
  canvasWidth: number;
  canvasHeight: number;
  quality?: TypographyRenderQuality;
  pipelineKind?: TypographyPipelineContext["pipelineKind"];
}): TypographyPipelineContext {
  return {
    projectId: params.projectId,
    languageCode: params.languageCode,
    canvasWidth: params.canvasWidth,
    canvasHeight: params.canvasHeight,
    quality: params.quality ?? DEFAULT_TYPOGRAPHY_RENDER_QUALITY,
    pipelineKind: params.pipelineKind ?? "language_export",
  };
}

export function logTypographyPipeline(pass: TypographyCompositorPass, meta: Record<string, unknown>): void {
  console.info("[typography-pipeline]", {
    ...pass,
    ...meta,
  });
}

export function countLayersWithTypography(layers: LanguageTextLayerRecord[]): number {
  return layers.filter((l) => l.typography != null).length;
}
