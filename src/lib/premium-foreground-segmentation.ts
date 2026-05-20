import type { BakedTextMaskRegion } from "@/lib/baked-text-protection";
import type { PosterMotionLayerRole, PosterMotionRegionKind } from "@/lib/poster-motion-preserve";

export type SegmentationProvider = "heuristic" | "rembg" | "sam2" | "manual";

export const SEGMENTATION_PROVIDERS: readonly SegmentationProvider[] = [
  "heuristic",
  "rembg",
  "sam2",
  "manual",
] as const;

/** Detectable layer roles for foreground architecture. */
export type ForegroundSegmentRole =
  | PosterMotionLayerRole
  | "text"
  | "logo"
  | "ui_card"
  | "phone";

export type ManualForegroundRegion = {
  id: string;
  role: ForegroundSegmentRole;
  regionKind: PosterMotionRegionKind;
  bbox: BakedTextMaskRegion;
  featherPx?: number;
  locked?: boolean;
};

export type ForegroundSegmentLayer = {
  id: string;
  role: ForegroundSegmentRole;
  regionKind: PosterMotionRegionKind;
  bbox: BakedTextMaskRegion;
  confidence: number;
  zIndex: number;
  maskUrl?: string;
  cropUrl?: string;
  provider: SegmentationProvider;
};

export type ForegroundSegmentationSnapshot = {
  version: 2;
  sourceWidth: number;
  sourceHeight: number;
  provider: SegmentationProvider;
  layers: ForegroundSegmentLayer[];
};

const STATIC_ROLES: ForegroundSegmentRole[] = ["text", "logo", "ui_card", "floating_ui"];

export function isStaticPreserveRole(role: ForegroundSegmentRole): boolean {
  return STATIC_ROLES.includes(role) || role === "background_static";
}

export function defaultFeatherPx(role: ForegroundSegmentRole): number {
  if (role === "text" || role === "logo") {
    return 0;
  }
  if (role === "ui_card" || role === "phone") {
    return 2;
  }
  return 4;
}

/** Heuristic multi-layer layout: center subject + top/bottom text bands. */
export function buildHeuristicSegmentationLayers(
  width: number,
  height: number
): ForegroundSegmentLayer[] {
  const aspect = width / height;
  const subjectW = aspect >= 1 ? 0.52 : 0.78;
  const subjectH = aspect >= 1 ? 0.72 : 0.48;
  const layers: ForegroundSegmentLayer[] = [
    {
      id: "bg-static",
      role: "background_static",
      regionKind: "static_preserved",
      bbox: { x: 0, y: 0, width: 1, height: 1 },
      confidence: 1,
      zIndex: 0,
      provider: "heuristic",
    },
    {
      id: "text-top",
      role: "text",
      regionKind: "static_preserved",
      bbox: { x: 0.05, y: 0.02, width: 0.9, height: 0.14 },
      confidence: 0.75,
      zIndex: 10,
      provider: "heuristic",
    },
    {
      id: "text-bottom",
      role: "text",
      regionKind: "static_preserved",
      bbox: { x: 0.05, y: 0.84, width: 0.9, height: 0.12 },
      confidence: 0.7,
      zIndex: 11,
      provider: "heuristic",
    },
    {
      id: "logo-corner",
      role: "logo",
      regionKind: "static_preserved",
      bbox: { x: 0.04, y: 0.04, width: 0.22, height: 0.1 },
      confidence: 0.65,
      zIndex: 12,
      provider: "heuristic",
    },
    {
      id: "subject-main",
      role: "foreground_mascot",
      regionKind: "animated",
      bbox: {
        x: (1 - subjectW) / 2,
        y: (1 - subjectH) / 2 + 0.04,
        width: subjectW,
        height: subjectH,
      },
      confidence: 0.85,
      zIndex: 5,
      provider: "heuristic",
    },
  ];
  return layers;
}

export function mergeManualRegions(
  base: ForegroundSegmentLayer[],
  manual: ManualForegroundRegion[]
): ForegroundSegmentLayer[] {
  if (!manual.length) {
    return base;
  }
  const manualLayers: ForegroundSegmentLayer[] = manual.map((m, i) => ({
    id: m.id || `manual-${i}`,
    role: m.role,
    regionKind: m.locked || isStaticPreserveRole(m.role) ? "static_preserved" : "animated",
    bbox: m.bbox,
    confidence: 1,
    zIndex: 20 + i,
    provider: "manual" as const,
  }));
  return [...base.filter((l) => !manualLayers.some((m) => m.role === l.role)), ...manualLayers];
}

export function parseManualForegroundRegions(raw: unknown): ManualForegroundRegion[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: ManualForegroundRegion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const o = item as Record<string, unknown>;
    const role = typeof o.role === "string" ? o.role.trim() : "";
    const bbox = o.bbox as BakedTextMaskRegion | undefined;
    if (!role || !bbox || typeof bbox.x !== "number") {
      continue;
    }
    out.push({
      id: typeof o.id === "string" ? o.id : `manual-${out.length}`,
      role: role as ForegroundSegmentRole,
      regionKind: o.regionKind === "animated" ? "animated" : "static_preserved",
      bbox,
      featherPx: typeof o.featherPx === "number" ? o.featherPx : undefined,
      locked: o.locked === true,
    });
  }
  return out;
}

export function segmentationProviderAvailable(provider: SegmentationProvider): boolean {
  if (provider === "rembg") {
    return Boolean(process.env.REMBG_API_URL?.trim());
  }
  if (provider === "sam2") {
    return Boolean(process.env.SAM2_SEGMENTATION_URL?.trim());
  }
  return true;
}

export function resolveSegmentationProvider(requested: SegmentationProvider): SegmentationProvider {
  if (requested === "sam2" && segmentationProviderAvailable("sam2")) {
    return "sam2";
  }
  if (requested === "rembg" && segmentationProviderAvailable("rembg")) {
    return "rembg";
  }
  if (requested === "manual") {
    return "manual";
  }
  return "heuristic";
}

/** Subject priority for animation emphasis (higher = animate first). */
export const SUBJECT_PRIORITY_RANK: Record<ForegroundSegmentRole, number> = {
  foreground_mascot: 100,
  foreground_character: 95,
  foreground_hand: 90,
  headline_object: 85,
  foreground_prop: 80,
  phone: 40,
  ui_card: 30,
  logo: 20,
  text: 10,
  floating_ui: 15,
  background_static: 0,
  particle_fx: 50,
  generated_fx: 55,
};

export function sortLayersBySubjectPriority(
  layers: ForegroundSegmentLayer[]
): ForegroundSegmentLayer[] {
  return [...layers].sort(
    (a, b) => (SUBJECT_PRIORITY_RANK[b.role] ?? 0) - (SUBJECT_PRIORITY_RANK[a.role] ?? 0)
  );
}

/** Feather radius for mask edges (pixels at full resolution). */
export function resolveLayerFeatherPx(layer: ForegroundSegmentLayer): number {
  if (layer.role === "text" || layer.role === "logo") {
    return 0;
  }
  return defaultFeatherPx(layer.role);
}
