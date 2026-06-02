/**
 * Safe Zone V5 — object-aware text placement (local, deterministic).
 */

import {
  boxOverlapFraction,
  distanceBetweenCenters,
  nearestNonOverlappingZoneCenter,
  normalizedToPixelAnchor,
  zoneBoundsNormalized,
} from "@/server/animation-export/local-vision/box-utils";
import type { SceneDetectionContext } from "@/server/animation-export/local-vision/scene-detection-context";
import type { AvoidBox } from "@/server/animation-export/local-vision/types";
import { inferSceneIntent, type SceneIntent } from "@/server/animation-export/scene-intent-rules";
import {
  SAFE_AREA_MARGIN_H,
  SAFE_AREA_MARGIN_V,
  type SafeZoneAnalysis,
  type SafeZoneId,
  type SafeZonePlacement,
  type SafeZoneScore,
} from "@/server/animation-export/safe-zone-placement";

export type ObjectAwarePlacement = SafeZonePlacement & {
  placementReason: string;
  confidence: number;
  intent: SceneIntent;
};

export type OverlayTemplateKind = "hero" | "scene" | "sequence" | "heroFinale";

const EARNINGS_KEYWORDS = ["earn", "earning", "money", "payout", "income", "order", "customer"];
const COMMUNITY_KEYWORDS = ["share", "connect", "community", "people", "together"];
const PRODUCT_KEYWORDS = ["food", "meal", "chef", "garden", "create"];

const DEVICE_LABELS = ["cell phone", "laptop", "tv", "monitor", "screen", "keyboard"];
const PERSON_LABELS = ["person", "face", "body"];
const FOOD_LABELS = [
  "pizza", "sandwich", "apple", "banana", "orange", "broccoli", "carrot",
  "hot dog", "donut", "cake", "bowl", "bottle", "wine glass", "cup",
  "dining table", "potted plant", "food",
];

function textMatchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  const words = lower.split(/[^a-z0-9]+/).filter(Boolean);
  return keywords.some((kw) => {
    if (kw.includes(" ")) {
      return lower.includes(kw);
    }
    return words.includes(kw);
  });
}

function findRelevantObjects(
  context: SceneDetectionContext,
  labels: string[]
): AvoidBox[] {
  return context.combinedAvoidBoxes.filter((box) =>
    labels.some((l) => box.label.toLowerCase().includes(l.toLowerCase()))
  );
}

function zoneScoreForId(analysis: SafeZoneAnalysis, zoneId: SafeZoneId): number {
  return analysis.zones.find((z) => z.zoneId === zoneId)?.score ?? 0;
}

function pickBestZoneNearObject(
  analysis: SafeZoneAnalysis,
  objectBox: AvoidBox,
  candidateZoneIds: SafeZoneId[]
): { zoneId: SafeZoneId; score: number } | null {
  let best: SafeZoneId | null = null;
  let bestScore = -1;

  for (const zoneId of candidateZoneIds) {
    const zone = zoneBoundsNormalized(zoneId);
    const overlap = boxOverlapFraction(zone, objectBox);
    if (overlap > 0.15) {
      continue;
    }
    const dist = distanceBetweenCenters(zone, objectBox);
    const proximityBonus = Math.max(0, 18 - dist * 40);
    const base = zoneScoreForId(analysis, zoneId);
    const score = base + proximityBonus;
    if (score > bestScore) {
      bestScore = score;
      best = zoneId;
    }
  }

  return best ? { zoneId: best, score: bestScore } : null;
}

function defaultZoneForTemplate(
  analysis: SafeZoneAnalysis,
  template: OverlayTemplateKind
): SafeZoneId {
  if (template === "hero") {
    return analysis.bestTopZone;
  }
  if (template === "scene") {
    return analysis.bestBottomZone;
  }
  if (template === "heroFinale") {
    const topScore = zoneScoreForId(analysis, analysis.bestTopZone);
    const centerScore = zoneScoreForId(analysis, analysis.bestCenterZone);
    return topScore >= centerScore ? analysis.bestTopZone : analysis.bestCenterZone;
  }
  return analysis.bestCenterZone;
}

