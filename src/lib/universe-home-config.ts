import type { TranslationKey } from "@/i18n";
import type { HomeCheffProductId } from "@/types/homecheff-product-suite";

export const UNIVERSE_BRAND = {
  green: "#006D52",
  blue: "#0067B1",
  deepBlue: "#041428",
  teal: "#0a4d5c",
} as const;

/** Planet orbit radius as % from center — tuned for hero globe scale */
export const UNIVERSE_ORBIT_RADIUS_PERCENT = 30;

export const UNIVERSE_WELCOME_KEYS = [
  "universe.welcome.create",
  "universe.welcome.ready",
  "universe.welcome.universe",
] as const satisfies readonly TranslationKey[];

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
  metricsKeys: [TranslationKey, TranslationKey, TranslationKey];
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
      "universe.capability.editor.photos",
      "universe.capability.editor.characters",
      "universe.capability.editor.logos",
      "universe.capability.editor.posters",
      "universe.capability.editor.assets",
    ],
    metricsKeys: [
      "universe.preview.metric.assets",
      "universe.preview.metric.edits",
      "universe.preview.metric.exports",
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
      "universe.capability.studio.story",
      "universe.capability.studio.scenes",
      "universe.capability.studio.worlds",
      "universe.capability.studio.directorAi",
      "universe.capability.studio.planning",
    ],
    metricsKeys: [
      "universe.preview.metric.stories",
      "universe.preview.metric.scenes",
      "universe.preview.metric.worlds",
    ],
  },
  {
    id: "motion",
    productId: "motion",
    href: "/motion",
    orbitAngle: 54,
    accent: UNIVERSE_BRAND.blue,
    titleKey: "suite.home.motion.title",
    descriptionKey: "universe.planet.motion.description",
    actionKey: "suite.home.motion.action",
    themeKey: "universe.planet.motion.theme",
    capabilityKeys: [
      "universe.capability.motion.animation",
      "universe.capability.motion.cameraMotion",
      "universe.capability.motion.lipSync",
      "universe.capability.motion.rendering",
      "universe.capability.motion.effects",
    ],
    metricsKeys: [
      "universe.preview.metric.projects",
      "universe.preview.metric.videos",
      "universe.preview.metric.exports",
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
      "universe.capability.publish.languages",
      "universe.capability.publish.voiceover",
      "universe.capability.publish.subtitles",
      "universe.capability.publish.branding",
      "universe.capability.publish.exports",
    ],
    metricsKeys: [
      "universe.preview.metric.drafts",
      "universe.preview.metric.renders",
      "universe.preview.metric.exports",
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
      "universe.capability.library.assets",
      "universe.capability.library.videos",
      "universe.capability.library.audio",
      "universe.capability.library.versions",
    ],
    metricsKeys: [
      "universe.preview.metric.uploads",
      "universe.preview.metric.generated",
      "universe.preview.metric.collections",
    ],
  },
];

export function resolveUniverseWelcomeMessages(
  email: string | undefined
): TranslationKey[] {
  const name = resolveUniverseWelcomeName(email);
  if (name) {
    return ["universe.welcome.back", ...UNIVERSE_WELCOME_KEYS];
  }
  return [...UNIVERSE_WELCOME_KEYS];
}

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
