/**
 * Safe Zone V3–V6 — enhanced scoring, object-aware placement orchestration.
 */

import { boxOverlapFraction, zoneBoundsNormalized } from "@/server/animation-export/local-vision/box-utils";
import type { SceneDetectionContext } from "@/server/animation-export/local-vision/scene-detection-context";
import type { AvoidBox, MediaPipeDetection } from "@/server/animation-export/local-vision/types";
import {
  isAnyLocalDetectionEnabled,
  isObjectSafeZonesEnabled,
} from "@/server/animation-export/local-vision/feature-flags";
import { objectLabelPenalty } from "@/server/animation-export/local-vision/object-detector";
import {
  resolveAllTemplatePlacements,
  selectRowWinnersFromScores,
  type ObjectAwarePlacement,
  type OverlayTemplateKind,
} from "@/server/animation-export/object-aware-placement";
import { applyStoryReadingFlowToPlacements } from "@/server/animation-export/story-layer-placement";
import {
  applyIntentBonus,
  inferSceneIntent,
  type SceneIntent,
} from "@/server/animation-export/scene-intent-rules";
import {
  headlinePlacement,
  heroFinalePlacement,
  heroPlacement,
  placementForZone,
  scenePlacement,
  sequencePlacement,
  subtitleLayerPlacement,
  titleLayerPlacement,
  type SafeZoneAnalysis,
  type SafeZoneDebugInfo,
  type SafeZonePlacement,
  type SafeZoneScore,
} from "@/server/animation-export/safe-zone-placement";

export type { OverlayTemplateKind, ObjectAwarePlacement };

