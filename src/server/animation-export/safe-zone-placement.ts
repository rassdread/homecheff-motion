/**
 * Safe Zone V1 — placement scoring on extracted scene frames (Sharp only, no AI).
 */

import path from "node:path";
import type { AdaptiveOverlayTheme } from "@/server/animation-export/adaptive-overlay-style";

export const SAFE_ZONE_IDS = [
  "TOP_LEFT",
  "TOP_CENTER",
  "TOP_RIGHT",
  "CENTER_LEFT",
  "CENTER",
  "CENTER_RIGHT",
  "BOTTOM_LEFT",
  "BOTTOM_CENTER",
  "BOTTOM_RIGHT",
] as const;

export type SafeZoneId = (typeof SAFE_ZONE_IDS)[number];

export type SafeZoneScore = {
  zoneId: SafeZoneId;
  score: number;
  luma: number;
  contrast: number;
  edgeDensity: number;
};

export type SafeZoneAnalysis = {
  zones: SafeZoneScore[];
  bestTopZone: SafeZoneId;
  bestCenterZone: SafeZoneId;
  bestBottomZone: SafeZoneId;
  /** Best zone across all rows (V5+). */
  bestOverallZone?: SafeZoneId;
  confidence: number;
};

export type SafeZonePlacement = {
  zoneId: SafeZoneId;
  anchorX: number;
  anchorY: number;
  textWidthFraction: number;
  zoneScore: number;
};

export type SafeZoneDebugInfo = {
  sceneIndex: number;
  zones: SafeZoneScore[];
  v1Zones?: SafeZoneScore[];
  selected: {
    hero: SafeZoneId;
    scene: SafeZoneId;
    sequence: SafeZoneId;
    headline?: SafeZoneId;
    title?: SafeZoneId;
    subtitle?: SafeZoneId;
  };
  layerPlacementReasons?: {
    headline?: string;
    title?: string;
    subtitle?: string;
  };
  layerPositionDebug?: Record<
    string,
    {
      zoneId: string;
      x: number;
      y: number;
      clampedX: number;
      clampedY: number;
      estimatedTextWidthPx: number;
      reason: string;
      groupedWithTitle?: boolean;
      layout?: string;
    }
  >;
  layerZoneScoringDebug?: Record<
    string,
    {
      selectedZone: SafeZoneId;
      reason: string;
      candidates: Array<{
        zoneId: SafeZoneId;
        score: number;
        edgeDensity: number;
        contrast: number;
        objectOverlapPct: number;
        rejected?: string;
      }>;
      bottomChosenBecause?: string;
    }
  >;
  confidence: number;
  intent?: string;
  placementReason?: string;
  fallbackReason?: string;
  mediaPipeCount?: number;
  objectCount?: number;
  failedDetectors?: string[];
  /** Admin-only note when object-aware placement is off or unavailable. */
  adminVisionNote?: string;
};

/** TikTok / Reels safe margins (fraction of frame). */
export const SAFE_AREA_MARGIN_H = 0.06;
export const SAFE_AREA_MARGIN_V = 0.05;

const TOP_ZONES: SafeZoneId[] = ["TOP_LEFT", "TOP_CENTER", "TOP_RIGHT"];
const CENTER_ZONES: SafeZoneId[] = ["CENTER_LEFT", "CENTER", "CENTER_RIGHT"];
const BOTTOM_ZONES: SafeZoneId[] = ["BOTTOM_LEFT", "BOTTOM_CENTER", "BOTTOM_RIGHT"];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function zoneRow(zoneId: SafeZoneId): "top" | "center" | "bottom" {
  if (zoneId.startsWith("TOP_")) {
    return "top";
  }
  if (zoneId.startsWith("BOTTOM_")) {
    return "bottom";
  }
  return "center";
}

