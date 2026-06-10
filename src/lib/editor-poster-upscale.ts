import { printDimensionsPixels, resolvePrintSettings } from "@/lib/editor-print-export";
import type { EditorCanvasDocument, EditorPosterUpscaleAssessment } from "@/types/homecheff-visual-editor";

export function isUpscaleProviderAvailable(): boolean {
  return Boolean(
    process.env.REPLICATE_API_TOKEN?.trim() ||
      process.env.OPENAI_API_KEY?.trim() ||
      process.env.HC_UPSCALE_API_URL?.trim()
  );
}

export function assessPosterUpscaleNeeds(
  document: EditorCanvasDocument,
  sourceWidth: number,
  sourceHeight: number
): EditorPosterUpscaleAssessment {
  const print = resolvePrintSettings(document);
  const required = printDimensionsPixels(print);
  const providerAvailable = isUpscaleProviderAvailable();

  const widthRatio = required.width / Math.max(1, sourceWidth);
  const heightRatio = required.height / Math.max(1, sourceHeight);
  const maxRatio = Math.max(widthRatio, heightRatio);

  if (maxRatio <= 1.1) {
    return {
      status: "good",
      sourceWidth,
      sourceHeight,
      requiredWidth: required.width,
      requiredHeight: required.height,
      messageKey: "editor.v5.upscale.good",
      providerAvailable,
    };
  }
  if (maxRatio <= 2) {
    return {
      status: "acceptable",
      sourceWidth,
      sourceHeight,
      requiredWidth: required.width,
      requiredHeight: required.height,
      messageKey: "editor.v5.upscale.acceptable",
      providerAvailable,
    };
  }
  if (providerAvailable) {
    return {
      status: "needs_upscale",
      sourceWidth,
      sourceHeight,
      requiredWidth: required.width,
      requiredHeight: required.height,
      messageKey: "editor.v5.upscale.needsUpscale",
      providerAvailable: true,
    };
  }
  return {
    status: "unavailable",
    sourceWidth,
    sourceHeight,
    requiredWidth: required.width,
    requiredHeight: required.height,
    messageKey: "editor.v5.upscale.unavailable",
    providerAvailable: false,
  };
}

export function upscaleFoundationMessageKey(status: EditorPosterUpscaleAssessment["status"]): string {
  switch (status) {
    case "good":
      return "editor.v5.upscale.good";
    case "acceptable":
      return "editor.v5.upscale.acceptable";
    case "needs_upscale":
      return "editor.v5.upscale.willUpscale";
    case "unavailable":
      return "editor.v5.upscale.unavailable";
  }
}