function buildPlacementFromZone(
  zoneId: SafeZoneId,
  zoneScore: number,
  width: number,
  height: number,
  objectBox?: AvoidBox
): Pick<SafeZonePlacement, "zoneId" | "anchorX" | "anchorY" | "textWidthFraction" | "zoneScore"> {
  const normCenter = objectBox
    ? nearestNonOverlappingZoneCenter(objectBox, zoneId)
    : { x: 0.5, y: 0.5 };

  if (!objectBox) {
    const col = zoneId.includes("_LEFT") ? 0 : zoneId.includes("_RIGHT") ? 2 : 1;
    const row = zoneId.startsWith("TOP_") ? 0 : zoneId.startsWith("BOTTOM_") ? 2 : 1;
    normCenter.x = (col + 0.5) / 3;
    normCenter.y = (row + 0.5) / 3;
  }

  const { anchorX, anchorY } = normalizedToPixelAnchor(
    normCenter,
    width,
    height,
    SAFE_AREA_MARGIN_H,
    SAFE_AREA_MARGIN_V
  );

  const textWidthFraction =
    zoneScore >= 70 ? 0.82
    : zoneScore >= 45 ? 0.72
    : 0.62;

  return { zoneId, anchorX, anchorY, textWidthFraction, zoneScore };
}

/**
 * Resolve object-aware placement for one overlay template.
 * Falls back to standard Safe Zone when confidence is low.
 */
export function resolveObjectAwarePlacement(params: {
  sceneText: string;
  template: OverlayTemplateKind;
  detectionContext: SceneDetectionContext;
  enhancedAnalysis: SafeZoneAnalysis;
  width: number;
  height: number;
}): ObjectAwarePlacement {
  const { sceneText, template, detectionContext, enhancedAnalysis, width, height } = params;
  const intent = inferSceneIntent(sceneText);
  const fallbackZone = defaultZoneForTemplate(enhancedAnalysis, template);
  const fallbackScore = zoneScoreForId(enhancedAnalysis, fallbackZone);

  let chosenZone = fallbackZone;
  let placementReason = "safe_zone_v1_fallback";
  let confidence = 0.5;

  const topZones: SafeZoneId[] = ["TOP_LEFT", "TOP_CENTER", "TOP_RIGHT"];
  const centerZones: SafeZoneId[] = ["CENTER_LEFT", "CENTER", "CENTER_RIGHT"];
  const bottomZones: SafeZoneId[] = ["BOTTOM_LEFT", "BOTTOM_CENTER", "BOTTOM_RIGHT"];
  const allZones = [...topZones, ...centerZones, ...bottomZones];

  if (textMatchesKeywords(sceneText, EARNINGS_KEYWORDS)) {
    const devices = findRelevantObjects(detectionContext, DEVICE_LABELS);
    if (devices.length > 0) {
      const near = pickBestZoneNearObject(enhancedAnalysis, devices[0]!, allZones);
      if (near && near.score >= fallbackScore * 0.7) {
        chosenZone = near.zoneId;
        placementReason = "earnings_near_device";
        confidence = 0.82;
      }
    }
  } else if (textMatchesKeywords(sceneText, COMMUNITY_KEYWORDS)) {
    const people = findRelevantObjects(detectionContext, PERSON_LABELS);
    const faceFreeZones = allZones.filter((zoneId) => {
      const zone = zoneBoundsNormalized(zoneId);
      return !people.some(
        (p) =>
          p.label.toLowerCase().includes("face") &&
          boxOverlapFraction(zone, p) > 0.1
      );
    });
    if (people.length > 0 && faceFreeZones.length > 0) {
      const near = pickBestZoneNearObject(
        enhancedAnalysis,
        people[0]!,
        faceFreeZones
      );
      if (near) {
        chosenZone = near.zoneId;
        placementReason = "community_near_people_avoid_faces";
        confidence = 0.78;
      }
    }
  } else if (textMatchesKeywords(sceneText, PRODUCT_KEYWORDS)) {
    const products = findRelevantObjects(detectionContext, FOOD_LABELS);
    if (products.length > 0) {
      const near = pickBestZoneNearObject(enhancedAnalysis, products[0]!, bottomZones.concat(centerZones));
      if (near) {
        chosenZone = near.zoneId;
        placementReason = "product_near_relevant_object";
        confidence = 0.75;
      }
    }
  } else if (intent === "final_movement" || template === "heroFinale") {
    const cleanTop = topZones.concat(centerZones).reduce<{ id: SafeZoneId; score: number } | null>(
      (best, zoneId) => {
        const score = zoneScoreForId(enhancedAnalysis, zoneId);
        if (!best || score > best.score) {
          return { id: zoneId, score };
        }
        return best;
      },
      null
    );
    if (cleanTop && cleanTop.score >= 40) {
      chosenZone = cleanTop.id;
      placementReason = "final_movement_clean_hero_zone";
      confidence = 0.85;
    }
  }

  const zoneScore = zoneScoreForId(enhancedAnalysis, chosenZone);
  const objectBox =
    placementReason !== "safe_zone_v1_fallback"
      ? detectionContext.combinedAvoidBoxes[0]
      : undefined;

  const base = buildPlacementFromZone(chosenZone, zoneScore, width, height, objectBox);

  return {
    ...base,
    placementReason,
    confidence,
    intent,
  };
}

