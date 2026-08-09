/**
 * S.6E — Prompt Matrix assembler.
 * Modules consume ContinuityBundle; they do not own identity.
 */

import {
  assertMandatoryContinuityPresent,
  type ContinuityBundle,
} from "@/lib/studio-prompt-matrix/continuity-bundle";
import {
  emptyCreativeSpecification,
  type CreativeSpecification,
} from "@/lib/studio-prompt-matrix/creative-specification";
import type { StudioCreativeExperienceId } from "@/lib/studio-prompt-matrix/experience-ids";
import { getExperienceRegistryEntry } from "@/lib/studio-prompt-matrix/experience-registry";
import { resolveAspect } from "@/lib/studio-prompt-matrix/aspect-resolution";
import { resolveDuration } from "@/lib/studio-prompt-matrix/duration-resolution";
import {
  mapCanonicalPlatform,
  PLATFORM_DEFAULT_ASPECT,
} from "@/lib/studio-prompt-matrix/option-maps";
import {
  applyBrandOverlay,
  applyPromptPresetOverlay,
  type PromptPresetOverlay,
} from "@/lib/studio-prompt-matrix/overlays";
import type { StudioMatrixDetailLevel } from "@/lib/studio-prompt-matrix/types";
import { STUDIO_RUNTIME_PROVIDER_CAPABILITIES } from "@/lib/studio-prompt-matrix/types";

export type MatrixUserSelections = {
  shotType?: string | null;
  cameraMovement?: string | null;
  energy?: string | null;
  action?: string | null;
  emotion?: string | null;
  lighting?: string | null;
  styleProfile?: string | null;
  directorProfile?: string | null;
  platform?: string | null;
  audience?: string | null;
  objective?: string | null;
  subject?: string | null;
  durationSeconds?: number | null;
  intentDurationSeconds?: number | null;
  experienceDefaultDuration?: number | null;
  aspectRatio?: string | null;
  motionPresetId?: string | null;
  audioMood?: string | null;
  audioEnergy?: string | null;
  script?: string | null;
  voiceCharacterId?: string | null;
  language?: string | null;
  negatives?: string[];
  qualityInstructions?: string[];
};

export type AssembleCreativeSpecificationInput = {
  experienceId: StudioCreativeExperienceId;
  continuity: ContinuityBundle;
  selections?: MatrixUserSelections;
  detailLevel?: StudioMatrixDetailLevel;
  promptPreset?: PromptPresetOverlay | null;
  /** Explicit user locks for overlay safety. */
  explicitUserLock?: Array<
    "styleProfile" | "lighting" | "objective" | "subject" | "platform" | "energy" | "mood"
  >;
};

function experienceObjective(experienceId: StudioCreativeExperienceId): string | null {
  switch (experienceId) {
    case "RESTAURANT_PROMO":
    case "FOOD_PROMO":
    case "COOKING_SHOW":
      return "food_appetite_presentation";
    case "SOCIAL_CAMPAIGN":
      return "social_engagement";
    case "OUTFIT_CHANGE":
      return "outfit_change";
    case "CHARACTER_FUSION":
      return "character_fusion";
    case "INSTANT_PHOTO_TO_VIDEO":
    case "MOTION_PRESET":
    case "STUDIO_MOTION_HANDOFF":
      return "photo_to_motion";
    case "SCENE_STILL":
      return "scene_still";
    case "VOICE_TTS":
      return "voice_tts";
    case "MUSIC_GENERATE":
      return "music";
    case "SFX_GENERATE":
      return "sfx";
    default:
      return null;
  }
}

function foodModules(experienceId: StudioCreativeExperienceId): string[] {
  if (
    experienceId === "RESTAURANT_PROMO" ||
    experienceId === "COOKING_SHOW" ||
    experienceId === "FOOD_PROMO"
  ) {
    return [
      "creative.subject.food",
      "creative.appetite",
      "visual.composition",
      "visual.lighting",
      "distribution.platform",
    ];
  }
  return [];
}

