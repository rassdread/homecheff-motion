import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";
import type {
  ImagePreflightVisionAssessment,
  ImageTextRiskLevel,
} from "@/server/instant-premium/openai-preflight-vision";

function readableBlocks(blocks: BakedTextBlockRecord[]): BakedTextBlockRecord[] {
  return blocks.filter(
    (b) => b.kept !== false && (b.editedText.trim() || b.text.trim()).length >= 2
  );
}

function estimateDistortionRisk(blocks: BakedTextBlockRecord[]): ImageTextRiskLevel {
  const active = readableBlocks(blocks);
  if (active.length === 0) {
    return "none";
  }
  const hasUi = active.some((b) => b.blockType === "ui");
  const hasLogo = active.some((b) => b.blockType === "sign" || b.blockType === "cta");
  const avgConf = active.reduce((sum, b) => sum + b.confidence, 0) / active.length;
  if (hasUi && avgConf >= 0.7) {
    return "high";
  }
  if (hasLogo || active.length >= 4) {
    return "medium";
  }
  if (avgConf >= 0.85 && active.length >= 2) {
    return "medium";
  }
  return "low";
}

export function emptyPreflightVisionFromOcr(): ImagePreflightVisionAssessment {
  return {
    hasReadableText: false,
    hasPhoneOrUiText: false,
    hasLogoOrBrandText: false,
    estimatedTextBlockCount: 0,
    distortionRisk: "none",
    summary: "OCR: no readable text.",
  };
}

/** Reuse OCR blocks for preflight instead of a second OpenAI Vision call. */
export function derivePreflightVisionFromOcrBlocks(
  blocks: BakedTextBlockRecord[]
): ImagePreflightVisionAssessment {
  const active = readableBlocks(blocks);
  if (active.length === 0) {
    return emptyPreflightVisionFromOcr();
  }

  const hasPhoneOrUiText = active.some((b) => b.blockType === "ui");
  const hasLogoOrBrandText = active.some(
    (b) => b.blockType === "sign" || b.blockType === "cta"
  );
  const distortionRisk = estimateDistortionRisk(active);

  return {
    hasReadableText: true,
    hasPhoneOrUiText,
    hasLogoOrBrandText,
    estimatedTextBlockCount: active.length,
    distortionRisk,
    summary: `OCR: ${active.length} text block(s) detected.`,
  };
}
