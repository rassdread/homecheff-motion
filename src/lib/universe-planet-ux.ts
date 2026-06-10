import type { TranslationKey } from "@/i18n";
import {
  UNIVERSE_PLANETS,
  type UniversePlanetId,
} from "@/lib/universe-home-config";

/** Grace period before closing hover when pointer leaves planet group */
export const UNIVERSE_PLANET_HOVER_CLOSE_DELAY_MS = 500;
/** Minimum time a planet stays active once hovered */
export const UNIVERSE_PLANET_HOVER_LOCK_MS = 500;

export const UNIVERSE_PLANET_IDENTITY_RING_CLASS = "universe-planet-identity-ring";
export const UNIVERSE_PLANET_SATURN_RING_CLASS = "universe-saturn-ring";
export const UNIVERSE_PLANET_SATURN_SCENE_CLASS = "universe-saturn-scene";
export const UNIVERSE_PLANET_SATELLITE_CLASS = "universe-planet-satellite";
export const UNIVERSE_PLANET_PREVIEW_PORTAL_CLASS = "universe-planet-preview-portal";
export const UNIVERSE_PLANET_CLUSTER_CLASS = "universe-planet-cluster";
export const UNIVERSE_PLANET_STATIC_LABEL_CLASS = "universe-planet-static-label";

/** Visual layer hierarchy (V5 — no portal layer) */
export const UNIVERSE_Z_GLOBE = 10;
export const UNIVERSE_Z_RING = 70;
export const UNIVERSE_Z_PLANET = 80;
export const UNIVERSE_Z_PLANET_ACTIVE = 85;
export const UNIVERSE_Z_CAPABILITY = 90;
/** @deprecated Portals removed in V5 */
export const UNIVERSE_Z_PORTAL = 90;
/** @deprecated Use UNIVERSE_Z_CAPABILITY */
export const UNIVERSE_Z_SATELLITE = 90;

/** Hover expansion scale — V5 spec: 130% */
export const UNIVERSE_PLANET_HOVER_SCALE = 1.3;
export const UNIVERSE_PLANET_HOVER_TRANSITION_MS = 350;

/** Hero planet icon — readable without hover */
export const UNIVERSE_PLANET_ICON_SIZE_MOBILE_PX = 32;
export const UNIVERSE_PLANET_ICON_SIZE_TABLET_PX = 40;
export const UNIVERSE_PLANET_ICON_SIZE_DESKTOP_PX = 48;
export const UNIVERSE_PLANET_ICON_CLASS = "h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12";

export const UNIVERSE_PLANET_NAME_LABEL_CLASS = "universe-planet-name-label";

/** Compact orbit cluster — no portal hover zone */
export const UNIVERSE_PLANET_ORBIT_CLUSTER_SIZE_PX = 280;

/** Rotating capability orbit — 20–30s per revolution */
export const UNIVERSE_CAPABILITY_ORBIT_DURATION_S = 25;
/** @deprecated Use ellipse radii below */
export const UNIVERSE_CAPABILITY_ORBIT_RADIUS_PX = 168;

/** Elliptical capability orbit — desktop hero scale */
export const UNIVERSE_CAPABILITY_ORBIT_X_RADIUS_PX = 168;
export const UNIVERSE_CAPABILITY_ORBIT_Y_RADIUS_PX = 98;

export function resolveCapabilityOrbitAngleDeg(index: number, total: number): number {
  if (total <= 0) return 0;
  return (360 / total) * index - 90;
}

export type CapabilityEllipsePosition = {
  x: number;
  y: number;
  /** 0 = back/top, 1 = front/bottom */
  depth: number;
};

export function resolveCapabilityEllipsePosition(
  angleDeg: number,
  xRadius = UNIVERSE_CAPABILITY_ORBIT_X_RADIUS_PX,
  yRadius = UNIVERSE_CAPABILITY_ORBIT_Y_RADIUS_PX
): CapabilityEllipsePosition {
  const rad = (angleDeg * Math.PI) / 180;
  const x = Math.cos(rad) * xRadius;
  const y = Math.sin(rad) * yRadius;
  const depth = (Math.sin(rad) + 1) / 2;
  return { x, y, depth };
}

