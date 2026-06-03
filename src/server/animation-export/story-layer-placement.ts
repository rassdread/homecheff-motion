/**
 * Story Mode layered text — reading flow, title+subtitle grouping, ASS safe clamping.
 */

import { estimateTextLineWidthPx } from "@/server/animation-export/adaptive-typography";
import type { ObjectAwarePlacement, OverlayTemplateKind } from "@/server/animation-export/object-aware-placement";
import {
  bandAnchorY,
  defaultBandForSceneLayer,
  type StoryLayoutBand,
} from "@/server/animation-export/story-overlay-layout-bands";
import {
  placementForZone,
  SAFE_AREA_MARGIN_H,
  SAFE_AREA_MARGIN_V,
  type SafeZoneId,
  type SafeZonePlacement,
} from "@/server/animation-export/safe-zone-placement";

/** ASS alignment used in story overlay styles. */
export const STORY_HEADLINE_ASS_ALIGNMENT = 8; // top center
export const STORY_TITLE_ASS_ALIGNMENT = 5; // middle center
export const STORY_SUBTITLE_ASS_ALIGNMENT = 5;

const SUBTITLE_HORIZONTAL_GAP_PX = 28;
const MIN_LINE_HEIGHT_RATIO = 1.18;

export type StoryLayerPositionDebug = {
  zoneId: SafeZoneId;
  x: number;
  y: number;
  clampedX: number;
  clampedY: number;
  estimatedTextWidthPx: number;
  estimatedBlockHeightPx: number;
  reason: string;
  groupedWithTitle: boolean;
  objectAvoidanceUsed: boolean;
  layout?: "below" | "right" | "band";
  layoutBand?: StoryLayoutBand;
};

export type StoryLayerPositions = {
  headline?: StoryLayerPositionDebug;
  title?: StoryLayerPositionDebug;
  subtitle?: StoryLayerPositionDebug;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function safeBounds(width: number, height: number): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  return {
    left: width * SAFE_AREA_MARGIN_H,
    right: width * (1 - SAFE_AREA_MARGIN_H),
    top: height * SAFE_AREA_MARGIN_V,
    bottom: height * (1 - SAFE_AREA_MARGIN_V),
  };
}

function maxLineWidth(lines: string[], fontSize: number): number {
  if (lines.length === 0) {
    return 0;
  }
  return Math.max(...lines.map((line) => estimateTextLineWidthPx(line, fontSize)));
}

function blockHeight(lines: string[], fontSize: number): number {
  if (lines.length === 0) {
    return 0;
  }
  const lineHeight = Math.round(fontSize * MIN_LINE_HEIGHT_RATIO);
  return lines.length * lineHeight;
}

/** Compute text bounding box from ASS anchor + alignment. */
export function assTextBounds(params: {
  x: number;
  y: number;
  alignment: number;
  lines: string[];
  fontSize: number;
}): { left: number; right: number; top: number; bottom: number } {
  const widthPx = maxLineWidth(params.lines, params.fontSize);
  const heightPx = blockHeight(params.lines, params.fontSize);
  const halfW = widthPx / 2;

  if (params.alignment === STORY_HEADLINE_ASS_ALIGNMENT) {
    return {
      left: params.x - halfW,
      right: params.x + halfW,
      top: params.y,
      bottom: params.y + heightPx,
    };
  }
  if (params.alignment === STORY_SUBTITLE_ASS_ALIGNMENT || params.alignment === STORY_TITLE_ASS_ALIGNMENT) {
    const halfH = heightPx / 2;
    return {
      left: params.x - halfW,
      right: params.x + halfW,
      top: params.y - halfH,
      bottom: params.y + halfH,
    };
  }
  // bottom-center (legacy alignment 2)
  return {
    left: params.x - halfW,
    right: params.x + halfW,
    top: params.y - heightPx,
    bottom: params.y,
  };
}

