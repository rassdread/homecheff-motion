import type { TranslationKey } from "@/i18n";
import type { HomeCheffProductId } from "@/types/homecheff-product-suite";

export const UNIVERSE_BRAND = {
  green: "#006D52",
  blue: "#0067B1",
  deepBlue: "#041428",
  teal: "#0a4d5c",
} as const;

export type UniversePlanetId = "editor" | "studio" | "motion" | "publish" | "library";

export type UniversePlanetConfig = {
  id: UniversePlanetId;
  productId: HomeCheffProductId;
  href: string;
  /** Degrees on orbit ring (0 = top) */
  orbitAngle: number;
  accent: string;
  accentSecondary?: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  actionKey: TranslationKey;
  themeKey: TranslationKey;
  capabilityKeys: TranslationKey[];
};

/** Creative pipeline — Library sits outside the main flow */
export const UNIVERSE_PIPELINE: UniversePlanetId[] = ["editor", "studio", "motion", "publish"];

export const UNIVERSE_PLANETS: UniversePlanetConfig[] = [
  {
    id: "editor",
    productId: "editor",
    href: "/editor",
    orbitAngle: -90,
    accent: UNIVERSE_BRAND.blue,
    titleKey: "suite.home.editor.title",
    descriptionKey: "universe.planet.editor.description",
    actionKey: "suite.home.editor.action",
    themeKey: "universe.planet.editor.theme",
    capabilityKeys: [
      "universe.capability.editor.photoEditing",
      "universe.capability.editor.characterCreation",
      "universe.capability.editor.backgroundRemoval",
      "universe.capability.editor.assetDesign",
      "universe.capability.editor.referencePlacement",
    ],
  },
  {
    id: "studio",
    productId: "studio",
    href: "/studio",
    orbitAngle: -18,
    accent: UNIVERSE_BRAND.blue,
    accentSecondary: UNIVERSE_BRAND.green,
    titleKey: "suite.home.studio.title",
    descriptionKey: "universe.planet.studio.description",
    actionKey: "suite.home.studio.action",
    themeKey: "universe.planet.studio.theme",
    capabilityKeys: [
      "universe.capability.studio.storyboards",
      "universe.capability.studio.characters",
      "universe.capability.studio.worlds",
      "universe.capability.studio.directorAi",
      "universe.capability.studio.voicePlanning",
    ],
  },
  {
    id: "motion",
    productId: "motion",
    href: "/animate/instant",
    orbitAngle: 54,
    accent: UNIVERSE_BRAND.blue,
    titleKey: "suite.home.motion.title",
    descriptionKey: "universe.planet.motion.description",
    actionKey: "suite.home.motion.action",
    themeKey: "universe.planet.motion.theme",
    capabilityKeys: [
      "universe.capability.motion.photoToVideo",
      "universe.capability.motion.characterAnimation",
      "universe.capability.motion.cameraMotion",
      "universe.capability.motion.sceneMotion",
      "universe.capability.motion.lipSync",
    ],
  },
  {
    id: "publish",
    productId: "presentation",
    href: "/publish",
    orbitAngle: 126,
    accent: UNIVERSE_BRAND.green,
    titleKey: "suite.home.publish.title",
    descriptionKey: "universe.planet.publish.description",
    actionKey: "suite.home.publish.action",
    themeKey: "universe.planet.publish.theme",
    capabilityKeys: [
      "universe.capability.publish.subtitles",
      "universe.capability.publish.overlays",
      "universe.capability.publish.branding",
      "universe.capability.publish.cta",
      "universe.capability.publish.socialExport",
    ],
  },
  {
    id: "library",
    productId: "assets",
    href: "/library",
    orbitAngle: 198,
    accent: UNIVERSE_BRAND.teal,
    accentSecondary: UNIVERSE_BRAND.blue,
    titleKey: "suite.home.library.title",
    descriptionKey: "universe.planet.library.description",
    actionKey: "suite.home.library.action",
    themeKey: "universe.planet.library.theme",
    capabilityKeys: [
      "universe.capability.library.uploads",
      "universe.capability.library.generated",
      "universe.capability.library.derived",
      "universe.capability.library.videos",
      "universe.capability.library.audio",
    ],
  },
];

export type UniverseQuickActionId =
  | "createCharacter"
  | "createStory"
  | "animateImages"
  | "publishVideo"
  | "openLibrary";

export type UniverseQuickActionConfig = {
  id: UniverseQuickActionId;
  href: string;
  labelKey: TranslationKey;
};

export const UNIVERSE_QUICK_ACTIONS: UniverseQuickActionConfig[] = [
  { id: "createCharacter", href: "/editor", labelKey: "universe.quick.createCharacter" },
  { id: "createStory", href: "/studio/storyboards/new", labelKey: "universe.quick.createStory" },
  { id: "animateImages", href: "/animate/instant", labelKey: "universe.quick.animateImages" },
  { id: "publishVideo", href: "/publish", labelKey: "universe.quick.publishVideo" },
  { id: "openLibrary", href: "/library", labelKey: "universe.quick.openLibrary" },
];

/** Pipeline segments lit when hovering a planet (inclusive upstream path) */
export function resolveUniversePipelineHighlight(
  hoveredId: UniversePlanetId | null
): Set<UniversePlanetId> {
  if (!hoveredId) {
    return new Set();
  }
  const idx = UNIVERSE_PIPELINE.indexOf(hoveredId);
  if (idx < 0) {
    return new Set([hoveredId]);
  }
  return new Set(UNIVERSE_PIPELINE.slice(0, idx + 1));
}

export function resolveUniversePipelineSegmentActive(
  from: UniversePlanetId,
  to: UniversePlanetId,
  highlighted: Set<UniversePlanetId>
): boolean {
  const fromIdx = UNIVERSE_PIPELINE.indexOf(from);
  const toIdx = UNIVERSE_PIPELINE.indexOf(to);
  if (fromIdx < 0 || toIdx < 0 || toIdx !== fromIdx + 1) {
    return false;
  }
  return highlighted.has(from) && highlighted.has(to);
}

export function resolveUniverseWelcomeName(email: string | undefined): string | null {
  if (!email) {
    return null;
  }
  const local = email.split("@")[0]?.trim();
  if (!local) {
    return null;
  }
  const first = local.split(/[._-]/)[0];
  if (!first) {
    return null;
  }
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function resolveUniversePlanetById(id: UniversePlanetId): UniversePlanetConfig {
  const planet = UNIVERSE_PLANETS.find((p) => p.id === id);
  if (!planet) {
    throw new Error(`Unknown universe planet: ${id}`);
  }
  return planet;
}

/** Orbit position as percentage within container (center = 50,50) */
export function resolveUniverseOrbitPosition(
  angleDeg: number,
  radiusPercent: number
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: 50 + Math.cos(rad) * radiusPercent,
    y: 50 + Math.sin(rad) * radiusPercent * 0.88,
  };
}
