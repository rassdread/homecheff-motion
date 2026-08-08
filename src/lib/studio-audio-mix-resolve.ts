import { buildAudioProductionDirectorPlan } from "@/lib/studio-audio-production-director";
import { buildMusicDirectorPlan } from "@/lib/studio-music-director";
import {
  buildSceneTimelineSegments,
  duckingMusicMultiplier,
  duckingSoundMultiplier,
  fadeSecondsFromEndBehavior,
  fadeSecondsFromStartBehavior,
  isHardCutTransition,
  mixVolumeFromPercent,
  totalDurationFromSegments,
  type StudioAudioMixHandoffPlan,
} from "@/lib/studio-audio-mix-timeline";
import { parseStoryboardAudioAssetLinks } from "@/lib/studio-storyboard-audio-asset-links";
import { findUserAudioLibraryAsset } from "@/lib/studio-user-audio-library-find";
import { isAudioDuckingMode } from "@/lib/studio-audio-production-validation";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import type { UserAudioLibraryAsset } from "@/types/studio-user-audio-library";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";

export function suggestUserAssetForMusicCue(
  assets: UserAudioLibraryAsset[],
  params: { mood?: string; energy?: string }
): UserAudioLibraryAsset | null {
  const musicAssets = assets.filter((a) => a.kind === "music");
  if (musicAssets.length === 0) {
    return null;
  }
  const mood = (params.mood ?? "").trim().toLowerCase();
  const energy = (params.energy ?? "").trim().toLowerCase();
  const scored = musicAssets.map((asset) => {
    let score = 0;
    if (mood && asset.mood.toLowerCase().includes(mood)) {
      score += 2;
    }
    if (energy && asset.energy === energy) {
      score += 2;
    }
    if (mood && asset.category.toLowerCase().includes(mood)) {
      score += 1;
    }
    return { asset, score };
  });
  scored.sort((a, b) => b.score - a.score || b.asset.createdAt.localeCompare(a.asset.createdAt));
  return scored[0]?.asset ?? musicAssets[0] ?? null;
}

export function suggestUserAssetForSoundCue(
  assets: UserAudioLibraryAsset[],
  params: { category?: string }
): UserAudioLibraryAsset | null {
  const sfxAssets = assets.filter((a) => a.kind === "sfx");
  if (sfxAssets.length === 0) {
    return null;
  }
  const category = (params.category ?? "ambience").trim().toLowerCase();
  const match =
    sfxAssets.find((a) => a.category.toLowerCase() === category)
    ?? sfxAssets.find((a) => a.category.toLowerCase().includes(category))
    ?? sfxAssets[0];
  return match ?? null;
}

export function buildStoryboardAudioMixPlan(params: {
  storyboard: StudioStoryboardDetail;
  userLibrary: UserAudioLibraryAsset[];
  voiceAudioUrl?: string | null;
  audioAssetMetadataJson?: unknown;
}): StudioAudioMixHandoffPlan {
  const links = parseStoryboardAudioAssetLinks(
    params.audioAssetMetadataJson ?? params.storyboard.audioAssetLinks
  );
  const musicPlan = buildMusicDirectorPlan(params.storyboard);
  const productionPlan = buildAudioProductionDirectorPlan(params.storyboard);
  const firstCue = musicPlan.sceneCues[0];
  const firstProduction = productionPlan.sceneCues[0];

  const sceneSegments = buildSceneTimelineSegments(
    params.storyboard.scenes.map((scene) => ({
      id: scene.id,
      order: scene.order,
      durationSeconds: scene.durationSeconds,
      musicTransitionType: scene.musicTransitionType,
    }))
  );
  const totalDurationSeconds = Math.max(
    totalDurationFromSegments(sceneSegments),
    params.storyboard.scenes.reduce((sum, s) => sum + Math.max(0.5, s.durationSeconds || 5), 0)
  );

  const musicAsset =
    findUserAudioLibraryAsset(params.userLibrary, links.musicAssetId)
    ?? suggestUserAssetForMusicCue(params.userLibrary, {
      mood: musicPlan.profileId,
      energy: musicPlan.intensity,
    });

  const soundAsset =
    findUserAudioLibraryAsset(params.userLibrary, links.soundAssetId)
    ?? suggestUserAssetForSoundCue(params.userLibrary, { category: "ambience" });

  const duckingRaw = firstProduction?.duckingMode ?? "music_under_voice";
  const duckingMode = isAudioDuckingMode(duckingRaw) ? duckingRaw : "music_under_voice";
  const mix = firstProduction?.mixRecommendation ?? { voice: 70, music: 60, sound: 50 };
  const hasVoice = Boolean(params.voiceAudioUrl?.trim() && params.storyboard.voiceEnabled);

  const voiceVolume = mixVolumeFromPercent(mix.voice);
  const musicVolume =
    mixVolumeFromPercent(mix.music) * duckingMusicMultiplier(duckingMode, hasVoice);
  const soundVolume =
    mixVolumeFromPercent(mix.sound) * duckingSoundMultiplier(duckingMode, hasVoice);

  const musicEnabled = Boolean(params.storyboard.musicEnabled && musicAsset);
  const soundEnabled = Boolean(params.storyboard.soundEnabled && soundAsset);

  return {
    enabled: musicEnabled || soundEnabled || hasVoice,
    musicEnabled,
    soundEnabled,
    voiceEnabled: hasVoice,
    totalDurationSeconds,
    duckingMode,
    voiceVolume,
    musicVolume,
    soundVolume,
    musicFadeInSeconds: fadeSecondsFromStartBehavior(firstCue?.startBehavior ?? "fade_in"),
    musicFadeOutSeconds: fadeSecondsFromEndBehavior(firstCue?.endBehavior ?? "fade_out"),
    musicHardCut: isHardCutTransition(firstCue?.transitionType ?? "crossfade"),
    voiceAudioUrl: params.voiceAudioUrl?.trim() || null,
    musicAudioUrl: musicEnabled ? musicAsset?.audioUrl ?? null : null,
    soundAudioUrl: soundEnabled ? soundAsset?.audioUrl ?? null : null,
    musicAssetName: musicAsset?.name ?? null,
    soundAssetName: soundAsset?.name ?? null,
    sceneSegments,
    mixReady: hasVoice || musicEnabled || soundEnabled,
  };
}

export function buildAudioMixPlanFromHandoff(
  handoff: MotionHandoffPayload
): StudioAudioMixHandoffPlan | null {
  if (handoff.audioMixPlan) {
    return handoff.audioMixPlan;
  }
  return null;
}
