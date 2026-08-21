import { buildAudioProductionDirectorPlan } from "@/lib/studio-audio-production-director";
import { buildMusicDirectorPlan } from "@/lib/studio-music-director";
import {
  buildSceneTimelineSegments,
  isHardCutTransition,
  mixVolumeFromPercent,
  totalDurationFromSegments,
  type StudioAudioMixHandoffPlan,
} from "@/lib/studio-audio-mix-timeline";
import {
  buildAudioMixExecutionPlan,
  resolveStudioAudioTimeline,
} from "@/lib/studio-audio-timeline-resolve";
import { readS2cMetadataFromAudioAssetJson } from "@/lib/studio-preset-materialization-plan";
import { parseStoryboardAudioAssetLinks } from "@/lib/studio-storyboard-audio-asset-links";
import { findUserAudioLibraryAsset } from "@/lib/studio-user-audio-library-find";
import { isAudioDuckingMode } from "@/lib/studio-audio-production-validation";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import type { UserAudioLibraryAsset } from "@/types/studio-user-audio-library";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type { StudioAudioTimeline } from "@/types/studio-audio-timeline";

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

export function resolveStoryboardAudioTimeline(params: {
  storyboard: StudioStoryboardDetail;
  userLibrary: UserAudioLibraryAsset[];
  voiceAudioUrl?: string | null;
  voiceDurationSeconds?: number | null;
  voiceAssetId?: string | null;
  audioAssetMetadataJson?: unknown;
  voiceLines?: Array<{
    sceneId: string;
    text: string;
    speakerId?: string | null;
    durationMs?: number;
  }>;
}): StudioAudioTimeline {
  const links = parseStoryboardAudioAssetLinks(
    params.audioAssetMetadataJson ?? params.storyboard.audioAssetLinks
  );
  const s2c = readS2cMetadataFromAudioAssetJson(
    params.audioAssetMetadataJson ??
      (params.storyboard as { audioAssetMetadataJson?: unknown }).audioAssetMetadataJson
  );
  const musicPlan = buildMusicDirectorPlan(params.storyboard);
  const productionPlan = buildAudioProductionDirectorPlan(params.storyboard);
  const firstProduction = productionPlan.sceneCues[0];
  const duckingRaw = firstProduction?.duckingMode ?? "music_under_voice";

  const musicAsset =
    findUserAudioLibraryAsset(params.userLibrary, links.musicAssetId)
    ?? suggestUserAssetForMusicCue(params.userLibrary, {
      mood: musicPlan.profileId,
      energy: musicPlan.intensity,
    });
  const soundAsset =
    findUserAudioLibraryAsset(params.userLibrary, links.soundAssetId)
    ?? suggestUserAssetForSoundCue(params.userLibrary, { category: "ambience" });

  const mix = firstProduction?.mixRecommendation ?? { voice: 70, music: 60, sound: 50 };
  const hints = s2c?.audioHints;

  return resolveStudioAudioTimeline({
    projectId: params.storyboard.id,
    scenes: params.storyboard.scenes.map((scene) => ({
      id: scene.id,
      order: scene.order,
      durationSeconds: scene.durationSeconds,
      musicTransitionType: scene.musicTransitionType,
      duckingMode: scene.duckingMode,
      action: scene.action,
      title: scene.title,
    })),
    voiceEnabled: params.storyboard.voiceEnabled,
    voiceAudioUrl: params.voiceAudioUrl,
    voiceAssetId: params.voiceAssetId,
    voiceDurationSeconds: params.voiceDurationSeconds,
    voiceLines: params.voiceLines,
    voiceProfile: params.storyboard.voiceProfile,
    voiceLanguage: params.storyboard.voiceLanguage,
    musicEnabled: params.storyboard.musicEnabled,
    musicAudioUrl: musicAsset?.audioUrl ?? null,
    musicAssetId: musicAsset?.id ?? links.musicAssetId,
    musicFadeInBehavior: musicPlan.sceneCues[0]?.startBehavior,
    musicFadeOutBehavior: musicPlan.sceneCues[0]?.endBehavior,
    musicVolume: mixVolumeFromPercent(mix.music),
    musicMood: hints?.musicMood ?? params.storyboard.musicNotes ?? null,
    soundEnabled: params.storyboard.soundEnabled,
    soundAudioUrl: soundAsset?.audioUrl ?? null,
    soundAssetId: soundAsset?.id ?? links.soundAssetId,
    soundVolume: mixVolumeFromPercent(mix.sound),
    duckingMode: duckingRaw,
    sfxSuggestions: hints?.sfxSuggestions ?? [],
    soundNotes: params.storyboard.soundNotes,
  });
}

