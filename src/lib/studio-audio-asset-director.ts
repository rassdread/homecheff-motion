/**
 * Studio V38 — Audio Asset Director (no generation, no provider integration).
 * Assigns concrete audio assets to scenes from V31–V37 planning layers.
 */

import { buildAudioProductionDirectorPlan } from "@/lib/studio-audio-production-director";
import { buildCharacterVoiceAssignments } from "@/lib/studio-character-voice";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import { storyboardToFlowInput } from "@/lib/studio-movie-director-quality";
import { buildMusicDirectorPlan } from "@/lib/studio-music-director";
import { selectMusicAssetForCue } from "@/lib/studio-music-asset-selector";
import {
  getStudioAudioAsset,
  parseAssetIdList,
  toAssignedAsset,
} from "@/lib/studio-audio-asset-library";
import { buildStoryArc } from "@/lib/studio-story-arc";
import { buildSoundDirectorPlan } from "@/lib/studio-sound-director";
import { selectSoundAssetsForCue } from "@/lib/studio-sound-asset-selector";
import { analyzeVoiceDirector } from "@/lib/studio-voice-director";
import { selectVoiceAssetsForScene } from "@/lib/studio-voice-asset-selector";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";
import type {
  AssignedAudioAsset,
  AudioAssetPlan,
  AudioAssetWarning,
  MotionAudioAssetHandoffPlan,
  SceneAudioAssetPackage,
  StudioAudioAsset,
} from "@/types/studio-audio-asset-director";

const MAX_SCENE_AUDIO_LAYERS = 8;

function sceneHasNarration(params: {
  sceneId: string;
  voiceEnabled: boolean;
  voiceReport: ReturnType<typeof analyzeVoiceDirector>;
}): boolean {
  if (!params.voiceEnabled) {
    return false;
  }
  const timing = params.voiceReport.timing.sceneTimings.find((t) => t.sceneId === params.sceneId);
  if (timing && timing.words > 3) {
    return true;
  }
  const narration = params.voiceReport.script.sceneNarrations.find((n) => n.sceneId === params.sceneId);
  return Boolean(narration?.text?.trim());
}

function applyOverrides(
  recommended: AssignedAudioAsset[],
  overrideIds: string[],
  category: AssignedAudioAsset["category"]
): { assets: AssignedAudioAsset[]; hasOverride: boolean } {
  if (overrideIds.length === 0) {
    return { assets: recommended, hasOverride: false };
  }
  const assets = overrideIds
    .map((id) => getStudioAudioAsset(id))
    .filter((a): a is StudioAudioAsset => Boolean(a && a.category === category))
    .map((a) => toAssignedAsset(a, "override"));
  return { assets: assets.length > 0 ? assets : recommended, hasOverride: assets.length > 0 };
}

function buildAssetSummary(packages: SceneAudioAssetPackage[]): string {
  if (packages.length === 0) {
    return "";
  }
  const voiceCount = packages.filter((p) => p.voiceAssets.length > 0).length;
  const musicCount = packages.filter((p) => p.musicAssets.length > 0).length;
  const sfxCount = packages.filter((p) => p.sfxAssets.length > 0).length;
  return `${voiceCount} voice · ${musicCount} music · ${sfxCount} sfx scenes`;
}