export function resolveCapabilityLabelDepthStyle(depth: number): {
  opacity: number;
  zIndex: number;
} {
  if (depth < 0.38) {
    const t = depth / 0.38;
    return {
      opacity: 0.28 + t * 0.22,
      zIndex: 1,
    };
  }
  return {
    opacity: 0.92 + (depth - 0.38) * 0.08,
    zIndex: 3,
  };
}

export function resolveUniverseOrbitDebug(raw: string | null | undefined): boolean {
  return raw === "1" || raw === "true";
}

/** @deprecated Static radial slots removed — use rotating capability orbit */
export function resolveCapabilityRadialSlot(
  index: number,
  total: number
): { x: number; y: number } {
  const angleDeg = resolveCapabilityOrbitAngleDeg(index, total);
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: Math.cos(rad) * UNIVERSE_CAPABILITY_ORBIT_RADIUS_PX,
    y: Math.sin(rad) * UNIVERSE_CAPABILITY_ORBIT_RADIUS_PX,
  };
}

/** @deprecated Portals removed in V5 */
export const UNIVERSE_PLANET_ORBIT_CLUSTER_WIDTH_PX = UNIVERSE_PLANET_ORBIT_CLUSTER_SIZE_PX;
/** @deprecated Portals removed in V5 */
export const UNIVERSE_PLANET_ORBIT_CLUSTER_HEIGHT_PX = UNIVERSE_PLANET_ORBIT_CLUSTER_SIZE_PX;

export type UniversePortalPlacement = "above" | "below" | "left" | "right";

export type SaturnRingVariant = {
  accent: string;
  accentSecondary?: string;
  decoration: "fragments" | "cards" | "streaks" | "export" | "archive";
};

const SATURN_RING_BY_PLANET: Record<UniversePlanetId, SaturnRingVariant> = {
  editor: { accent: "#0067B1", decoration: "fragments" },
  studio: { accent: "#0067B1", accentSecondary: "#006D52", decoration: "cards" },
  motion: { accent: "#1a8fd4", decoration: "streaks" },
  publish: { accent: "#006D52", decoration: "export" },
  library: { accent: "#0a8a6f", decoration: "archive" },
};

export function resolveSaturnRingVariant(planetId: UniversePlanetId): SaturnRingVariant {
  return SATURN_RING_BY_PLANET[planetId];
}

/**
 * Smart portal placement — opens away from globe center based on orbit angle.
 * Top → below, bottom → above, right → left, left → right.
 */
export function resolveUniversePortalPlacement(orbitAngleDeg: number): UniversePortalPlacement {
  const rad = (orbitAngleDeg * Math.PI) / 180;
  const x = Math.cos(rad);
  const y = Math.sin(rad);

  if (Math.abs(y) >= Math.abs(x)) {
    return y < 0 ? "below" : "above";
  }
  return x > 0 ? "left" : "right";
}

export function resolveUniversePortalPositionClass(placement: UniversePortalPlacement): string {
  switch (placement) {
    case "above":
      return "bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2";
    case "below":
      return "top-[calc(100%+4px)] left-1/2 -translate-x-1/2";
    case "left":
      return "right-[calc(100%+10px)] top-1/2 -translate-y-1/2";
    case "right":
      return "left-[calc(100%+10px)] top-1/2 -translate-y-1/2";
  }
}

export function resolveUniversePortalBridgeClass(placement: UniversePortalPlacement): string {
  switch (placement) {
    case "above":
      return "bottom-full left-1/2 h-5 w-[min(22rem,82vw)] -translate-x-1/2";
    case "below":
      return "top-full left-1/2 h-5 w-[min(22rem,82vw)] -translate-x-1/2";
    case "left":
      return "right-full top-1/2 h-[min(22rem,82vw)] w-5 -translate-y-1/2";
    case "right":
      return "left-full top-1/2 h-[min(22rem,82vw)] w-5 -translate-y-1/2";
  }
}

/** Legacy ring constants — Saturn ring uses CSS 3D */
export const UNIVERSE_PLANET_RING_SVG_FONT_SIZE = 11;
export const UNIVERSE_PLANET_RING_SVG_SCALE_PERCENT = 900;

export type UniversePlanetPreviewMetric = {
  labelKey: TranslationKey;
  sampleKey: TranslationKey;
};

export type UniversePlanetPreviewContent = {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  actionKey: TranslationKey;
  metrics: UniversePlanetPreviewMetric[];
  previewChipKeys: [TranslationKey, TranslationKey, TranslationKey];
};

