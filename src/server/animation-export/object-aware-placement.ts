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

export type OverlayTemplateKind =
  | "hero"
  | "headline"
  | "title"
  | "subtitle"
  | "scene"
  | "sequence"
  | "heroFinale";

const EARNINGS_KEYWORDS = ["earn", "earning", "money", "payout", "income", "order", "customer"];
const COMMUNITY_KEYWORDS = ["share", "connect", "community", "people", "together"];
const PRODUCT_KEYWORDS = ["food", "meal", "chef", "garden", "create"];
const GARDEN_KEYWORDS = ["garden", "plant", "herb", "green", "grow", "harvest"];

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

function accentMatchesKeywords(accentWords: string[] | undefined, keywords: string[]): boolean {
  if (!accentWords?.length) {
    return false;
  }
  for (const raw of accentWords) {
    const word = raw.trim().toLowerCase();
    if (!word) {
      continue;
    }
    if (keywords.some((kw) => word === kw || word.includes(kw) || kw.includes(word))) {
      return true;
    }
  }
  return false;
}

function sceneOrAccentMatches(
  sceneText: string,
  accentWords: string[] | undefined,
  keywords: string[]
): boolean {
  return textMatchesKeywords(sceneText, keywords) || accentMatchesKeywords(accentWords, keywords);
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

function pickBestScoredZone(analysis: SafeZoneAnalysis, zoneIds: SafeZoneId[]): SafeZoneId | null {
  let best: SafeZoneId | null = null;
  let bestScore = -1;
  for (const zoneId of zoneIds) {
    const score = zoneScoreForId(analysis, zoneId);
    if (score > bestScore) {
      bestScore = score;
      best = zoneId;
    }
  }
  return best;
}

function preferUpperZoneIfBusyBottom(
  analysis: SafeZoneAnalysis,
  chosenZone: SafeZoneId,
  topZones: SafeZoneId[],
  centerZones: SafeZoneId[]
): { zoneId: SafeZoneId; reason?: string } {
  if (!chosenZone.startsWith("BOTTOM_")) {
    return { zoneId: chosenZone };
  }
  const upperBest = pickBestScoredZone(analysis, [...topZones, ...centerZones]);
  const bottomScore = zoneScoreForId(analysis, chosenZone);
  if (upperBest && zoneScoreForId(analysis, upperBest) >= bottomScore * 0.55) {
    return { zoneId: upperBest, reason: "preferred_upper_empty_zone" };
  }
  return { zoneId: chosenZone, reason: "bottom_only_viable_zone" };
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
  const topZones: SafeZoneId[] = ["TOP_LEFT", "TOP_CENTER", "TOP_RIGHT"];
  const centerZones: SafeZoneId[] = ["CENTER_LEFT", "CENTER", "CENTER_RIGHT"];
  if (template === "hero" || template === "headline") {
    return analysis.bestTopZone;
  }
  if (template === "title") {
    const upper = pickBestScoredZone(analysis, [...topZones, ...centerZones]);
    if (upper) {
      return upper;
    }
    return analysis.bestCenterZone;
  }
  if (template === "subtitle" || template === "scene") {
    const upper = pickBestScoredZone(analysis, [...centerZones, ...topZones]);
    if (upper && !upper.startsWith("BOTTOM_")) {
      return upper;
    }
    return analysis.bestCenterZone;
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
  accentWords?: string[];
}): ObjectAwarePlacement {
  const { sceneText, template, detectionContext, enhancedAnalysis, width, height, accentWords } =
    params;
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

  if (sceneOrAccentMatches(sceneText, accentWords, EARNINGS_KEYWORDS)) {
    const devices = findRelevantObjects(detectionContext, DEVICE_LABELS);
    const candidatePool = template === "headline" ? topZones : allZones;
    if (devices.length > 0) {
      const near = pickBestZoneNearObject(enhancedAnalysis, devices[0]!, candidatePool);
      if (near && near.score >= fallbackScore * 0.7) {
        chosenZone = near.zoneId;
        placementReason = accentWords?.length ? "accent_earnings_near_device" : "earnings_near_device";
        confidence = 0.82;
      }
    }
  } else if (sceneOrAccentMatches(sceneText, accentWords, COMMUNITY_KEYWORDS)) {
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
        placementReason = accentWords?.length ?
          "accent_community_near_people_avoid_faces"
        : "community_near_people_avoid_faces";
        confidence = 0.78;
      }
    }
  } else if (sceneOrAccentMatches(sceneText, accentWords, GARDEN_KEYWORDS)) {
    const plants = findRelevantObjects(detectionContext, [
      "potted plant",
      "plant",
      "vase",
      "broccoli",
      "carrot",
    ]);
    if (plants.length > 0) {
      const near = pickBestZoneNearObject(
        enhancedAnalysis,
        plants[0]!,
        bottomZones.concat(centerZones, topZones)
      );
      if (near && near.score >= fallbackScore * 0.65) {
        chosenZone = near.zoneId;
        placementReason = accentWords?.length ? "accent_garden_near_plants" : "garden_near_plants";
        confidence = 0.76;
      }
    }
  } else if (sceneOrAccentMatches(sceneText, accentWords, PRODUCT_KEYWORDS)) {
    const products = findRelevantObjects(detectionContext, FOOD_LABELS);
    if (products.length > 0) {
      const near = pickBestZoneNearObject(enhancedAnalysis, products[0]!, bottomZones.concat(centerZones));
      if (near) {
        chosenZone = near.zoneId;
        placementReason = accentWords?.length ?
          "accent_product_near_relevant_object"
        : "product_near_relevant_object";
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

  if (template === "headline" && !topZones.includes(chosenZone)) {
    chosenZone = enhancedAnalysis.bestTopZone;
  }

  if (template === "title" || template === "headline") {
    const preferred = preferUpperZoneIfBusyBottom(
      enhancedAnalysis,
      chosenZone,
      topZones,
      centerZones
    );
    if (preferred.reason) {
      chosenZone = preferred.zoneId;
      placementReason = preferred.reason;
      confidence = Math.max(confidence, 0.72);
    }
  }

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
  accentWords?: string[];
}): Record<OverlayTemplateKind, ObjectAwarePlacement> {
  const templates: OverlayTemplateKind[] = [
    "hero",
    "headline",
    "title",
    "subtitle",
    "scene",
    "sequence",
    "heroFinale",
  ];
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