export function assembleCreativeSpecification(
  input: AssembleCreativeSpecificationInput
): CreativeSpecification {
  const detailLevel = input.detailLevel ?? "PROFESSIONAL";
  const registry = getExperienceRegistryEntry(input.experienceId);
  const sel = input.selections ?? {};
  const bundle = input.continuity;

  const continuityCheck = assertMandatoryContinuityPresent(bundle);
  if (!continuityCheck.ok) {
    throw new Error(
      `ContinuityBundle missing mandatory modules: ${continuityCheck.missing.join(", ")}`
    );
  }

  let spec = emptyCreativeSpecification(input.experienceId, detailLevel);
  const modules: string[] = ["creative.objective", "creative.story"];

  const shotType = sel.shotType ?? bundle.camera.shotType ?? bundle.scene.shotType;
  const movement = sel.cameraMovement ?? bundle.camera.cameraMovement;
  const energy = sel.energy ?? bundle.camera.sceneEnergy;
  const action = sel.action ?? bundle.scene.action;
  const emotion = sel.emotion ?? bundle.scene.emotion;
  const styleProfile = sel.styleProfile ?? bundle.style.styleProfile;
  const directorProfile = sel.directorProfile ?? bundle.director.directorProfile;
  const platform = mapCanonicalPlatform(sel.platform) ?? sel.platform ?? null;

  const duration = resolveDuration({
    userOverride: sel.durationSeconds,
    intentDuration: sel.intentDurationSeconds,
    sceneDuration: bundle.scene.durationSeconds,
    experienceDefault: sel.experienceDefaultDuration,
    providerMin: registry.runtimeProvider === "vidu_motion" ? 4 : null,
    providerMax: registry.runtimeProvider === "vidu_motion" ? 12 : null,
  });

  const platformAspect =
    platform && platform in PLATFORM_DEFAULT_ASPECT
      ? PLATFORM_DEFAULT_ASPECT[platform as keyof typeof PLATFORM_DEFAULT_ASPECT]
      : null;
  const providerCaps = registry.runtimeProvider
    ? STUDIO_RUNTIME_PROVIDER_CAPABILITIES[registry.runtimeProvider]
    : null;

  const aspectRatio = resolveAspect({
    userOverride: sel.aspectRatio,
    requested: sel.aspectRatio,
    platformDefault: platformAspect ?? null,
    experienceDefault: null,
    productDefault: "9:16",
    providerSupported: providerCaps?.supportedAspects ?? null,
  });

  if (bundle.characters.length > 0) modules.push("continuity.character");
  if (bundle.location) modules.push("continuity.location");
  if (bundle.props.length > 0) modules.push("continuity.props");
  if (bundle.world) modules.push("continuity.world");
  if (shotType) modules.push("visual.composition");
  if (movement) modules.push("visual.camera");
  if (energy) modules.push("visual.movement");
  if (sel.lighting) modules.push("visual.lighting");
  if (styleProfile || directorProfile) modules.push("visual.style");
  if (action) modules.push("performance.action");
  if (emotion) modules.push("performance.emotion");
  if (platform) modules.push("distribution.platform");
  if (aspectRatio.resolved) modules.push("distribution.aspect");
  if (duration.resolvedSeconds != null) modules.push("distribution.duration");
  modules.push("quality");
  modules.push(...foodModules(input.experienceId));
  if (input.experienceId === "OUTFIT_CHANGE") {
    modules.push("creative.objective.outfit", "creative.subject.role");
  }

  spec = {
    ...spec,
    objective: sel.objective ?? experienceObjective(input.experienceId),
    subject: sel.subject ?? bundle.characters[0]?.name ?? bundle.location?.name ?? null,
    story: {
      title: bundle.scene.title,
      description: bundle.scene.description,
      action,
      emotion,
    },
    continuity: {
      characterIds: bundle.characters.map((c) => c.id),
      locationId: bundle.location?.id ?? null,
      propIds: bundle.props.map((p) => p.id),
      worldId: bundle.world?.id ?? null,
      continuityCase: bundle.continuityMeta.continuityCase,
      identityRules: [...bundle.continuityMeta.identityRules],
      strength: bundle.continuityMeta.continuityStrength,
    },
    composition: {
      shotType: shotType ?? null,
      framing: shotType ?? null,
    },
    camera: {
      movement: movement ?? null,
      legacyCamera: bundle.camera.camera,
    },
    movement: {
      energy: energy ?? null,
      motionPresetId: sel.motionPresetId ?? null,
    },
    lighting: sel.lighting ?? null,
    style: {
      styleProfile: styleProfile ?? null,
      directorProfile: directorProfile ?? null,
      worldVisualStyle: bundle.style.worldVisualStyle,
    },
    performance: {
      action: action ?? null,
      emotion: emotion ?? null,
    },
    environment: {
      locationSummary: bundle.location?.name ?? null,
      worldTone: bundle.world?.tone ?? null,
    },
    audio: {
      voiceCharacterId: sel.voiceCharacterId ?? bundle.voice[0]?.characterId ?? null,
      language: sel.language ?? bundle.voice[0]?.language ?? null,
      mood: sel.audioMood ?? null,
      energy: sel.audioEnergy ?? energy ?? null,
      script: sel.script ?? null,
    },
    duration,
    aspectRatio,
    platform,
    audience: sel.audience ?? null,
    quality: {
      instructions: sel.qualityInstructions ?? [],
    },
    negatives: {
      canonical: sel.negatives ?? [],
      preserveProviderDefaults: true,
    },
    providerHints: {
      preferredRuntimeProvider: registry.runtimeProvider,
      capabilityNotes: [],
    },
    modulesIncluded: modules,
  };

  spec = applyBrandOverlay(spec, bundle.brand);
  spec = applyPromptPresetOverlay(spec, input.promptPreset, {
    explicitUserLock: input.explicitUserLock,
  });

  return spec;
}