const PREVIEW_BY_PLANET: Record<UniversePlanetId, UniversePlanetPreviewContent> = {
  editor: {
    titleKey: "suite.home.editor.title",
    descriptionKey: "universe.planet.editor.description",
    actionKey: "suite.home.editor.action",
    metrics: [
      { labelKey: "universe.preview.metric.photos", sampleKey: "universe.preview.sample.photos" },
      { labelKey: "universe.preview.metric.characters", sampleKey: "universe.preview.sample.characters" },
      { labelKey: "universe.preview.metric.designs", sampleKey: "universe.preview.sample.designs" },
    ],
    previewChipKeys: [
      "universe.capability.editor.photoEditing",
      "universe.capability.editor.characterDesign",
      "universe.capability.editor.posterDesign",
    ],
  },
  studio: {
    titleKey: "suite.home.studio.title",
    descriptionKey: "universe.planet.studio.description",
    actionKey: "suite.home.studio.action",
    metrics: [
      { labelKey: "universe.preview.metric.storyboards", sampleKey: "universe.preview.sample.storyboards" },
      { labelKey: "universe.preview.metric.worlds", sampleKey: "universe.preview.sample.worlds" },
      { labelKey: "universe.preview.metric.scenes", sampleKey: "universe.preview.sample.scenes" },
    ],
    previewChipKeys: [
      "universe.capability.studio.storyboards",
      "universe.capability.studio.worlds",
      "universe.capability.studio.characters",
    ],
  },
  motion: {
    titleKey: "suite.home.motion.title",
    descriptionKey: "universe.planet.motion.description",
    actionKey: "suite.home.motion.action",
    metrics: [
      { labelKey: "universe.preview.metric.animations", sampleKey: "universe.preview.sample.animations" },
      { labelKey: "universe.preview.metric.camera", sampleKey: "universe.preview.sample.camera" },
      { labelKey: "universe.preview.metric.lipSync", sampleKey: "universe.preview.sample.lipSync" },
    ],
    previewChipKeys: [
      "universe.capability.motion.photoToVideo",
      "universe.capability.motion.cameraMotion",
      "universe.capability.motion.lipSync",
    ],
  },
  publish: {
    titleKey: "suite.home.publish.title",
    descriptionKey: "universe.planet.publish.description",
    actionKey: "suite.home.publish.action",
    metrics: [
      { labelKey: "universe.preview.metric.subtitles", sampleKey: "universe.preview.sample.subtitles" },
      { labelKey: "universe.preview.metric.overlays", sampleKey: "universe.preview.sample.overlays" },
      { labelKey: "universe.preview.metric.exports", sampleKey: "universe.preview.sample.exports" },
    ],
    previewChipKeys: [
      "universe.capability.publish.subtitles",
      "universe.capability.publish.overlays",
      "universe.capability.publish.branding",
    ],
  },
  library: {
    titleKey: "suite.home.library.title",
    descriptionKey: "universe.planet.library.description",
    actionKey: "suite.home.library.action",
    metrics: [
      { labelKey: "universe.preview.metric.uploads", sampleKey: "universe.preview.sample.uploads" },
      { labelKey: "universe.preview.metric.generated", sampleKey: "universe.preview.sample.generated" },
      { labelKey: "universe.preview.metric.videos", sampleKey: "universe.preview.sample.videos" },
    ],
    previewChipKeys: [
      "universe.capability.library.uploads",
      "universe.capability.library.generated",
      "universe.capability.library.videos",
    ],
  },
};

export function resolveUniversePlanetPreviewContent(
  planetId: UniversePlanetId
): UniversePlanetPreviewContent {
  return PREVIEW_BY_PLANET[planetId];
}

export function allUniversePlanetsHavePreviewContent(): boolean {
  return UNIVERSE_PLANETS.every((planet) => {
    const content = resolveUniversePlanetPreviewContent(planet.id);
    return (
      content.titleKey &&
      content.descriptionKey &&
      content.actionKey &&
      content.metrics.length === 3 &&
      content.previewChipKeys.length === 3
    );
  });
}

/** Dev visual test — ?universePlanetDebug=editor|studio|... */
export function resolveUniversePlanetVisualDebug(
  raw: string | null | undefined
): UniversePlanetId | null {
  if (!raw) return null;
  if (UNIVERSE_PLANETS.some((p) => p.id === raw)) {
    return raw as UniversePlanetId;
  }
  return null;
}
