import type { TranslationKey } from "@/i18n";
import {
  UNIVERSE_PLANETS,
  type UniversePlanetId,
} from "@/lib/universe-home-config";

/** Grace period before closing hover portal when pointer leaves planet group */
export const UNIVERSE_PLANET_HOVER_CLOSE_DELAY_MS = 200;

export const UNIVERSE_PLANET_IDENTITY_RING_CLASS = "universe-planet-identity-ring";
export const UNIVERSE_PLANET_SATELLITE_CLASS = "universe-planet-satellite";
export const UNIVERSE_PLANET_PREVIEW_PORTAL_CLASS = "universe-planet-preview-portal";
export const UNIVERSE_PLANET_CLUSTER_CLASS = "universe-planet-cluster";
export const UNIVERSE_PLANET_STATIC_LABEL_CLASS = "universe-planet-static-label";

/** Orbit cluster hit area — keeps portal hover inside the group */
export const UNIVERSE_PLANET_ORBIT_CLUSTER_WIDTH_PX = 320;
export const UNIVERSE_PLANET_ORBIT_CLUSTER_HEIGHT_PX = 420;

/** SVG text size in ring viewBox units (~3.5× prior 14px ring text) */
export const UNIVERSE_PLANET_RING_SVG_FONT_SIZE = 11;

/** Ring SVG scale relative to planet button (percent width/height) */
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
