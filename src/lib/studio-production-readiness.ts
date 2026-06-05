/**
 * Studio V29 — production readiness validation.
 */

import { buildDirectorQualityReport } from "@/lib/studio-movie-director-quality";
import { analyzeSceneImagePlanner } from "@/lib/studio-scene-image-planner";
import { studioSceneDetailToSnapshot } from "@/lib/studio-scene-to-prompt-input";
import { scoreSceneImageHealth } from "@/lib/studio-scene-image-health";
import { scorePromptQuality } from "@/lib/studio-prompt-quality";
import { studioSceneDetailToPromptInput } from "@/lib/studio-scene-to-prompt-input";
import { analyzeStoryIntelligence } from "@/lib/studio-story-intelligence";
import { storyboardToFlowInput } from "@/lib/studio-movie-director-quality";
import { buildMusicDirectorPlan, isMusicPlanReady } from "@/lib/studio-music-director";
import { buildSoundDirectorPlan, isSoundPlanReady } from "@/lib/studio-sound-director";
import {
  buildAudioProductionDirectorPlan,
  isAudioProductionPlanReady,
} from "@/lib/studio-audio-production-director";
import {
  buildAudioAssetDirectorPlan,
  isAudioAssetPlanReady,
} from "@/lib/studio-audio-asset-director";
import { analyzeVoiceDirector } from "@/lib/studio-voice-director";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import { normalizeStudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import {
  sceneHasCompletedImage,
  resolveSceneDisplayImage,
} from "@/lib/studio-movie-scene-image";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export type AssetReadinessLevel = "ready" | "attention" | "not_ready";

export type AssetReadinessItem = {
  id:
    | "story"
    | "director"
    | "image"
    | "voice"
    | "music"
    | "sound"
    | "audio_production"
    | "audio_assets"
    | "video";
  labelKey: string;
  level: AssetReadinessLevel;
  detailKey: string | null;
};

export type ProductionWarningSeverity = "info" | "warning" | "blocking";

export type ProductionWarning = {
  code: string;
  severity: ProductionWarningSeverity;
  messageKey: string;
  params?: Record<string, string | number>;
};

export function computeReadinessScore(params: {
  assetItems: AssetReadinessItem[];
  warningCount: number;
  blockingCount: number;
}): number {
  if (params.assetItems.length === 0) {
    return 0;
  }
  const levelScore = (level: AssetReadinessLevel) =>
    level === "ready" ? 100 : level === "attention" ? 55 : 15;
  const avg =
    params.assetItems.reduce((sum, item) => sum + levelScore(item.level), 0) /
    params.assetItems.length;
  const penalty = params.blockingCount * 18 + params.warningCount * 6;
  return Math.max(0, Math.min(100, Math.round(avg - penalty)));
}

export function buildAssetReadiness(storyboard: StudioStoryboardDetail): AssetReadinessItem[] {
  const scenes = [...storyboard.scenes].sort((a, b) => a.order - b.order);
  const directorProfile = normalizeStudioDirectorProfile(storyboard.directorProfile);
  const styleProfile = normalizeStudioPromptStyleProfile(storyboard.promptStyleProfile);
  const intelligence = analyzeStoryIntelligence(storyboardToFlowInput(storyboard), directorProfile);
  const imagePlan = analyzeSceneImagePlanner({ storyboard, directorProfile });
  const voiceReport = analyzeVoiceDirector(storyboard);
  const musicPlan = buildMusicDirectorPlan(storyboard);
  const soundPlan = buildSoundDirectorPlan(storyboard);
  const audioPlan = buildAudioProductionDirectorPlan(storyboard);
  const assetPlan = buildAudioAssetDirectorPlan(storyboard);
  const directorReport = buildDirectorQualityReport(storyboard);

  const storyLevel: AssetReadinessLevel =
    intelligence.storyHealthScore >= 72 && scenes.length >= 2
      ? "ready"
      : scenes.length === 0
        ? "not_ready"
        : "attention";

  const directorLevel: AssetReadinessLevel =
    directorReport.directorQualityScore >= 70
      ? "ready"
      : directorReport.scenesMissingShot > 0
        ? "attention"
        : "attention";

  const imageWarnings = imagePlan.warnings.length;
  const imageLevel: AssetReadinessLevel =
    imagePlan.readiness === "ready"
      ? "ready"
      : imagePlan.readiness === "not_ready"
        ? "not_ready"
        : "attention";

  let voiceLevel: AssetReadinessLevel = "ready";
  let voiceDetail: string | null = null;
  if (!storyboard.voiceEnabled) {
    voiceLevel = "attention";
    voiceDetail = "studio.production.asset.voice.disabled";
  } else if (!storyboard.voiceProfile?.trim()) {
    voiceLevel = "not_ready";
    voiceDetail = "studio.production.asset.voice.noProfile";
  } else if (!voiceReport.settingsValid) {
    voiceLevel = "attention";
    voiceDetail = "studio.production.asset.voice.invalidSettings";
  } else if (voiceReport.timing.warnings.length > 0) {
    voiceLevel = "attention";
    voiceDetail = "studio.production.asset.voice.timing";
  }

  const withImages = scenes.filter((s) => sceneHasCompletedImage(s)).length;
  const withSelection = scenes.filter((s) => resolveSceneDisplayImage(s)).length;
  const videoLevel: AssetReadinessLevel =
    scenes.length === 0
      ? "not_ready"
      : withSelection === scenes.length
        ? "ready"
        : withImages > 0
          ? "attention"
          : "attention";

  return [
    {
      id: "story",
      labelKey: "studio.production.asset.story",
      level: storyLevel,
      detailKey:
        storyLevel === "ready"
          ? null
          : intelligence.storyHealthScore < 50
            ? "studio.production.asset.story.lowHealth"
            : "studio.production.asset.story.incomplete",
    },
    {
      id: "director",
      labelKey: "studio.production.asset.director",
      level: directorLevel,
      detailKey:
        directorLevel === "ready"
          ? null
          : "studio.production.asset.director.incomplete",
    },
    {
      id: "image",
      labelKey: "studio.production.asset.image",
      level: imageLevel,
      detailKey:
        imageLevel === "ready"
          ? null
          : imageWarnings > 0
            ? "studio.production.asset.image.continuity"
            : "studio.production.asset.image.notReady",
    },
    {
      id: "voice",
      labelKey: "studio.production.asset.voice",
      level: voiceLevel,
      detailKey: voiceDetail,
    },
    {
      id: "music",
      labelKey: "studio.production.asset.music",
      level:
        !musicPlan.enabled
          ? "attention"
          : isMusicPlanReady(musicPlan)
            ? "ready"
            : musicPlan.sceneCues.length > 0
              ? "attention"
              : "not_ready",
      detailKey:
        !musicPlan.enabled
          ? "studio.production.asset.music.disabled"
          : isMusicPlanReady(musicPlan)
            ? null
            : "studio.production.asset.music.planIncomplete",
    },
    {
      id: "sound",
      labelKey: "studio.production.asset.sound",
      level:
        !soundPlan.enabled
          ? "attention"
          : isSoundPlanReady(soundPlan)
            ? "ready"
            : soundPlan.sceneCues.length > 0
              ? "attention"
              : "not_ready",
      detailKey:
        !soundPlan.enabled
          ? "studio.production.asset.sound.disabled"
          : isSoundPlanReady(soundPlan)
            ? null
            : "studio.production.asset.sound.planIncomplete",
    },
    {
      id: "audio_production",
      labelKey: "studio.production.asset.audioProduction",
      level:
        !audioPlan.enabled
          ? "attention"
          : isAudioProductionPlanReady(audioPlan)
            ? "ready"
            : audioPlan.sceneCues.length > 0
              ? "attention"
              : "not_ready",
      detailKey:
        !audioPlan.enabled
          ? "studio.production.asset.audioProduction.disabled"
          : isAudioProductionPlanReady(audioPlan)
            ? null
            : "studio.production.asset.audioProduction.planIncomplete",
    },
    {
      id: "audio_assets",
      labelKey: "studio.production.asset.audioAssets",
      level:
        !assetPlan.enabled
          ? "attention"
          : isAudioAssetPlanReady(assetPlan)
            ? "ready"
            : assetPlan.scenePackages.length > 0
              ? "attention"
              : "not_ready",
      detailKey:
        !assetPlan.enabled
          ? "studio.production.asset.audioAssets.disabled"
          : isAudioAssetPlanReady(assetPlan)
            ? null
            : "studio.production.asset.audioAssets.planIncomplete",
    },
    {
      id: "video",
      labelKey: "studio.production.asset.video",
      level: videoLevel,
      detailKey:
        videoLevel === "ready"
          ? null
          : "studio.production.asset.video.missingSelection",
    },
  ];
}

export function buildProductionWarnings(storyboard: StudioStoryboardDetail): ProductionWarning[] {
  const warnings: ProductionWarning[] = [];
  const scenes = [...storyboard.scenes].sort((a, b) => a.order - b.order);
  const styleProfile = normalizeStudioPromptStyleProfile(storyboard.promptStyleProfile);
  const directorProfile = normalizeStudioDirectorProfile(storyboard.directorProfile);
  const imagePlan = analyzeSceneImagePlanner({ storyboard, directorProfile });
  const voiceReport = analyzeVoiceDirector(storyboard);
  const intelligence = analyzeStoryIntelligence(storyboardToFlowInput(storyboard), directorProfile);

  if (scenes.length === 0) {
    warnings.push({
      code: "no_scenes",
      severity: "blocking",
      messageKey: "studio.production.warning.noScenes",
    });
    return warnings;
  }

  const missingCharacters = scenes.filter((s) => s.characters.length === 0).length;
  if (missingCharacters > 0) {
    warnings.push({
      code: "missing_characters",
      severity: missingCharacters === scenes.length ? "blocking" : "warning",
      messageKey: "studio.production.warning.missingCharacters",
      params: { count: missingCharacters },
    });
  }

  const missingLocations = scenes.filter((s) => !s.locationId).length;
  if (missingLocations > 0) {
    warnings.push({
      code: "missing_locations",
      severity: "warning",
      messageKey: "studio.production.warning.missingLocations",
      params: { count: missingLocations },
    });
  }

  let scenesWithoutPrompt = 0;
  for (const scene of scenes) {
    const snap = studioSceneDetailToSnapshot(scene);
    const promptQuality = scorePromptQuality(
      studioSceneDetailToPromptInput(scene, styleProfile, directorProfile)
    );
    const health = scoreSceneImageHealth({ scene: snap, styleProfile });
    if (promptQuality.score < 35 && health.score < 45) {
      scenesWithoutPrompt += 1;
    }
  }
  if (scenesWithoutPrompt > 0) {
    warnings.push({
      code: "missing_prompts",
      severity: scenesWithoutPrompt >= scenes.length / 2 ? "blocking" : "warning",
      messageKey: "studio.production.warning.missingPrompts",
      params: { count: scenesWithoutPrompt },
    });
  }

  if (storyboard.voiceEnabled && !storyboard.voiceNarrationScript?.trim()) {
    warnings.push({
      code: "missing_narration",
      severity: "warning",
      messageKey: "studio.production.warning.missingNarration",
    });
  }

  if (storyboard.voiceEnabled && !storyboard.voiceProfile?.trim()) {
    warnings.push({
      code: "missing_voice_profile",
      severity: "warning",
      messageKey: "studio.production.warning.missingVoiceProfile",
    });
  }

  if (!storyboard.directorProfile?.trim()) {
    warnings.push({
      code: "missing_director_profile",
      severity: "info",
      messageKey: "studio.production.warning.missingDirectorProfile",
    });
  }

  for (const w of imagePlan.warnings.slice(0, 4)) {
    warnings.push({
      code: `image_${w.code}`,
      severity: w.code === "location_jump" ? "warning" : "info",
      messageKey: w.messageKey,
      params: w.params,
    });
  }

  for (const w of voiceReport.timing.warnings.slice(0, 3)) {
    warnings.push({
      code: `voice_${w.code}`,
      severity: w.code === "exceeds_scene_duration" ? "warning" : "info",
      messageKey: "studio.production.warning.voiceTiming",
      params: w.params,
    });
  }

  if (intelligence.storyHealthScore < 50) {
    warnings.push({
      code: "low_story_health",
      severity: "warning",
      messageKey: "studio.production.warning.lowStoryHealth",
      params: { score: intelligence.storyHealthScore },
    });
  }

  if (imagePlan.visualConsistencyScore < 50) {
    warnings.push({
      code: "low_visual_consistency",
      severity: "warning",
      messageKey: "studio.production.warning.lowVisualConsistency",
      params: { score: imagePlan.visualConsistencyScore },
    });
  }

  return warnings;
}