/** Clamp ASS anchor so full text block + backdrop stays inside safe margins. */
export function clampAssAnchor(params: {
  x: number;
  y: number;
  alignment: number;
  lines: string[];
  fontSize: number;
  frameWidth: number;
  frameHeight: number;
  backdropPadPx?: number;
}): { x: number; y: number; clampedX: number; clampedY: number; estimatedTextWidthPx: number; estimatedBlockHeightPx: number } {
  const pad = params.backdropPadPx ?? 8;
  const safe = safeBounds(params.frameWidth, params.frameHeight);
  let x = params.x;
  let y = params.y;
  const estimatedTextWidthPx = maxLineWidth(params.lines, params.fontSize);
  const estimatedBlockHeightPx = blockHeight(params.lines, params.fontSize);
  const maxAllowedWidth = safe.right - safe.left - pad * 2;

  if (estimatedTextWidthPx > maxAllowedWidth) {
    x = Math.round((safe.left + safe.right) / 2);
  }

  for (let i = 0; i < 4; i += 1) {
    const bounds = assTextBounds({
      x,
      y,
      alignment: params.alignment,
      lines: params.lines,
      fontSize: params.fontSize,
    });
    if (bounds.left - pad < safe.left) {
      x += safe.left + pad - bounds.left;
    }
    if (bounds.right + pad > safe.right) {
      x -= bounds.right + pad - safe.right;
    }
    if (bounds.top - pad < safe.top) {
      y += safe.top + pad - bounds.top;
    }
    if (bounds.bottom + pad > safe.bottom) {
      y -= bounds.bottom + pad - safe.bottom;
    }
  }

  x = Math.round(clamp(x, safe.left, safe.right));
  y = Math.round(clamp(y, safe.top, safe.bottom));

  return {
    x: params.x,
    y: params.y,
    clampedX: x,
    clampedY: y,
    estimatedTextWidthPx,
    estimatedBlockHeightPx,
  };
}

function objectAvoidanceUsed(placement: ObjectAwarePlacement): boolean {
  return placement.placementReason !== "safe_zone_v1_fallback";
}

/**
 * After per-template object-aware resolution, group title+subtitle and enforce reading order zones.
 */
export function applyStoryReadingFlowToPlacements(
  placements: Record<OverlayTemplateKind, ObjectAwarePlacement>
): Record<OverlayTemplateKind, ObjectAwarePlacement> {
  const headline = placements.headline;
  const title = placements.title;
  const subtitle = { ...placements.subtitle };

  if (title && subtitle) {
    subtitle.anchorX = title.anchorX;
    subtitle.textWidthFraction = title.textWidthFraction;
    subtitle.placementReason = "grouped_with_title";
    subtitle.confidence = title.confidence;
  }

  return { ...placements, subtitle };
}

function canPlaceSubtitleRightOfTitle(params: {
  titleLines: string[];
  subtitleLines: string[];
  titleFontSize: number;
  subtitleFontSize: number;
  frameWidth: number;
  titleZoneId: SafeZoneId;
}): boolean {
  if (params.titleLines.length !== 1 || params.subtitleLines.length !== 1) {
    return false;
  }
  if (params.titleZoneId.includes("_LEFT") || params.titleZoneId.includes("_RIGHT")) {
    return false;
  }
  const safeW = params.frameWidth * (1 - 2 * SAFE_AREA_MARGIN_H);
  const titleW = estimateTextLineWidthPx(params.titleLines[0]!, params.titleFontSize);
  const subW = estimateTextLineWidthPx(params.subtitleLines[0]!, params.subtitleFontSize);
  return titleW + subW + SUBTITLE_HORIZONTAL_GAP_PX <= safeW * 0.88;
}

