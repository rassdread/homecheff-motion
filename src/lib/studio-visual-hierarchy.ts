/**
 * Studio V43 — visual hierarchy scoring from placement plans.
 */

import type {
  BrandPlacement,
  CharacterPlacement,
  PlacementWarning,
  PropPlacement,
  VisualHierarchySummary,
} from "@/types/studio-asset-placement";

export function scorePlacementPriority(params: {
  scale: CharacterPlacement["scale"];
  depth: CharacterPlacement["depth"];
  isPrimary: boolean;
}): number {
  let score = params.isPrimary ? 90 : 50;
  if (params.scale === "HERO") {
    score += 10;
  } else if (params.scale === "LARGE") {
    score += 6;
  } else if (params.scale === "SMALL") {
    score -= 12;
  }
  if (params.depth === "FOREGROUND") {
    score += 8;
  } else if (params.depth === "BACKGROUND") {
    score -= 15;
  }
  return Math.max(0, Math.min(100, score));
}

export function buildVisualHierarchySummary(params: {
  characterPlacements: CharacterPlacement[];
  propPlacements: PropPlacement[];
  brandPlacements: BrandPlacement[];
}): VisualHierarchySummary {
  const sorted = [...params.characterPlacements].sort(
    (a, b) => b.placementPriority - a.placementPriority
  );
  const primary = sorted[0] ?? null;
  const secondary = sorted[1] ?? null;
  const heroCount = params.characterPlacements.filter(
    (p) => p.scale === "HERO" || p.scale === "LARGE"
  ).length;
  const foregroundLoad =
    params.characterPlacements.filter((p) => p.depth === "FOREGROUND").length +
    params.propPlacements.filter((p) => p.depth === "FOREGROUND").length +
    params.brandPlacements.filter((p) => p.depth === "FOREGROUND").length;
  const clutterScore = Math.min(100, Math.max(0, foregroundLoad * 18));
  const emptyScore =
    params.characterPlacements.length === 0 && params.propPlacements.length === 0
      ? 80
      : params.characterPlacements.length === 0
        ? 40
        : 0;

  let summaryKey = "studio.placement.hierarchy.balanced";
  if (heroCount >= 3) {
    summaryKey = "studio.placement.hierarchy.tooManyHeroes";
  } else if (clutterScore >= 72) {
    summaryKey = "studio.placement.hierarchy.cluttered";
  } else if (emptyScore >= 40) {
    summaryKey = "studio.placement.hierarchy.empty";
  } else if (primary) {
    summaryKey = "studio.placement.hierarchy.focused";
  }

  return {
    primarySubject: primary?.characterName ?? null,
    secondarySubject: secondary?.characterName ?? null,
    supportingCount: Math.max(0, params.characterPlacements.length - (primary ? 1 : 0)),
    heroCount,
    clutterScore,
    emptyScore,
    summaryKey,
  };
}

export function detectHierarchyWarnings(params: {
  sceneId: string;
  characterPlacements: CharacterPlacement[];
  propPlacements: PropPlacement[];
  brandPlacements: BrandPlacement[];
}): PlacementWarning[] {
  const warnings: PlacementWarning[] = [];
  const heroes = params.characterPlacements.filter(
    (p) => p.scale === "HERO" || (p.scale === "LARGE" && p.depth === "FOREGROUND")
  );

  if (heroes.length >= 3) {
    warnings.push({
      code: "too_many_heroes",
      severity: "warning",
      messageKey: "studio.placement.warning.tooManyHeroes",
      sceneId: params.sceneId,
      params: { count: heroes.length },
    });
  }

  const foregroundCount =
    params.characterPlacements.filter((p) => p.depth === "FOREGROUND").length +
    params.propPlacements.filter((p) => p.depth === "FOREGROUND").length +
    params.brandPlacements.filter((p) => p.depth === "FOREGROUND").length;

  if (foregroundCount >= 5) {
    warnings.push({
      code: "visual_clutter",
      severity: "warning",
      messageKey: "studio.placement.warning.visualClutter",
      sceneId: params.sceneId,
      params: { count: foregroundCount },
    });
  }

  if (params.characterPlacements.length === 0 && params.propPlacements.length === 0) {
    warnings.push({
      code: "empty_composition",
      severity: "warning",
      messageKey: "studio.placement.warning.emptyComposition",
      sceneId: params.sceneId,
    });
  }

  return warnings;
}