export function buildStoryboardAudioMixPlan(params: {
  storyboard: StudioStoryboardDetail;
  userLibrary: UserAudioLibraryAsset[];
  voiceAudioUrl?: string | null;
  voiceDurationSeconds?: number | null;
  voiceAssetId?: string | null;
  audioAssetMetadataJson?: unknown;
  voiceLines?: Array<{
    sceneId: string;
    text: string;
    speakerId?: string | null;
    durationMs?: number;
  }>;
}): StudioAudioMixHandoffPlan {
  const links = parseStoryboardAudioAssetLinks(
    params.audioAssetMetadataJson ?? params.storyboard.audioAssetLinks
  );
  const musicPlan = buildMusicDirectorPlan(params.storyboard);
  const productionPlan = buildAudioProductionDirectorPlan(params.storyboard);
  const firstCue = musicPlan.sceneCues[0];
  const firstProduction = productionPlan.sceneCues[0];

  const timeline = resolveStoryboardAudioTimeline(params);
  const execution = buildAudioMixExecutionPlan(timeline);

  const sceneSegments = buildSceneTimelineSegments(
    timeline.sceneSpans.map((span) => ({
      id: span.sceneId,
      order: span.order,
      durationSeconds: span.visualDurationMs / 1000,
      musicTransitionType: params.storyboard.scenes.find((s) => s.id === span.sceneId)
        ?.musicTransitionType,
    }))
  );
  const totalDurationSeconds = Math.max(
    totalDurationFromSegments(sceneSegments),
    execution.totalDurationMs / 1000
  );

  const duckingRaw = firstProduction?.duckingMode ?? "music_under_voice";
  const duckingMode = isAudioDuckingMode(duckingRaw) ? duckingRaw : "music_under_voice";
  const hasVoice = Boolean(params.voiceAudioUrl?.trim() && params.storyboard.voiceEnabled);

  const musicEnabled = Boolean(params.storyboard.musicEnabled && execution.music.url);
  const soundEnabled = Boolean(
    params.storyboard.soundEnabled && (execution.ambience.url || execution.discreteSfx.length)
  );

  return {
    enabled: musicEnabled || soundEnabled || hasVoice,
    musicEnabled,
    soundEnabled,
    voiceEnabled: hasVoice,
    totalDurationSeconds,
    duckingMode,
    voiceVolume: execution.voice.volume,
    musicVolume: execution.music.volume,
    soundVolume: execution.ambience.volume,
    musicFadeInSeconds: execution.music.fadeInMs / 1000,
    musicFadeOutSeconds: execution.music.fadeOutMs / 1000,
    musicHardCut: isHardCutTransition(firstCue?.transitionType ?? "crossfade"),
    voiceAudioUrl: params.voiceAudioUrl?.trim() || null,
    musicAudioUrl: musicEnabled ? execution.music.url : null,
    soundAudioUrl: execution.ambience.url,
    musicAssetName:
      findUserAudioLibraryAsset(params.userLibrary, links.musicAssetId)?.name ?? null,
    soundAssetName:
      findUserAudioLibraryAsset(params.userLibrary, links.soundAssetId)?.name ?? null,
    sceneSegments,
    mixReady: hasVoice || musicEnabled || soundEnabled,
    discreteSfx: execution.discreteSfx.map((c) => ({
      cueId: c.cueId,
      url: c.url,
      startSeconds: c.startMs / 1000,
      durationSeconds: c.durationMs / 1000,
      volume: c.volume,
      assetId: c.assetId,
    })),
    duckingEnvelopes: execution.duckingEnvelopes.map((e) => ({
      startSeconds: e.startMs / 1000,
      endSeconds: e.endMs / 1000,
      musicGain: e.musicGain,
      ambienceGain: e.ambienceGain,
      attackSeconds: e.attackMs / 1000,
      releaseSeconds: e.releaseMs / 1000,
    })),
    timelineHash: timeline.timelineHash,
    musicSourceOffsetSeconds: execution.music.sourceOffsetMs / 1000,
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