/** Resolve clamped pixel anchors using vertical layout bands (headline → title → subtitle). */
export function resolveStoryLayerPositions(params: {
  placements: Record<OverlayTemplateKind, ObjectAwarePlacement>;
  width: number;
  height: number;
  headlineLines: string[];
  titleLines: string[];
  subtitleLines: string[];
  headlineFontSize: number;
  titleFontSize: number;
  subtitleFontSize: number;
}): StoryLayerPositions {
  const {
    placements,
    width,
    height,
    headlineLines,
    titleLines,
    subtitleLines,
    headlineFontSize,
    titleFontSize,
    subtitleFontSize,
  } = params;

  const out: StoryLayerPositions = {};
  const headlinePlacement = placements.headline;
  const titlePlacement = placements.title;
  const subtitlePlacement = placements.subtitle;

  if (headlineLines.length > 0 && headlinePlacement) {
    const headlineBand = defaultBandForSceneLayer("headline");
    const headlineBlockH = blockHeight(headlineLines, headlineFontSize);
    const headlineY = bandAnchorY(headlineBand, height);

    const clamped = clampAssAnchor({
      x: headlinePlacement.anchorX,
      y: headlineY,
      alignment: STORY_HEADLINE_ASS_ALIGNMENT,
      lines: headlineLines,
      fontSize: headlineFontSize,
      frameWidth: width,
      frameHeight: height,
    });

    out.headline = {
      zoneId: headlinePlacement.zoneId,
      x: clamped.x,
      y: clamped.y,
      clampedX: clamped.clampedX,
      clampedY: clamped.clampedY,
      estimatedTextWidthPx: clamped.estimatedTextWidthPx,
      estimatedBlockHeightPx: clamped.estimatedBlockHeightPx,
      reason: headlinePlacement.placementReason,
      groupedWithTitle: false,
      objectAvoidanceUsed: objectAvoidanceUsed(headlinePlacement),
      layout: "band",
      layoutBand: headlineBand,
    };
  }

  if (titleLines.length > 0 && titlePlacement) {
    const titleBand = defaultBandForSceneLayer("title");
    const titleY = bandAnchorY(titleBand, height);

    const titleClamped = clampAssAnchor({
      x: titlePlacement.anchorX,
      y: titleY,
      alignment: STORY_TITLE_ASS_ALIGNMENT,
      lines: titleLines,
      fontSize: titleFontSize,
      frameWidth: width,
      frameHeight: height,
    });

    out.title = {
      zoneId: titlePlacement.zoneId,
      x: titleClamped.x,
      y: titleClamped.y,
      clampedX: titleClamped.clampedX,
      clampedY: titleClamped.clampedY,
      estimatedTextWidthPx: titleClamped.estimatedTextWidthPx,
      estimatedBlockHeightPx: titleClamped.estimatedBlockHeightPx,
      reason: titlePlacement.placementReason,
      groupedWithTitle: false,
      objectAvoidanceUsed: objectAvoidanceUsed(titlePlacement),
      layout: "band",
      layoutBand: titleBand,
    };

    if (subtitleLines.length > 0 && subtitlePlacement) {
      const useRightLayout = canPlaceSubtitleRightOfTitle({
        titleLines,
        subtitleLines,
        titleFontSize,
        subtitleFontSize,
        frameWidth: width,
        titleZoneId: titlePlacement.zoneId,
      });

      let subtitleBand: StoryLayoutBand =
        headlineLines.length > 0 ? "lower_middle" : defaultBandForSceneLayer("subtitle");
      if (subtitleBand === titleBand) {
        subtitleBand = "lower_middle";
      }

      let subtitleX = titleClamped.clampedX;
      let subtitleY = bandAnchorY(subtitleBand, height);

      if (useRightLayout) {
        const titleW = maxLineWidth(titleLines, titleFontSize);
        const subW = maxLineWidth(subtitleLines, subtitleFontSize);
        subtitleX = Math.round(titleClamped.clampedX + titleW / 2 + SUBTITLE_HORIZONTAL_GAP_PX + subW / 2);
        subtitleY = titleClamped.clampedY;
        subtitleBand = titleBand;
      }

      const subtitleClamped = clampAssAnchor({
        x: subtitleX,
        y: subtitleY,
        alignment: STORY_SUBTITLE_ASS_ALIGNMENT,
        lines: subtitleLines,
        fontSize: subtitleFontSize,
        frameWidth: width,
        frameHeight: height,
      });

      out.subtitle = {
        zoneId: subtitlePlacement.zoneId,
        x: subtitleClamped.x,
        y: subtitleClamped.y,
        clampedX: subtitleClamped.clampedX,
        clampedY: subtitleClamped.clampedY,
        estimatedTextWidthPx: subtitleClamped.estimatedTextWidthPx,
        estimatedBlockHeightPx: subtitleClamped.estimatedBlockHeightPx,
        reason: useRightLayout ? "grouped_right_of_title" : "band_layout",
        groupedWithTitle: true,
        objectAvoidanceUsed: objectAvoidanceUsed(subtitlePlacement),
        layout: useRightLayout ? "right" : "band",
        layoutBand: subtitleBand,
      };
    }
  } else if (subtitleLines.length > 0 && subtitlePlacement) {
    const subtitleBand = defaultBandForSceneLayer("subtitle");
    const subtitleClamped = clampAssAnchor({
      x: subtitlePlacement.anchorX,
      y: bandAnchorY(subtitleBand, height),
      alignment: STORY_SUBTITLE_ASS_ALIGNMENT,
      lines: subtitleLines,
      fontSize: subtitleFontSize,
      frameWidth: width,
      frameHeight: height,
    });
    out.subtitle = {
      zoneId: subtitlePlacement.zoneId,
      x: subtitleClamped.x,
      y: subtitleClamped.y,
      clampedX: subtitleClamped.clampedX,
      clampedY: subtitleClamped.clampedY,
      estimatedTextWidthPx: subtitleClamped.estimatedTextWidthPx,
      estimatedBlockHeightPx: subtitleClamped.estimatedBlockHeightPx,
      reason: subtitlePlacement.placementReason,
      groupedWithTitle: false,
      objectAvoidanceUsed: objectAvoidanceUsed(subtitlePlacement),
      layout: "band",
      layoutBand: subtitleBand,
    };
  }

  return out;
}

