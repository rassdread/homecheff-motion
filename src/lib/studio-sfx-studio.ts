/**
 * S.7D — Canonical SFX Studio + scene sound planning.
 * Ambience remains an SFX semantic subtype (S.7B honesty).
 */

import { parseStoryboardAudioAssetLinks } from "@/lib/studio-storyboard-audio-asset-links";
import { USER_SFX_CATEGORIES, type UserAudioLibraryAsset } from "@/types/studio-user-audio-library";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";

export const STUDIO_SFX_SEMANTIC_TYPES = [
  "effects",
  "ambience",
  "environment",
  "transitions",
  "impacts",
  "movement",
  "weather",
  "crowd",
  "animals",
  "objects",
  "cinematic",
  "background_layers",
  "room_tone",
] as const;

export type StudioSfxSemanticType = (typeof STUDIO_SFX_SEMANTIC_TYPES)[number];

export const STUDIO_SCENE_SOUND_ENVIRONMENTS = [
  "ambience",
  "room_tone",
  "weather",
  "city",
  "nature",
  "restaurant",
  "kitchen",
  "office",
  "traffic",
  "crowd",
  "movement",
] as const;

export type StudioSceneSoundEnvironment = (typeof STUDIO_SCENE_SOUND_ENVIRONMENTS)[number];

export type StudioSfxStudioContract = {
  version: "7d.1";
  storyboardId: string;
  linkedSfxAssetId: string | null;
  linkedAsset: UserAudioLibraryAsset | null;
  categories: readonly string[];
  semanticTypes: readonly StudioSfxSemanticType[];
  /** Honest: render supports one bed, not timed hits */
  renderSemantics: "project_bed";
  ambienceAsSfxSubtype: true;
  reuse: { reuseWithoutRegeneration: true };
  preview: { replacesFinalGeneration: false; supported: true };
  providerCapabilities: {
    generate: true;
    preview: true;
    library: true;
    history: true;
  };
};

export type StudioSceneSoundPlan = {
  version: "7d.1";
  sceneId: string;
  sceneOrder: number;
  environment: StudioSceneSoundEnvironment | null;
  ambience: string | null;
  density: string | null;
  movement: string | null;
  sfxAssetOverride: string | null;
  ambienceAssetOverride: string | null;
  /** No timeline editor */
  timelineEditor: false;
  generatesImmediately: false;
};

export function buildSfxStudio(
  storyboard: StudioStoryboardDetail,
  options?: { linkedAsset?: UserAudioLibraryAsset | null }
): StudioSfxStudioContract {
  const links = parseStoryboardAudioAssetLinks(storyboard.audioAssetLinks);
  const linkedAsset = options?.linkedAsset ?? null;
  return {
    version: "7d.1",
    storyboardId: storyboard.id,
    linkedSfxAssetId: linkedAsset?.id ?? links.soundAssetId ?? null,
    linkedAsset,
    categories: USER_SFX_CATEGORIES,
    semanticTypes: STUDIO_SFX_SEMANTIC_TYPES,
    renderSemantics: "project_bed",
    ambienceAsSfxSubtype: true,
    reuse: { reuseWithoutRegeneration: true },
    preview: { replacesFinalGeneration: false, supported: true },
    providerCapabilities: {
      generate: true,
      preview: true,
      library: true,
      history: true,
    },
  };
}

function inferEnvironment(scene: StudioSceneDetail): StudioSceneSoundEnvironment | null {
  const raw = [
    scene.soundEnvironmentOverride,
    scene.soundAmbientOverride,
    scene.description,
    scene.title,
  ]
    .filter(Boolean)
    .join(" ")
    .trim()
    .toLowerCase();
  if (!raw) return null;
  // Prefer specific environments before generic "ambience"
  if (raw.includes("kitchen")) return "kitchen";
  if (raw.includes("restaurant") || raw.includes("dining")) return "restaurant";
  if (raw.includes("office")) return "office";
  if (raw.includes("forest") || raw.includes("park") || raw.includes("nature")) return "nature";
  if (raw.includes("traffic") || raw.includes("street")) return "traffic";
  if (raw.includes("city") || raw.includes("urban")) return "city";
  if (raw.includes("crowd") || raw.includes("audience")) return "crowd";
  if (raw.includes("weather") || raw.includes("rain") || raw.includes("wind")) return "weather";
  if (raw.includes("room tone") || raw.includes("room_tone")) return "room_tone";
  if (raw.includes("movement") || raw.includes("footstep")) return "movement";
  if (raw.includes("ambience") || raw.includes("ambient")) return "ambience";
  return "ambience";
}

export function buildSceneSoundPlan(scene: StudioSceneDetail): StudioSceneSoundPlan {
  return {
    version: "7d.1",
    sceneId: scene.id,
    sceneOrder: scene.order,
    environment: inferEnvironment(scene),
    ambience: scene.soundAmbientOverride?.trim() || null,
    density: scene.soundPriority?.trim() || null,
    movement: scene.soundCharacterOverride?.trim() || null,
    sfxAssetOverride: scene.sfxAssetOverride?.trim() || null,
    ambienceAssetOverride: scene.ambienceAssetOverride?.trim() || null,
    timelineEditor: false,
    generatesImmediately: false,
  };
}

export function buildStoryboardSceneSoundPlan(storyboard: StudioStoryboardDetail): {
  version: "7d.1";
  storyboardId: string;
  projectSfxAssetId: string | null;
  scenes: StudioSceneSoundPlan[];
} {
  const links = parseStoryboardAudioAssetLinks(storyboard.audioAssetLinks);
  return {
    version: "7d.1",
    storyboardId: storyboard.id,
    projectSfxAssetId: links.soundAssetId ?? null,
    scenes: storyboard.scenes.map(buildSceneSoundPlan),
  };
}