function bestInRow(zones: SafeZoneScore[], ids: SafeZoneId[]): SafeZoneId {
  let best = ids[0]!;
  let bestScore = -1;
  for (const id of ids) {
    const row = zones.find((z) => z.zoneId === id);
    const score = row?.score ?? 0;
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
}

function computeEdgeDensity(lumas: number[], zoneW: number, zoneH: number): number {
  if (zoneW < 2 || zoneH < 2 || lumas.length < zoneW * zoneH) {
    return 0;
  }
  let sum = 0;
  let count = 0;
  for (let y = 0; y < zoneH - 1; y += 1) {
    for (let x = 0; x < zoneW - 1; x += 1) {
      const i = y * zoneW + x;
      const right = lumas[i + 1] ?? 0;
      const down = lumas[i + zoneW] ?? 0;
      const cur = lumas[i] ?? 0;
      sum += Math.abs(cur - right) + Math.abs(cur - down);
      count += 2;
    }
  }
  return count > 0 ? sum / count : 0;
}

function scoreZoneMetrics(params: {
  lumas: number[];
  rs: number[];
  gs: number[];
  bs: number[];
  rowIndex: number;
}): Omit<SafeZoneScore, "zoneId"> {
  const { lumas, rs, gs, bs, rowIndex } = params;
  const n = Math.max(1, lumas.length);
  const meanLuma = lumas.reduce((a, b) => a + b, 0) / n;
  let variance = 0;
  for (const l of lumas) {
    variance += (l - meanLuma) ** 2;
  }
  const contrast = Math.sqrt(variance / n);

  const zoneW = Math.max(1, Math.round(Math.sqrt(n)));
  const zoneH = Math.max(1, Math.ceil(n / zoneW));
  const edgeDensity = computeEdgeDensity(lumas, zoneW, zoneH);

  const meanR = rs.reduce((a, b) => a + b, 0) / n;
  const meanG = gs.reduce((a, b) => a + b, 0) / n;
  const meanB = bs.reduce((a, b) => a + b, 0) / n;
  let colorVariance = 0;
  for (let i = 0; i < n; i += 1) {
    colorVariance +=
      ((rs[i] ?? 0) - meanR) ** 2 +
      ((gs[i] ?? 0) - meanG) ** 2 +
      ((bs[i] ?? 0) - meanB) ** 2;
  }
  colorVariance = Math.sqrt(colorVariance / (n * 3));

  const quietBonus = clamp(100 - contrast * 1.1, 0, 55);
  const edgePenalty = edgeDensity * 1.15;
  const clutterPenalty = colorVariance * 0.55;
  const openSpaceBonus = contrast < 25 ? 12 : contrast < 40 ? 6 : 0;
  const verticalBonus = rowIndex === 0 ? 10 : rowIndex === 1 ? 5 : -8;
  const lowerThirdPenalty = rowIndex === 2 ? edgeDensity * 0.35 + colorVariance * 0.12 : 0;
  const score = clamp(
    quietBonus + openSpaceBonus + verticalBonus - edgePenalty - clutterPenalty - lowerThirdPenalty,
    0,
    100
  );

  return {
    score,
    luma: meanLuma,
    contrast,
    edgeDensity,
  };
}

/** Score 3×3 zones from raw RGBA buffer (reuses adaptive sample dimensions). */
export function analyzeSafeZonesFromBuffer(
  data: Buffer,
  width: number,
  height: number,
  channels = 4
): SafeZoneAnalysis {
  const colW = Math.floor(width / 3);
  const rowH = Math.floor(height / 3);
  const zones: SafeZoneScore[] = [];

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const zoneId = SAFE_ZONE_IDS[row * 3 + col]!;
      const x0 = col * colW;
      const y0 = row * rowH;
      const x1 = col === 2 ? width : x0 + colW;
      const y1 = row === 2 ? height : y0 + rowH;

      const lumas: number[] = [];
      const rs: number[] = [];
      const gs: number[] = [];
      const bs: number[] = [];

      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const i = (y * width + x) * channels;
          const r = data[i] ?? 0;
          const g = data[i + 1] ?? 0;
          const b = data[i + 2] ?? 0;
          lumas.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
          rs.push(r);
          gs.push(g);
          bs.push(b);
        }
      }

      zones.push({
        zoneId,
        ...scoreZoneMetrics({ lumas, rs, gs, bs, rowIndex: row }),
      });
    }
  }

  const bestTopZone = bestInRow(zones, TOP_ZONES);
  const bestCenterZone = bestInRow(zones, CENTER_ZONES);
  const bestBottomZone = bestInRow(zones, BOTTOM_ZONES);
  const topScore = zones.find((z) => z.zoneId === bestTopZone)?.score ?? 0;
  const confidence = Math.round(clamp(topScore, 0, 100));

  return {
    zones,
    bestTopZone,
    bestCenterZone,
    bestBottomZone,
    confidence,
  };
}