const ALL_SAFE_ZONE_IDS = [
  "TOP_LEFT",
  "TOP_CENTER",
  "TOP_RIGHT",
  "CENTER_LEFT",
  "CENTER",
  "CENTER_RIGHT",
  "BOTTOM_LEFT",
  "BOTTOM_CENTER",
  "BOTTOM_RIGHT",
] as const satisfies readonly SafeZoneId[];

export type ExtraLinePosition = StoryLayerPositionDebug & { lineIndex: number };

/** Place extra lines in independent safe zones, avoiding headline/title/subtitle zones. */
export function resolveExtraLinePositions(params: {
  extraLines: string[];
  fontSize: number;
  width: number;
  height: number;
  occupiedZoneIds: SafeZoneId[];
  zoneScores?: Array<{ zoneId: SafeZoneId; score: number }>;
  minY?: number;
}): ExtraLinePosition[] {
  const occupied = new Set(params.occupiedZoneIds);
  const scoreMap = new Map(params.zoneScores?.map((row) => [row.zoneId, row.score]));
  const candidates = ALL_SAFE_ZONE_IDS.filter((zoneId) => !occupied.has(zoneId))
    .map((zoneId) => ({
      zoneId,
      score: scoreMap.get(zoneId) ?? 50,
    }))
    .sort((a, b) => b.score - a.score);

  const usedZones = new Set<SafeZoneId>();
  const results: ExtraLinePosition[] = [];

  params.extraLines.forEach((rawLine, lineIndex) => {
    const line = rawLine.trim();
    if (!line) {
      return;
    }
    const picked =
      candidates.find((candidate) => !usedZones.has(candidate.zoneId)) ??
      candidates[lineIndex % Math.max(1, candidates.length)];
    if (!picked) {
      return;
    }
    usedZones.add(picked.zoneId);

    const placement = placementForZone(picked.zoneId, picked.score, params.width, params.height);
    const blockH = blockHeight([line], params.fontSize);
    let y = placement.anchorY;
    if (params.minY != null) {
      y = Math.max(y, params.minY + blockH / 2);
    }

    const clamped = clampAssAnchor({
      x: placement.anchorX,
      y,
      alignment: STORY_TITLE_ASS_ALIGNMENT,
      lines: [line],
      fontSize: params.fontSize,
      frameWidth: params.width,
      frameHeight: params.height,
    });

    results.push({
      lineIndex,
      zoneId: picked.zoneId,
      x: clamped.x,
      y: clamped.y,
      clampedX: clamped.clampedX,
      clampedY: clamped.clampedY,
      estimatedTextWidthPx: clamped.estimatedTextWidthPx,
      estimatedBlockHeightPx: clamped.estimatedBlockHeightPx,
      reason: "extra_line_independent_zone",
      groupedWithTitle: false,
      objectAvoidanceUsed: false,
    });
  });

  return results;
}

/** Clamp hero/finale block anchors (top-center alignment). */
export function clampHeroLineAnchors(params: {
  cx: number;
  startY: number;
  lines: string[];
  mainFontSize: number;
  smallFontSize: number;
  mainLineIndex: number;
  width: number;
  height: number;
}): { cx: number; startY: number } {
  const lineHeights = params.lines.map((_, i) =>
    i === params.mainLineIndex ? params.mainFontSize + 18 : Math.round(params.smallFontSize * 0.63) + 14
  );
  const totalH = lineHeights.reduce((a, b) => a + b, 0);
  const maxW = Math.max(
    ...params.lines.map((line, i) =>
      estimateTextLineWidthPx(line, i === params.mainLineIndex ? params.mainFontSize : params.smallFontSize)
    )
  );

  const clamped = clampAssAnchor({
    x: params.cx,
    y: params.startY,
    alignment: STORY_HEADLINE_ASS_ALIGNMENT,
    lines: params.lines,
    fontSize: params.mainFontSize,
    frameWidth: params.width,
    frameHeight: params.height,
  });

  return { cx: clamped.clampedX, startY: clamped.clampedY };
}

export function pickPlacementFromLayer(
  layer: StoryLayerPositionDebug | undefined,
  fallback: SafeZonePlacement | undefined
): SafeZonePlacement | undefined {
  if (!layer) {
    return fallback;
  }
  return {
    zoneId: layer.zoneId,
    anchorX: layer.clampedX,
    anchorY: layer.clampedY,
    textWidthFraction: fallback?.textWidthFraction ?? 0.72,
    zoneScore: fallback?.zoneScore ?? 50,
  };
}