function detectAssetConflicts(params: {
  storyboard: StudioStoryboardDetail;
  packages: SceneAudioAssetPackage[];
  musicEnabled: boolean;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  musicPlan: ReturnType<typeof buildMusicDirectorPlan>;
  soundPlan: ReturnType<typeof buildSoundDirectorPlan>;
}): AudioAssetWarning[] {
  const warnings: AudioAssetWarning[] = [];
  const lang = (params.storyboard.voiceLanguage ?? "en").trim().slice(0, 2).toLowerCase();

  for (const pkg of params.packages) {
    const scene = params.storyboard.scenes.find((s) => s.id === pkg.sceneId);
    const duration = scene?.durationSeconds ?? 5;

    if (params.musicEnabled && params.musicPlan.sceneCues.some((c) => c.sceneId === pkg.sceneId)) {
      if (pkg.musicAssets.length === 0) {
        warnings.push({
          code: "music_asset_missing",
          severity: "warning",
          messageKey: "studio.audioAsset.warning.musicMissing",
          params: { scene: pkg.order + 1 },
        });
      } else {
        for (const assigned of pkg.musicAssets) {
          const asset = getStudioAudioAsset(assigned.assetId);
          if (asset && asset.duration > 0 && asset.duration < duration * 0.5) {
            warnings.push({
              code: "asset_duration_short",
              severity: "warning",
              messageKey: "studio.audioAsset.warning.durationShort",
              params: { scene: pkg.order + 1, asset: asset.name },
            });
          }
        }
      }
    }

    if (params.soundEnabled) {
      const soundCue = params.soundPlan.sceneCues.find((c) => c.sceneId === pkg.sceneId);
      if (soundCue && soundCue.environmentSounds.length > 0 && pkg.ambienceAssets.length === 0) {
        warnings.push({
          code: "no_ambience_selected",
          severity: "warning",
          messageKey: "studio.audioAsset.warning.noAmbience",
          params: { scene: pkg.order + 1 },
        });
      }
    }

    for (const voice of pkg.voiceAssets) {
      const asset = getStudioAudioAsset(voice.assetId);
      if (asset?.language && lang && asset.language !== lang) {
        warnings.push({
          code: "voice_language_mismatch",
          severity: "warning",
          messageKey: "studio.audioAsset.warning.voiceLanguage",
          params: { scene: pkg.order + 1, language: lang },
        });
      }
    }

    const layerCount =
      pkg.voiceAssets.length +
      pkg.musicAssets.length +
      pkg.ambienceAssets.length +
      pkg.sfxAssets.length;
    if (layerCount > MAX_SCENE_AUDIO_LAYERS) {
      warnings.push({
        code: "too_many_audio_layers",
        severity: "warning",
        messageKey: "studio.audioAsset.warning.tooManyLayers",
        params: { scene: pkg.order + 1, count: layerCount },
      });
    }
  }

  if (params.voiceEnabled && !params.packages.some((p) => p.voiceAssets.length > 0)) {
    warnings.push({
      code: "no_voice_assets",
      severity: "info",
      messageKey: "studio.audioAsset.warning.noVoiceAssets",
    });
  }

  return warnings;
}

function computeAssetScore(params: {
  enabled: boolean;
  packages: SceneAudioAssetPackage[];
  warnings: AudioAssetWarning[];
  productionScore: number;
}): number {
  if (!params.enabled || params.packages.length === 0) {
    return 0;
  }
  const assigned =
    params.packages.filter(
      (p) =>
        p.voiceAssets.length > 0 ||
        p.musicAssets.length > 0 ||
        p.ambienceAssets.length > 0 ||
        p.sfxAssets.length > 0
    ).length / params.packages.length;
  const base = Math.round(params.productionScore * 0.4 + assigned * 60);
  const penalty = params.warnings.filter((w) => w.severity === "warning").length * 5;
  return Math.max(0, Math.min(100, base - penalty));
}

function collectUniqueAssets(
  packages: SceneAudioAssetPackage[],
  pick: (pkg: SceneAudioAssetPackage) => AssignedAudioAsset[]
): StudioAudioAsset[] {
  const byId = new Map<string, StudioAudioAsset>();
  for (const pkg of packages) {
    for (const assigned of pick(pkg)) {
      const asset = getStudioAudioAsset(assigned.assetId);
      if (asset) {
        byId.set(asset.id, asset);
      }
    }
  }
  return [...byId.values()];
}