export type SceneSafeZoneContext = {
  v1: SafeZoneAnalysis;
  enhanced: SafeZoneAnalysis;
  detection: SceneDetectionContext;
  intent: SceneIntent;
  placements: Record<OverlayTemplateKind, ObjectAwarePlacement>;
  useStrongBackdrop: boolean;
  fallbackReason?: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mediapipeOverlapPenalty(det: MediaPipeDetection, overlap: number): number {
  const scale = overlap * det.confidence;
  if (det.type === "face") {
    return 100 * scale;
  }
  if (det.type === "person" || det.type === "body") {
    return 70 * scale;
  }
  if (det.type === "hand") {
    return 45 * scale;
  }
  return 0;
}

function emptySpaceBonusForZone(zoneId: string, avoidBoxes: AvoidBox[]): number {
  const zone = zoneBoundsNormalized(zoneId as SafeZoneAnalysis["bestTopZone"]);
  let bonus = 0;
  for (const box of avoidBoxes) {
    const overlap = boxOverlapFraction(zone, box);
    if (overlap < 0.05) {
      const cx = zone.x + zone.width / 2;
      const cy = zone.y + zone.height / 2;
      const bx = box.x + box.width / 2;
      const by = box.y + box.height / 2;
      const dist = Math.sqrt((cx - bx) ** 2 + (cy - by) ** 2);
      if (dist < 0.45) {
        bonus += 8;
      }
    }
  }
  return Math.min(15, bonus);
}

function verticalZoneBonus(zoneId: SafeZoneScore["zoneId"]): number {
  if (zoneId.startsWith("TOP_")) {
    return 14;
  }
  if (zoneId.startsWith("CENTER_")) {
    return 7;
  }
  if (zoneId.startsWith("BOTTOM_")) {
    return -12;
  }
  return 0;
}

function lowerThirdClutterPenalty(zone: SafeZoneScore): number {
  if (!zone.zoneId.startsWith("BOTTOM_")) {
    return 0;
  }
  return zone.edgeDensity * 0.55 + Math.max(0, zone.contrast - 20) * 0.15;
}

function objectOverlapPercent(zoneId: SafeZoneScore["zoneId"], avoidBoxes: AvoidBox[]): number {
  const zone = zoneBoundsNormalized(zoneId);
  let maxOverlap = 0;
  for (const box of avoidBoxes) {
    maxOverlap = Math.max(maxOverlap, boxOverlapFraction(zone, box));
  }
  return Math.round(maxOverlap * 1000) / 10;
}

/** Apply detection overlap penalties on top of Safe Zone V1 scores. */
export function computeEnhancedZoneScores(
  v1: SafeZoneAnalysis,
  detection: SceneDetectionContext,
  intent: SceneIntent
): SafeZoneScore[] {
  if (!isAnyLocalDetectionEnabled() && detection.combinedAvoidBoxes.length === 0) {
    return v1.zones;
  }

  return v1.zones.map((zone) => {
    const zoneBounds = zoneBoundsNormalized(zone.zoneId);
    let detectionPenalty = 0;
    let objectPenalty = 0;

    for (const det of detection.mediaPipeDetections) {
      const overlap = boxOverlapFraction(zoneBounds, det.box);
      if (overlap > 0) {
        detectionPenalty += mediapipeOverlapPenalty(det, overlap) * 1.35;
      }
    }

    for (const det of detection.objectDetections) {
      const overlap = boxOverlapFraction(zoneBounds, det.box);
      if (overlap > 0) {
        objectPenalty += objectLabelPenalty(det.label, det.confidence) * overlap * 1.5;
      }
    }

    const emptyBonus = emptySpaceBonusForZone(zone.zoneId, detection.combinedAvoidBoxes);
    const edgeClutterPenalty = zone.edgeDensity * 0.65;
    const verticalBonus = verticalZoneBonus(zone.zoneId);
    const bottomPenalty = lowerThirdClutterPenalty(zone);
    const rawScore =
      zone.score -
      detectionPenalty -
      objectPenalty +
      emptyBonus +
      verticalBonus -
      edgeClutterPenalty -
      bottomPenalty;
    const withIntent = applyIntentBonus(zone.zoneId, intent, rawScore);

    return {
      ...zone,
      score: clamp(withIntent, 0, 100),
    };
  });
}

/** Build enhanced Safe Zone analysis from V1 + detection context. */
export function computeEnhancedSafeZoneAnalysis(
  v1: SafeZoneAnalysis,
  detection: SceneDetectionContext,
  sceneText: string
): { enhanced: SafeZoneAnalysis; useStrongBackdrop: boolean; fallbackReason?: string } {
  const intent = inferSceneIntent(sceneText);
  const enhancedZones = computeEnhancedZoneScores(v1, detection, intent);
  const winners = selectRowWinnersFromScores(enhancedZones);

  const bestOverallScore = enhancedZones.find((z) => z.zoneId === winners.bestOverallZone)?.score ?? 0;
  const v1TopScore = v1.zones.find((z) => z.zoneId === v1.bestTopZone)?.score ?? 0;

  let useStrongBackdrop = bestOverallScore < 50;
  let fallbackReason: string | undefined;

  if (bestOverallScore < 25 && v1TopScore >= 30) {
    fallbackReason = "all_zones_score_poorly_using_v1_with_backdrop";
    useStrongBackdrop = true;
    return {
      enhanced: {
        ...v1,
        bestOverallZone: v1.bestTopZone,
      },
      useStrongBackdrop,
      fallbackReason,
    };
  }

  return {
    enhanced: {
      zones: enhancedZones,
      bestTopZone: winners.bestTopZone,
      bestCenterZone: winners.bestCenterZone,
      bestBottomZone: winners.bestBottomZone,
      bestOverallZone: winners.bestOverallZone,
      confidence: Math.round(clamp(bestOverallScore, 0, 100)),
    },
    useStrongBackdrop,
    fallbackReason,
  };
}

/** Full V3–V6 context: V1 + enhanced analysis + object-aware placements. */
export function buildSceneSafeZoneContext(params: {
  detection: SceneDetectionContext;
  sceneText: string;
  width: number;
  height: number;
  accentWords?: string[];
}): SceneSafeZoneContext {
  const { detection, sceneText, width, height, accentWords } = params;
  const v1 = detection.safeZoneV1;
  const intent = inferSceneIntent(sceneText);

  if (!isAnyLocalDetectionEnabled() && detection.combinedAvoidBoxes.length === 0) {
    const placements = applyStoryReadingFlowToPlacements(
      resolveAllTemplatePlacements({
        sceneText,
        detectionContext: detection,
        enhancedAnalysis: v1,
        width,
        height,
        accentWords,
      })
    );
    return {
      v1,
      enhanced: v1,
      detection,
      intent,
      placements,
      useStrongBackdrop: false,
    };
  }

  const { enhanced, useStrongBackdrop, fallbackReason } = computeEnhancedSafeZoneAnalysis(
    v1,
    detection,
    sceneText
  );
  const analysisForPlacement = fallbackReason ? v1 : enhanced;
  const rawPlacements = resolveAllTemplatePlacements({
    sceneText,
    detectionContext: detection,
    enhancedAnalysis: analysisForPlacement,
    width,
    height,
    accentWords,
  });
  const placements = applyStoryReadingFlowToPlacements(rawPlacements);

  return {
    v1,
    enhanced: fallbackReason ? v1 : enhanced,
    detection,
    intent,
    placements,
    useStrongBackdrop,
    fallbackReason,
  };
}

/** Resolve placement for a template from SceneSafeZoneContext or legacy SafeZoneAnalysis. */
export function resolvePlacementForTemplate(
  ctx: SceneSafeZoneContext | SafeZoneAnalysis | null | undefined,
  template: OverlayTemplateKind,
  width: number,
  height: number
): SafeZonePlacement {
  if (!ctx) {
    return placementForZone("CENTER", 50, width, height);
  }
  if ("placements" in ctx) {
    return ctx.placements[template];
  }
  if (template === "hero") {
    return heroPlacement(ctx, width, height);
  }
  if (template === "headline") {
    return headlinePlacement(ctx, width, height);
  }
  if (template === "title") {
    return titleLayerPlacement(ctx, width, height);
  }
  if (template === "subtitle") {
    return subtitleLayerPlacement(ctx, width, height);
  }
  if (template === "scene") {
    return scenePlacement(ctx, width, height);
  }
  if (template === "heroFinale") {
    return heroFinalePlacement(ctx, width, height);
  }
  return sequencePlacement(ctx, width, height);
}

export function buildEnhancedSafeZoneDebugInfo(
  sceneIndex: number,
  ctx: SceneSafeZoneContext
): SafeZoneDebugInfo {
  const heroPlacementInfo = ctx.placements.hero;
  const layerKinds: OverlayTemplateKind[] = ["headline", "title", "subtitle"];
  const layerZoneScoringDebug: NonNullable<SafeZoneDebugInfo["layerZoneScoringDebug"]> = {};

  for (const kind of layerKinds) {
    const selected = ctx.placements[kind];
    const topZones = ["TOP_LEFT", "TOP_CENTER", "TOP_RIGHT"] as const;
    const centerZones = ["CENTER_LEFT", "CENTER", "CENTER_RIGHT"] as const;
    const candidates = ctx.enhanced.zones
      .map((zone) => {
        const overlapPct = objectOverlapPercent(zone.zoneId, ctx.detection.combinedAvoidBoxes);
        let rejected: string | undefined;
        if (overlapPct > 15) {
          rejected = "object_overlap";
        } else if (zone.zoneId.startsWith("BOTTOM_") && kind !== "subtitle") {
          const bestUpper = [...topZones, ...centerZones]
            .map((id) => ctx.enhanced.zones.find((z) => z.zoneId === id))
            .filter(Boolean)
            .sort((a, b) => (b!.score - a!.score))[0];
          if (bestUpper && bestUpper.score >= zone.score * 0.55) {
            rejected = "upper_zone_preferred";
          }
        }
        return {
          zoneId: zone.zoneId,
          score: zone.score,
          edgeDensity: zone.edgeDensity,
          contrast: zone.contrast,
          objectOverlapPct: overlapPct,
          rejected,
        };
      })
      .sort((a, b) => b.score - a.score);

    layerZoneScoringDebug[kind] = {
      selectedZone: selected.zoneId,
      reason: selected.placementReason,
      candidates: candidates.slice(0, 5),
      bottomChosenBecause:
        selected.zoneId.startsWith("BOTTOM_") ?
          "bottom_zone_highest_object_free_score_after_penalties"
        : undefined,
    };
  }

  return {
    sceneIndex,
    zones: ctx.enhanced.zones,
    v1Zones: ctx.v1.zones,
    selected: {
      hero: ctx.placements.hero.zoneId,
      scene: ctx.placements.scene.zoneId,
      sequence: ctx.placements.sequence.zoneId,
      headline: ctx.placements.headline.zoneId,
      title: ctx.placements.title.zoneId,
      subtitle: ctx.placements.subtitle.zoneId,
    },
    layerPlacementReasons: {
      headline: ctx.placements.headline.placementReason,
      title: ctx.placements.title.placementReason,
      subtitle: ctx.placements.subtitle.placementReason,
    },
    layerZoneScoringDebug,
    confidence: ctx.enhanced.confidence,
    intent: ctx.intent,
    placementReason: heroPlacementInfo.placementReason,
    fallbackReason: ctx.fallbackReason,
    mediaPipeCount: ctx.detection.mediaPipeDetections.length,
    objectCount: ctx.detection.objectDetections.length,
    failedDetectors: ctx.detection.failedDetectors,
    adminVisionNote: !isObjectSafeZonesEnabled() ?
      "Object-aware placement off (set HC_ENABLE_OBJECT_SAFE_ZONES=1 and run npm run setup:vision-models -- --include-object-detector on the worker)."
    : ctx.detection.objectDetections.length === 0 &&
        isObjectSafeZonesEnabled() &&
        ctx.detection.failedDetectors.some((d) => d.includes("object")) ?
      "Object detector enabled but no detections on this frame — using Safe Zone V1 placement."
    : undefined,
  };
}
