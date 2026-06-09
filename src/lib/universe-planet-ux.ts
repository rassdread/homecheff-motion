import type { TranslationKey } from "@/i18n";
import {
  UNIVERSE_PLANETS,
  type UniversePlanetId,
} from "@/lib/universe-home-config";

/** Grace period before closing hover portal when pointer leaves planet group */
export const UNIVERSE_PLANET_HOVER_CLOSE_DELAY_MS = 200;

export const UNIVERSE_PLANET_IDENTITY_RING_CLASS = "universe-planet-identity-ring";
export const UNIVERSE_PLANET_SATURN_RING_CLASS = "universe-saturn-ring";
export const UNIVERSE_PLANET_SATURN_SCENE_CLASS = "universe-saturn-scene";
export const UNIVERSE_PLANET_SATELLITE_CLASS = "universe-planet-satellite";
export const UNIVERSE_PLANET_PREVIEW_PORTAL_CLASS = "universe-planet-preview-portal";
export const UNIVERSE_PLANET_CLUSTER_CLASS = "universe-planet-cluster";
export const UNIVERSE_PLANET_STATIC_LABEL_CLASS = "universe-planet-static-label";

/** Visual layer hierarchy (spec V4) */
export const UNIVERSE_Z_GLOBE = 10;
export const UNIVERSE_Z_RING = 70;
export const UNIVERSE_Z_PLANET = 80;
export const UNIVERSE_Z_PORTAL = 90;
export const UNIVERSE_Z_SATELLITE = 100;

/** Hover expansion scale */
export const UNIVERSE_PLANET_HOVER_SCALE = 1.22;
export const UNIVERSE_PLANET_HOVER_TRANSITION_MS = 350;

/** Orbit cluster hit area — keeps portal hover inside the group */
export const UNIVERSE_PLANET_ORBIT_CLUSTER_WIDTH_PX = 340;
export const UNIVERSE_PLANET_ORBIT_CLUSTER_HEIGHT_PX = 440;

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