export async function analyzeSafeZonesFromImage(imagePath: string): Promise<SafeZoneAnalysis> {
  const sharp = (await import("sharp")).default;
  const { data, info } = await sharp(imagePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return analyzeSafeZonesFromBuffer(data, info.width, info.height, info.channels);
}

export function placementForZone(
  zoneId: SafeZoneId,
  zoneScore: number,
  width: number,
  height: number
): SafeZonePlacement {
  const safeLeft = width * SAFE_AREA_MARGIN_H;
  const safeRight = width * (1 - SAFE_AREA_MARGIN_H);
  const safeTop = height * SAFE_AREA_MARGIN_V;
  const safeBottom = height * (1 - SAFE_AREA_MARGIN_V);
  const safeW = safeRight - safeLeft;
  const safeH = safeBottom - safeTop;

  const col = zoneId.includes("_LEFT") ? 0 : zoneId.includes("_RIGHT") ? 2 : 1;
  const row = zoneRow(zoneId);

  const cellW = safeW / 3;
  const cellH = safeH / 3;
  const rowIndex = row === "top" ? 0 : row === "center" ? 1 : 2;

  const anchorX = Math.round(safeLeft + col * cellW + cellW / 2);
  const anchorY = Math.round(safeTop + rowIndex * cellH + cellH / 2);

  const textWidthFraction =
    zoneScore >= 70 ? 0.82
    : zoneScore >= 45 ? 0.72
    : 0.62;

  return {
    zoneId,
    anchorX,
    anchorY,
    textWidthFraction,
    zoneScore,
  };
}

export function heroPlacement(analysis: SafeZoneAnalysis, width: number, height: number): SafeZonePlacement {
  const zone = analysis.zones.find((z) => z.zoneId === analysis.bestTopZone)!;
  return placementForZone(analysis.bestTopZone, zone.score, width, height);
}

export function scenePlacement(analysis: SafeZoneAnalysis, width: number, height: number): SafeZonePlacement {
  const zone = analysis.zones.find((z) => z.zoneId === analysis.bestBottomZone)!;
  return placementForZone(analysis.bestBottomZone, zone.score, width, height);
}

export function headlinePlacement(
  analysis: SafeZoneAnalysis,
  width: number,
  height: number
): SafeZonePlacement {
  return heroPlacement(analysis, width, height);
}

export function titleLayerPlacement(
  analysis: SafeZoneAnalysis,
  width: number,
  height: number
): SafeZonePlacement {
  const zoneId = analysis.bestOverallZone ?? analysis.bestCenterZone;
  const zone = analysis.zones.find((z) => z.zoneId === zoneId)!;
  return placementForZone(zoneId, zone.score, width, height);
}

export function subtitleLayerPlacement(
  analysis: SafeZoneAnalysis,
  width: number,
  height: number
): SafeZonePlacement {
  const zoneId = analysis.bestCenterZone ?? analysis.bestOverallZone ?? analysis.bestTopZone;
  const zone = analysis.zones.find((z) => z.zoneId === zoneId)!;
  return placementForZone(zoneId, zone.score, width, height);
}

export function sequencePlacement(
  analysis: SafeZoneAnalysis,
  width: number,
  height: number
): SafeZonePlacement {
  const zone = analysis.zones.find((z) => z.zoneId === analysis.bestCenterZone)!;
  return placementForZone(analysis.bestCenterZone, zone.score, width, height);
}

export function heroFinalePlacement(
  analysis: SafeZoneAnalysis,
  width: number,
  height: number
): SafeZonePlacement {
  const topScore = analysis.zones.find((z) => z.zoneId === analysis.bestTopZone)?.score ?? 0;
  const centerScore = analysis.zones.find((z) => z.zoneId === analysis.bestCenterZone)?.score ?? 0;
  const zoneId = topScore >= centerScore ? analysis.bestTopZone : analysis.bestCenterZone;
  const zone = analysis.zones.find((z) => z.zoneId === zoneId)!;
  return placementForZone(zoneId, zone.score, width, height);
}

/** Boost backdrop when the chosen zone is still visually busy. */
export function enhanceThemeForZonePlacement(
  theme: AdaptiveOverlayTheme,
  zoneScore: number
): AdaptiveOverlayTheme {
  if (zoneScore >= 50) {
    return theme;
  }
  return {
    ...theme,
    isBusy: true,
    useBackdrop: true,
    backdropOpacity: Math.max(theme.backdropOpacity, 0.52),
    outline: Math.max(theme.outline, 6),
    shadow: Math.max(theme.shadow, 4),
  };
}

export function buildSafeZoneDebugInfo(
  sceneIndex: number,
  analysis: SafeZoneAnalysis
): SafeZoneDebugInfo {
  return {
    sceneIndex,
    zones: analysis.zones,
    selected: {
      hero: analysis.bestTopZone,
      scene: analysis.bestBottomZone,
      sequence: analysis.bestCenterZone,
    },
    confidence: analysis.confidence,
  };
}

export async function writeSafeZoneDebugOverlay(params: {
  sampleImagePath: string;
  analysis: SafeZoneAnalysis;
  outputPath: string;
}): Promise<void> {
  const sharp = (await import("sharp")).default;
  const meta = await sharp(params.sampleImagePath).metadata();
  const width = meta.width ?? 64;
  const height = meta.height ?? 64;
  const colW = Math.floor(width / 3);
  const rowH = Math.floor(height / 3);

  const rects: string[] = [];
  for (const zone of params.analysis.zones) {
    const row = Math.floor(SAFE_ZONE_IDS.indexOf(zone.zoneId) / 3);
    const col = SAFE_ZONE_IDS.indexOf(zone.zoneId) % 3;
    const x = col * colW;
    const y = row * rowH;
    const opacity = clamp(zone.score / 100, 0.15, 0.85);
    rects.push(
      `<rect x="${x}" y="${y}" width="${colW}" height="${rowH}" fill="rgba(0,200,120,${opacity.toFixed(2)})"/>`,
      `<text x="${x + 2}" y="${y + 10}" font-size="8" fill="white">${zone.zoneId.slice(0, 3)} ${Math.round(zone.score)}</text>`
    );
  }

  const svg = Buffer.from(
    `<svg width="${width}" height="${height}">${rects.join("")}</svg>`
  );
  await sharp(params.sampleImagePath)
    .composite([{ input: svg, top: 0, left: 0 }])
    .png()
    .toFile(params.outputPath);
}

export function isSafeZoneDebugEnabled(): boolean {
  return process.env.HC_SAFE_ZONE_DEBUG === "1" || process.env.HC_SAFE_ZONE_DEBUG === "true";
}

export async function maybeWriteSafeZoneDebug(params: {
  workDir: string;
  sceneIndex: number;
  samplePath: string;
  analysis: SafeZoneAnalysis;
}): Promise<void> {
  if (!isSafeZoneDebugEnabled()) {
    return;
  }
  const out = path.join(params.workDir, `safe-zone-debug-${params.sceneIndex}.png`);
  await writeSafeZoneDebugOverlay({
    sampleImagePath: params.samplePath,
    analysis: params.analysis,
    outputPath: out,
  }).catch(() => undefined);
}
