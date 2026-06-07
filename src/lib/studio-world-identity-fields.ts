/**
 * World Identity Builder — form values ↔ Identity Spec Engine ↔ world PATCH.
 */

import {
  type WorldIdentityAmbienceId,
  type WorldIdentityAudioEnergyId,
  type WorldIdentityCameraStyleId,
  type WorldIdentityColorThemeId,
  type WorldIdentityEnvFeelId,
  type WorldIdentityLightingId,
  type WorldIdentityMoodId,
  type WorldIdentityMotionStyleId,
  type WorldIdentityMusicStyleId,
  type WorldIdentityPacingId,
  type WorldIdentityShapeId,
  type WorldIdentitySoundFeelId,
  type WorldIdentityTypeId,
  type WorldIdentityVisualStyleId,
  type WorldIdentityVoiceDirectionId,
} from "@/lib/studio-world-identity-presets";
import {
  buildWorldContinuityField,
  buildWorldToneField,
  buildWorldVisualField,
  parseWorldAudioDetails,
  parseWorldAudioStructured,
  parseWorldContinuitySections,
  parseWorldRenderStrategies,
  parseWorldShotsStructured,
  parseWorldVisualDetails,
  parseWorldVisualStructured,
} from "@/lib/studio-world-identity-structured";
import { toIdentitySpec } from "@/lib/studio-identity-spec-engine";
import type { WorldIdentitySpecPatch } from "@/types/studio-identity-spec";
import type { StudioWorldProfileListItem } from "@/types/studio-api";

export type WorldIdentityFormValues = {
  name: string;
  description: string;
  worldType: WorldIdentityTypeId | string;
  visualStyle: WorldIdentityVisualStyleId | string;
  shapeLanguage: WorldIdentityShapeId | string;
  colorTheme: WorldIdentityColorThemeId | string;
  colorRules: string;
  lighting: WorldIdentityLightingId | string;
  mood: WorldIdentityMoodId | string;
  environmentFeel: WorldIdentityEnvFeelId | string;
  visualDetails: string;
  musicStyle: WorldIdentityMusicStyleId | string;
  ambience: WorldIdentityAmbienceId | string;
  audioEnergy: WorldIdentityAudioEnergyId | string;
  voiceDirection: WorldIdentityVoiceDirectionId | string;
  soundFeel: WorldIdentitySoundFeelId | string;
  audioDetails: string;
  cameraStyle: WorldIdentityCameraStyleId | string;
  motionStyle: WorldIdentityMotionStyleId | string;
  pacing: WorldIdentityPacingId | string;
  preferredShots: string;
  forbiddenShotStyles: string;
  renderStrategies: string[];
  usageContext: string;
  forbiddenElements: string;
  audioForbiddenElements: string;
  brandRules: string;
};

export function worldIdentityFormFromWorld(
  world: StudioWorldProfileListItem
): WorldIdentityFormValues {
  const spec = toIdentitySpec(world);
  const visual = parseWorldVisualStructured(spec.memoryMetadata.visualStyle);
  const audio = parseWorldAudioStructured(spec.memoryMetadata.tone);
  const continuity = parseWorldContinuitySections(spec.memoryMetadata.continuityRules);
  const shots = parseWorldShotsStructured(continuity.shotsBlock);

  return {
    name: spec.name,
    description: spec.description,
    worldType: visual.worldType,
    visualStyle: visual.visualStyle,
    shapeLanguage: visual.shapeLanguage,
    colorTheme: visual.colorTheme,
    colorRules: visual.colorTheme ? "" : spec.memoryMetadata.visualStyle.trim(),
    lighting: visual.lighting,
    mood: visual.mood,
    environmentFeel: visual.environmentFeel,
    visualDetails: parseWorldVisualDetails(spec.memoryMetadata.visualStyle),
    musicStyle: audio.musicStyle,
    ambience: audio.ambience,
    audioEnergy: audio.audioEnergy,
    voiceDirection: audio.voiceDirection,
    soundFeel: audio.soundFeel,
    audioDetails: parseWorldAudioDetails(spec.memoryMetadata.tone),
    cameraStyle: shots.cameraStyle,
    motionStyle: shots.motionStyle,
    pacing: shots.pacing,
    preferredShots: shots.preferredShots,
    forbiddenShotStyles: shots.forbiddenShotStyles,
    renderStrategies: parseWorldRenderStrategies(spec.memoryMetadata.continuityRules),
    usageContext: continuity.usageContext,
    forbiddenElements: continuity.forbiddenElements,
    audioForbiddenElements: continuity.audioForbiddenElements,
    brandRules: continuity.brandRules,
  };
}

export function worldIdentityFormToPatch(
  values: WorldIdentityFormValues
): WorldIdentitySpecPatch {
  const visualStyle = buildWorldVisualField(
    {
      worldType: values.worldType,
      visualStyle: values.visualStyle,
      shapeLanguage: values.shapeLanguage,
      colorTheme: values.colorTheme,
      lighting: values.lighting,
      mood: values.mood,
      environmentFeel: values.environmentFeel,
      freeTags: [],
    },
    values.colorRules ?
      `${values.colorRules}\n${values.visualDetails}`.trim()
    : values.visualDetails
  );

  const tone = buildWorldToneField(
    {
      musicStyle: values.musicStyle,
      ambience: values.ambience,
      audioEnergy: values.audioEnergy,
      voiceDirection: values.voiceDirection,
      soundFeel: values.soundFeel,
      freeTags: [],
    },
    values.audioDetails
  );

  const continuityRules = buildWorldContinuityField({
    usageContext: values.usageContext,
    shots: {
      cameraStyle: values.cameraStyle,
      motionStyle: values.motionStyle,
      pacing: values.pacing,
      preferredShots: values.preferredShots,
      forbiddenShotStyles: values.forbiddenShotStyles,
      freeTags: [],
    },
    renderStrategies: values.renderStrategies,
    forbiddenElements: values.forbiddenElements,
    audioForbiddenElements: values.audioForbiddenElements,
    brandRules: values.brandRules,
  });

  return {
    name: values.name.trim(),
    description: values.description,
    visualStyle,
    tone,
    continuityRules,
  };
}

export function mergeWorldIdentityForm(
  base: WorldIdentityFormValues,
  suggestion: Partial<WorldIdentityFormValues>
): WorldIdentityFormValues {
  return { ...base, ...suggestion };
}

export function worldIdentityCompletenessTier(
  score: number
): "complete" | "almost" | "missing" {
  if (score >= 85) return "complete";
  if (score >= 50) return "almost";
  return "missing";
}
