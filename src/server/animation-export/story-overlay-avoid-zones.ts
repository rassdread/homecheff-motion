/**
 * Story overlay avoid zones — OCR boxes, face/person fail-safe, center-head ban for 9:16.
 */

import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";
import { parseBakedTextBlockRecords } from "@/lib/baked-text-detection";
import type { HybridTextBlockMetadata } from "@/lib/hybrid-motion-overlay";
import { parseProjectDetectedTextMetadata } from "@/lib/hybrid-motion-overlay";
import type { AvoidBox } from "@/server/animation-export/local-vision/types";
import type { SafeZoneId, SafeZoneScore } from "@/server/animation-export/safe-zone-placement";
import { zoneBoundsNormalized } from "@/server/animation-export/local-vision/box-utils";

export const STORY_CENTER_HEAD_AVOID_ZONE: AvoidBox = {
  x: 0.28,
  y: 0.22,
  width: 0.44,
  height: 0.42,
  source: "object",
  label: "center_head_fail_safe",
  confidence: 1,
};

export function ocrBlocksToAvoidBoxes(
  blocks: Array<{ bbox: { x: number; y: number; width: number; height: number }; label?: string }>
): AvoidBox[] {
  return blocks.map((block) => ({
    x: block.bbox.x,
    y: block.bbox.y,
    width: block.bbox.width,
    height: block.bbox.height,
    source: "object" as const,
    label: block.label ?? "ocr_text",
    confidence: 0.95,
  }));
}

export function bakedTextRecordsToAvoidBoxes(records: BakedTextBlockRecord[]): AvoidBox[] {
  return records
    .filter((b) => b.kept !== false && (b.editedText.trim() || b.text.trim()))
    .map((b) => ({
      x: b.bbox.x,
      y: b.bbox.y,
      width: b.bbox.width,
      height: b.bbox.height,
      source: "object" as const,
      label: `ocr_${b.blockType}`,
      confidence: Math.max(0.5, b.confidence),
    }));
}

export function hybridMetadataForImage(
  blocks: HybridTextBlockMetadata[],
  imageId: string
): AvoidBox[] {
  const matched = blocks.filter((b) => !b.sourceImageId || b.sourceImageId === imageId);
  return ocrBlocksToAvoidBoxes(
    matched.map((b) => ({
      bbox: b.bbox,
      label: b.blockType ? `ocr_${b.blockType}` : "ocr_text",
    }))
  );
}

export function parseImageBakedTextAvoidBoxes(bakedTextBlocksJson: unknown): AvoidBox[] {
  return bakedTextRecordsToAvoidBoxes(parseBakedTextBlockRecords(bakedTextBlocksJson));
}

export function mergeStoryAvoidBoxes(
  ...groups: AvoidBox[][]
): AvoidBox[] {
  return groups.flat();
}

/** Penalize zones overlapping faces, mascots (person), logos, OCR, or center-head fail-safe. */
export function applyAvoidBoxPenaltiesToZones(
  zones: SafeZoneScore[],
  avoidBoxes: AvoidBox[]
): SafeZoneScore[] {
  if (avoidBoxes.length === 0) {
    return zones;
  }

  return zones.map((zone) => {
    const bounds = zoneBoundsNormalized(zone.zoneId);
    let penalty = 0;
    for (const box of avoidBoxes) {
      const overlap = overlapFraction(bounds, box);
      if (overlap <= 0) {
        continue;
      }
      const label = (box.label ?? "").toLowerCase();
      if (label.includes("face") || box.label === "face") {
        penalty += 120 * overlap;
      } else if (label.includes("person") || label.includes("body")) {
        penalty += 90 * overlap;
      } else if (label.includes("mascot") || label.includes("chef") || label.includes("garden")) {
        penalty += 85 * overlap;
      } else if (label.includes("logo") || label.includes("sign")) {
        penalty += 75 * overlap;
      } else if (label.includes("ocr")) {
        penalty += 70 * overlap;
      } else if (label.includes("center_head")) {
        penalty += 95 * overlap;
      } else {
        penalty += 50 * overlap;
      }
    }
    return {
      ...zone,
      score: Math.max(0, zone.score - penalty),
    };
  });
}

function overlapFraction(
  zone: { x: number; y: number; width: number; height: number },
  box: AvoidBox
): number {
  const x1 = Math.max(zone.x, box.x);
  const y1 = Math.max(zone.y, box.y);
  const x2 = Math.min(zone.x + zone.width, box.x + box.width);
  const y2 = Math.min(zone.y + zone.height, box.y + box.height);
  if (x2 <= x1 || y2 <= y1) {
    return 0;
  }
  const inter = (x2 - x1) * (y2 - y1);
  const zoneArea = zone.width * zone.height;
  return zoneArea > 0 ? inter / zoneArea : 0;
}

export function isCenterZoneUnsafe(
  avoidBoxes: AvoidBox[],
  minOverlap = 0.12
): boolean {
  const center = zoneBoundsNormalized("CENTER");
  return avoidBoxes.some((box) => {
    const label = (box.label ?? "").toLowerCase();
    const isSubject =
      label.includes("face") ||
      label.includes("person") ||
      label.includes("body") ||
      label.includes("center_head") ||
      label.includes("mascot");
    return isSubject && overlapFraction(center, box) >= minOverlap;
  });
}

export function rejectUnsafeCenterForHero(
  zoneId: SafeZoneId,
  avoidBoxes: AvoidBox[],
  aspectRatio?: string
): SafeZoneId {
  if (aspectRatio !== "9:16" && aspectRatio !== "9/16") {
    return zoneId;
  }
  if (zoneId !== "CENTER" && zoneId !== "CENTER_LEFT" && zoneId !== "CENTER_RIGHT") {
    return zoneId;
  }
  if (isCenterZoneUnsafe(avoidBoxes)) {
    return "TOP_CENTER";
  }
  return zoneId;
}

export function collectOcrAvoidBoxesForScene(params: {
  sceneIndex: number;
  imageId?: string;
  imageBakedTextJson?: unknown;
  projectDetectedTextMetadata?: unknown;
}): AvoidBox[] {
  const fromImage = params.imageBakedTextJson ?
    parseImageBakedTextAvoidBoxes(params.imageBakedTextJson)
  : [];
  const snapshot = parseProjectDetectedTextMetadata(params.projectDetectedTextMetadata);
  const fromProject =
    snapshot && params.imageId ?
      hybridMetadataForImage(snapshot.blocks, params.imageId)
    : [];
  return mergeStoryAvoidBoxes(fromImage, fromProject);
}

export function storyFailSafeAvoidBoxes(aspectRatio?: string): AvoidBox[] {
  if (aspectRatio === "9:16" || aspectRatio === "9/16") {
    return [STORY_CENTER_HEAD_AVOID_ZONE];
  }
  return [];
}