export function resolveAllTemplatePlacements(params: {
  sceneText: string;
  detectionContext: SceneDetectionContext;
  enhancedAnalysis: SafeZoneAnalysis;
  width: number;
  height: number;
}): Record<OverlayTemplateKind, ObjectAwarePlacement> {
  const templates: OverlayTemplateKind[] = ["hero", "scene", "sequence", "heroFinale"];
  const out = {} as Record<OverlayTemplateKind, ObjectAwarePlacement>;
  for (const template of templates) {
    out[template] = resolveObjectAwarePlacement({ ...params, template });
  }
  return out;
}

/** Exported for tests — pick zone row winners from enhanced scores. */
export function selectRowWinnersFromScores(zones: SafeZoneScore[]): {
  bestTopZone: SafeZoneId;
  bestCenterZone: SafeZoneId;
  bestBottomZone: SafeZoneId;
  bestOverallZone: SafeZoneId;
} {
  const topZones: SafeZoneId[] = ["TOP_LEFT", "TOP_CENTER", "TOP_RIGHT"];
  const centerZones: SafeZoneId[] = ["CENTER_LEFT", "CENTER", "CENTER_RIGHT"];
  const bottomZones: SafeZoneId[] = ["BOTTOM_LEFT", "BOTTOM_CENTER", "BOTTOM_RIGHT"];

  function bestIn(ids: SafeZoneId[]): SafeZoneId {
    let best = ids[0]!;
    let bestScore = -1;
    for (const id of ids) {
      const score = zones.find((z) => z.zoneId === id)?.score ?? 0;
      if (score > bestScore) {
        bestScore = score;
        best = id;
      }
    }
    return best;
  }

  let bestOverall = zones[0]?.zoneId ?? "CENTER";
  let bestOverallScore = -1;
  for (const z of zones) {
    if (z.score > bestOverallScore) {
      bestOverallScore = z.score;
      bestOverall = z.zoneId;
    }
  }

  return {
    bestTopZone: bestIn(topZones),
    bestCenterZone: bestIn(centerZones),
    bestBottomZone: bestIn(bottomZones),
    bestOverallZone: bestOverall,
  };
}