export function buildAudioAssetDirectorPlan(storyboard: StudioStoryboardDetail): AudioAssetPlan {
  const scenes = [...(storyboard.scenes ?? [])].sort((a, b) => a.order - b.order);
  const enabled = storyboard.audioAssetsEnabled ?? true;
  const directorProfile = normalizeStudioDirectorProfile(storyboard.directorProfile);

  const voiceReport = analyzeVoiceDirector(storyboard);
  const musicPlan = buildMusicDirectorPlan(storyboard);
  const soundPlan = buildSoundDirectorPlan(storyboard);
  const productionPlan = buildAudioProductionDirectorPlan(storyboard);
  const characterAssignments = buildCharacterVoiceAssignments(
    storyboard,
    storyboard.voiceLanguage ?? "en"
  );
  const arc = buildStoryArc(storyboardToFlowInput(storyboard));

  const voiceEnabled = Boolean(storyboard.voiceEnabled);
  const musicEnabled = Boolean(storyboard.musicEnabled);
  const soundEnabled = Boolean(storyboard.soundEnabled);

  const recommendations: string[] = [
    "studio.audioAsset.recommendation.followProductionPlan",
    "studio.audioAsset.recommendation.storyArcProgression",
  ];
  if (voiceEnabled) {
    recommendations.push("studio.audioAsset.recommendation.voicePerLanguage");
  }

  const scenePackages: SceneAudioAssetPackage[] = [];

  for (const scene of scenes) {
    const arcPhase = arc.find((a) => a.sceneId === scene.id)?.phase ?? "build_up";
    const productionCue = productionPlan.sceneCues.find((c) => c.sceneId === scene.id);
    const musicCue = musicPlan.sceneCues.find((c) => c.sceneId === scene.id);
    const soundCue = soundPlan.sceneCues.find((c) => c.sceneId === scene.id);
    const hasNarration = sceneHasNarration({ sceneId: scene.id, voiceEnabled, voiceReport });

    const voiceRec: AssignedAudioAsset[] = [];
    if (voiceEnabled && (hasNarration || scene.characters.length > 0)) {
      const { primary, backup } = selectVoiceAssetsForScene({
        scene,
        storyboardVoiceProfile: storyboard.voiceProfile ?? "warm_narrator",
        storyboardLanguage: storyboard.voiceLanguage ?? "en",
        characterAssignments,
        isNarrationScene: hasNarration,
      });
      if (primary) {
        voiceRec.push(toAssignedAsset(primary));
      }
      if (backup && productionCue?.audioFocus === "voice") {
        voiceRec.push(toAssignedAsset(backup));
      }
    }

    const musicRec: AssignedAudioAsset[] = [];
    if (musicEnabled && musicCue) {
      const musicAsset = selectMusicAssetForCue({
        cue: musicCue,
        profileId: musicPlan.profileId,
        directorProfile,
        arcPhase,
      });
      if (musicAsset) {
        musicRec.push(toAssignedAsset(musicAsset));
      }
    }

    const ambienceRec: AssignedAudioAsset[] = [];
    const sfxRec: AssignedAudioAsset[] = [];
    if (soundEnabled && soundCue) {
      const selected = selectSoundAssetsForCue(soundCue);
      ambienceRec.push(...selected.ambience.map((a) => toAssignedAsset(a)));
      sfxRec.push(...selected.sfx.map((a) => toAssignedAsset(a)));
    }

    const voiceOverride = applyOverrides(
      voiceRec,
      parseAssetIdList(scene.voiceAssetOverride),
      "voice"
    );
    const musicOverride = applyOverrides(
      musicRec,
      parseAssetIdList(scene.musicAssetOverride),
      "music"
    );
    const ambienceOverride = applyOverrides(
      ambienceRec,
      parseAssetIdList(scene.ambienceAssetOverride),
      "ambience"
    );
    const sfxOverride = applyOverrides(
      sfxRec,
      parseAssetIdList(scene.sfxAssetOverride),
      "sfx"
    );

    const hasUserOverrides =
      voiceOverride.hasOverride ||
      musicOverride.hasOverride ||
      ambienceOverride.hasOverride ||
      sfxOverride.hasOverride;

    scenePackages.push({
      sceneId: scene.id,
      order: scene.order,
      title: scene.title,
      arcPhase,
      voiceAssets: voiceOverride.assets,
      musicAssets: musicOverride.assets,
      ambienceAssets: ambienceOverride.assets,
      sfxAssets: sfxOverride.assets,
      hasUserOverrides,
    });
  }

  const warnings = detectAssetConflicts({
    storyboard,
    packages: scenePackages,
    musicEnabled,
    soundEnabled,
    voiceEnabled,
    musicPlan,
    soundPlan,
  });

  const assetSummary = storyboard.audioAssetNotes?.trim() || buildAssetSummary(scenePackages);

  const assignedVoiceAssets = collectUniqueAssets(scenePackages, (p) => p.voiceAssets);
  const assignedMusicAssets = collectUniqueAssets(scenePackages, (p) => p.musicAssets);
  const assignedSoundAssets = [
    ...collectUniqueAssets(scenePackages, (p) => p.ambienceAssets),
    ...collectUniqueAssets(scenePackages, (p) => p.sfxAssets),
  ].filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i);

  const assetScore = computeAssetScore({
    enabled,
    packages: scenePackages,
    warnings,
    productionScore: productionPlan.audioScore,
  });

  return {
    enabled,
    assetSummary,
    scenePackages,
    assignedVoiceAssets,
    assignedMusicAssets,
    assignedSoundAssets,
    warnings,
    recommendations,
    assetScore,
  };
}

export function buildMotionAudioAssetHandoffPlan(
  storyboard: StudioStoryboardDetail
): MotionAudioAssetHandoffPlan {
  const plan = buildAudioAssetDirectorPlan(storyboard);
  return {
    enabled: plan.enabled,
    assetSummary: plan.assetSummary,
    scenePackages: plan.scenePackages,
    assignedVoiceAssets: plan.assignedVoiceAssets,
    assignedMusicAssets: plan.assignedMusicAssets,
    assignedSoundAssets: plan.assignedSoundAssets,
    assetWarnings: plan.warnings,
    recommendations: plan.recommendations,
  };
}

export function isAudioAssetPlanReady(plan: AudioAssetPlan): boolean {
  return (
    plan.enabled &&
    plan.scenePackages.length > 0 &&
    plan.warnings.every(
      (w) =>
        w.severity !== "warning" ||
        w.code === "asset_duration_short" ||
        w.code === "too_many_audio_layers" ||
        w.code === "voice_language_mismatch"
    )
  );
}
