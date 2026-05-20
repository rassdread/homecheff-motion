import type { BakedTextProtectionDraft } from "@/components/instant/baked-text-protection-panel";
import type { BakedTextProtectionPayload } from "@/lib/baked-text-detection";
import { defaultMaskRegionForTextPosition } from "@/lib/baked-text-protection";

/** Checkout/preflight payload: OCR metadata for reuse + confirmed protection when enabled. */
export function buildInstantPremiumBakedTextSnapshot(
  bakedText: BakedTextProtectionDraft
): BakedTextProtectionPayload | undefined {
  const ocrMeta = {
    ocrScanPhase: bakedText.scanPhase,
    autoProtected: bakedText.autoProtected === true,
  };

  if (bakedText.userSkipped || bakedText.status === "skipped" || bakedText.scanPhase === "skipped") {
    return {
      enabled: false,
      status: "skipped",
      userSkipped: true,
      blocks: [],
      ...ocrMeta,
      ocrScanPhase: bakedText.scanPhase ?? "skipped",
    };
  }

  if (bakedText.scanPhase === "no_text_found") {
    return {
      enabled: false,
      status: "skipped",
      blocks: [],
      ...ocrMeta,
      ocrScanPhase: "no_text_found",
    };
  }

  const confirmed = bakedText.blocks.filter(
    (b) => b.kept && b.confirmed && b.editedText.trim().length > 0
  );

  if (bakedText.enabled) {
    if (confirmed.length > 0) {
      return {
        enabled: true,
        status: "confirmed",
        blocks: confirmed,
        ...ocrMeta,
      };
    }
    if (bakedText.manualMode && bakedText.exactText.trim()) {
      return {
        enabled: true,
        status: "confirmed",
        exactText: bakedText.exactText.trim(),
        positionY: bakedText.positionY,
        maskRegion: defaultMaskRegionForTextPosition(bakedText.positionY),
        blocks: bakedText.blocks,
        ...ocrMeta,
      };
    }
    return {
      enabled: true,
      status: bakedText.blocks.length > 0 ? "detected" : "none",
      blocks: bakedText.blocks,
      ...ocrMeta,
    };
  }

  if (bakedText.blocks.length > 0 || bakedText.scanPhase) {
    return {
      enabled: false,
      status: "none",
      blocks: bakedText.blocks,
      ...ocrMeta,
    };
  }

  return undefined;
}
