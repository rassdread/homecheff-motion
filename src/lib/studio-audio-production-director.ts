/**
 * Studio V37 — Audio Production Director (no audio generation).
 * Combines Voice (V31–33), Music (V35), and Sound (V36) into a unified mix plan.
 */

import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import { buildMusicDirectorPlan } from "@/lib/studio-music-director";
import { buildSoundDirectorPlan } from "@/lib/studio-sound-director";
import { storyboardToFlowInput } from "@/lib/studio-movie-director-quality";
import { buildStoryArc, type StoryArcPhase } from "@/lib/studio-story-arc";
import { analyzeVoiceDirector } from "@/lib/studio-voice-director";
import {
  collectStoryboardCharacters,
  matchCharacterBySpeakerName,
  parseSpeakerTaggedScript,
  scriptUsesSpeakerTags,
} from "@/lib/studio-character-voice";
import {
  MIX_TEMPLATES,
  normalizeAudioPriorityStrategy,
  normalizeStudioAudioStyleId,
  resolveAudioStyleForDirector,
  type StudioAudioStyleId,
} from "@/lib/studio-audio-production-profiles";
import { clampMixLevel, isAudioDuckingMode, isAudioFocusType } from "@/lib/studio-audio-production-validation";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";
import type {
  AudioDuckingMode,
  AudioFocusType,
  AudioProductionPlan,
  AudioProductionWarning,
  MotionAudioProductionHandoffPlan,
  SceneAudioProductionCue,
  SceneDuckingRecommendations,
  SceneMixRecommendation,
} from "@/types/studio-audio-production-director";

const HIGH_LAYER_THRESHOLD = 5;

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
  return Boolean(narration?.text?.trim() && countWords(narration.text) > 3);
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function musicIntensityToLevel(target: string): number {
  if (target === "high") {
    return 90;
  }
  if (target === "low") {
    return 30;
  }
  return 60;
}

function arcPhaseMixModifier(phase: StoryArcPhase): Partial<SceneMixRecommendation> {
  switch (phase) {
    case "opening":
      return { music: -15, sound: -20 };
    case "build_up":
    case "discovery":
      return { music: 5, sound: 5 };
    case "climax":
      return { music: 20, sound: 25 };
    case "resolution":
    case "outro":
      return { music: -20, sound: -25 };
    default:
      return {};
  }
}

function resolveSpeakerPriority(scene: StudioSceneDetail, storyboard: StudioStoryboardDetail): string | null {
  const script = storyboard.voiceNarrationScript?.trim();
  if (script && scriptUsesSpeakerTags(script)) {
    const segments = parseSpeakerTaggedScript(script);
    const sceneNarration = segments[scene.order];
    if (sceneNarration) {
      const characters = collectStoryboardCharacters(storyboard);
      const match = matchCharacterBySpeakerName(sceneNarration.speaker, characters);
      if (/narrator/i.test(sceneNarration.speaker)) {
        return "Narrator > Character";
      }
      if (match && scene.characters.length > 1) {
        const primary = scene.characters[0];
        if (primary && primary.id === match.id) {
          return "Main Character > Background Character";
        }
        return `${match.name} > Background`;
      }
      return sceneNarration.speaker;
    }
  }
  if (scene.characters.length > 1) {
    return `${scene.characters[0]?.name ?? "Lead"} > Background Character`;
  }
  if (scene.characters.length === 1) {
    return scene.characters[0]!.name;
  }
  return storyboard.voiceEnabled ? "Narrator" : null;
}

function inferAudioFocus(params: {
  scene: StudioSceneDetail;
  hasNarration: boolean;
  musicCueType: string;
  musicEnergy: string;
  soundDensityScore: number;
  arcPhase: StoryArcPhase;
  sceneEnergy: string;
}): AudioFocusType {
  if (params.hasNarration) {
    return "voice";
  }
  if (
    params.arcPhase === "climax" ||
    params.musicCueType === "climax" ||
    params.musicEnergy === "high"
  ) {
    if (params.soundDensityScore >= HIGH_LAYER_THRESHOLD && params.sceneEnergy === "intense") {
      return "sound";
    }
    return params.soundDensityScore >= HIGH_LAYER_THRESHOLD + 1 ? "sound" : "music";
  }
  if (
    params.soundDensityScore >= HIGH_LAYER_THRESHOLD ||
    params.sceneEnergy === "intense" ||
    params.sceneEnergy === "dynamic"
  ) {
    const actionHeavy = /fight|chase|run|crash|impact|action|deliver|rush/.test(
      `${params.scene.action} ${params.scene.description}`.toLowerCase()
    );
    if (actionHeavy || params.soundDensityScore >= HIGH_LAYER_THRESHOLD + 1) {
      return "sound";
    }
  }
  if (
    params.musicCueType === "build" ||
    params.arcPhase === "build_up" ||
    params.arcPhase === "discovery" ||
    /montage|sequence|journey/.test(
      `${params.scene.title} ${params.scene.description}`.toLowerCase()
    )
  ) {
    if (!params.hasNarration) {
      return "music";
    }
  }
  if (params.arcPhase === "opening" || params.arcPhase === "resolution") {
    return params.hasNarration ? "voice" : "balanced";
  }
  return "balanced";
}

function mixForFocus(
  focus: AudioFocusType,
  arcPhase: StoryArcPhase,
  styleBias: { voiceBias: number; musicBias: number; soundBias: number }
): SceneMixRecommendation {
  let base: SceneMixRecommendation;
  switch (focus) {
    case "voice":
      base = { ...MIX_TEMPLATES.voice_heavy };
      break;
    case "music":
      base = { ...MIX_TEMPLATES.montage };
      break;
    case "sound":
      base = { ...MIX_TEMPLATES.sound_action };
      break;
    default:
      base = { ...MIX_TEMPLATES.balanced };
  }
  if (arcPhase === "opening") {
    base = { ...MIX_TEMPLATES.opening_clean };
  } else if (arcPhase === "climax") {
    base = { ...MIX_TEMPLATES.climax };
  } else if (arcPhase === "resolution" || arcPhase === "outro") {
    base = { ...MIX_TEMPLATES.resolution };
  }
  const mod = arcPhaseMixModifier(arcPhase);
  const mix: SceneMixRecommendation = {
    voice: clampMixLevel(base.voice * styleBias.voiceBias + (mod.voice ?? 0)),
    music: clampMixLevel(base.music * styleBias.musicBias + (mod.music ?? 0)),
    sound: clampMixLevel(base.sound * styleBias.soundBias + (mod.sound ?? 0)),
  };
  if (focus === "voice") {
    mix.voice = Math.max(mix.voice, 85);
  }
  if (focus === "music") {
    mix.music = Math.max(mix.music, 80);
  }
  if (focus === "sound") {
    mix.sound = Math.max(mix.sound, 75);
  }
  return mix;
}

function duckingForScene(params: {
  hasNarration: boolean;
  focus: AudioFocusType;
  musicDucking: boolean;
  soundDucking: boolean;
  soundDensityScore: number;
}): { mode: AudioDuckingMode; rec: SceneDuckingRecommendations } {
  if (!params.hasNarration) {
    return {
      mode: "none",
      rec: { music: false, sound: false },
    };
  }
  const music = params.musicDucking || params.focus === "voice";
  const sound =
    params.soundDucking || params.focus === "voice" || params.soundDensityScore >= 4;
  const mode: AudioDuckingMode =
    music && sound ? "full_under_voice"
    : music ? "music_under_voice"
    : sound ? "ambient_reduce"
    : "none";
  return { mode, rec: { music, sound } };
}

function buildAudioFocusSummary(cues: SceneAudioProductionCue[]): string {
  if (cues.length === 0) {
    return "";
  }
  const counts = { voice: 0, music: 0, sound: 0, balanced: 0 };
  for (const cue of cues) {
    counts[cue.audioFocus] += 1;
  }
  const dominant = (Object.entries(counts) as [AudioFocusType, number][]).sort(
    (a, b) => b[1] - a[1]
  )[0]![0];
  const labels = cues
    .slice(0, 4)
    .map((c) => `Scene ${c.order + 1}: ${c.audioFocus}`)
    .join("; ");
  return `${dominant} focus overall — ${labels}`;
}

function detectAudioConflicts(params: {
  storyboard: StudioStoryboardDetail;
  voiceEnabled: boolean;
  musicPlan: ReturnType<typeof buildMusicDirectorPlan>;
  soundPlan: ReturnType<typeof buildSoundDirectorPlan>;
  sceneCues: SceneAudioProductionCue[];
}): AudioProductionWarning[] {
  const warnings: AudioProductionWarning[] = [];
  const { musicPlan, soundPlan, sceneCues, voiceEnabled } = params;

  if (params.storyboard.musicEnabled && !musicPlan.enabled) {
    warnings.push({
      code: "music_disabled_mismatch",
      severity: "info",
      messageKey: "studio.audio.warning.musicDisabled",
    });
  }
  if (params.storyboard.soundEnabled && !soundPlan.enabled) {
    warnings.push({
      code: "sound_disabled_mismatch",
      severity: "info",
      messageKey: "studio.audio.warning.soundDisabled",
    });
  }
  if (params.storyboard.musicEnabled && musicPlan.sceneCues.length === 0) {
    warnings.push({
      code: "no_music_plan",
      severity: "warning",
      messageKey: "studio.audio.warning.noMusicPlan",
    });
  }
  if (params.storyboard.soundEnabled && soundPlan.sceneCues.length === 0) {
    warnings.push({
      code: "no_sound_plan",
      severity: "warning",
      messageKey: "studio.audio.warning.noSoundPlan",
    });
  }

  for (const cue of sceneCues) {
    const musicCue = musicPlan.sceneCues.find((m) => m.sceneId === cue.sceneId);
    const soundCue = soundPlan.sceneCues.find((s) => s.sceneId === cue.sceneId);
    const hasNarration = cue.audioFocus === "voice" || cue.voicePriority >= 80;

    if (hasNarration && voiceEnabled && musicCue?.energyTarget === "high") {
      warnings.push({
        code: "narration_loud_music",
        severity: "warning",
        messageKey: "studio.audio.warning.narrationLoudMusic",
        params: { scene: cue.order + 1 },
      });
    }
    if (soundCue && soundCue.densityScore >= HIGH_LAYER_THRESHOLD + 1) {
      warnings.push({
        code: "too_many_ambience_layers",
        severity: "warning",
        messageKey: "studio.audio.warning.tooManyAmbience",
        params: { scene: cue.order + 1, layers: soundCue.densityScore },
      });
    }
  }

  const highPriorityCount = sceneCues.filter(
    (c) => c.voicePriority >= 85 && c.musicPriority >= 85 && c.soundPriority >= 85
  ).length;
  if (highPriorityCount > 0) {
    warnings.push({
      code: "simultaneous_high_priorities",
      severity: "warning",
      messageKey: "studio.audio.warning.simultaneousPriorities",
      params: { count: highPriorityCount },
    });
  }

  const noFocus = sceneCues.filter((c) => !c.audioFocus).length;
  if (noFocus > 0) {
    warnings.push({
      code: "no_audio_focus",
      severity: "warning",
      messageKey: "studio.audio.warning.noAudioFocus",
      params: { count: noFocus },
    });
  }

  return warnings;
}

function computeAudioScore(params: {
  enabled: boolean;
  sceneCount: number;
  warnings: AudioProductionWarning[];
  voiceScore: number;
  musicScore: number;
  soundScore: number;
}): number {
  if (!params.enabled || params.sceneCount === 0) {
    return 0;
  }
  const base = Math.round(
    (params.voiceScore * 0.35 + params.musicScore * 0.3 + params.soundScore * 0.35) * 0.85
  );
  const penalty = params.warnings.filter((w) => w.severity === "warning").length * 6;
  return Math.max(0, Math.min(100, base + 10 - penalty));
}

export function buildAudioProductionDirectorPlan(
  storyboard: StudioStoryboardDetail
): AudioProductionPlan {
  const scenes = [...(storyboard.scenes ?? [])].sort((a, b) => a.order - b.order);
  const directorProfile = normalizeStudioDirectorProfile(storyboard.directorProfile);
  const enabled = storyboard.audioProductionEnabled ?? true;
  const styleProfile = resolveAudioStyleForDirector(
    directorProfile,
    storyboard.audioStyle?.trim() || null
  );
  const styleId = normalizeStudioAudioStyleId(
    storyboard.audioStyle?.trim() || styleProfile.id,
    styleProfile.id as StudioAudioStyleId
  );
  const priorityStrategy = normalizeAudioPriorityStrategy(
    storyboard.audioPriorityStrategy?.trim(),
    styleProfile.defaultStrategy
  );

  const voiceReport = analyzeVoiceDirector(storyboard);
  const musicPlan = buildMusicDirectorPlan(storyboard);
  const soundPlan = buildSoundDirectorPlan(storyboard);
  const flowInput = storyboardToFlowInput(storyboard);
  const arc = buildStoryArc(flowInput);

  const voiceEnabled = Boolean(storyboard.voiceEnabled);
  const musicEnabled = Boolean(storyboard.musicEnabled);
  const soundEnabled = Boolean(storyboard.soundEnabled);

  const recommendations: string[] = [];
  if (voiceEnabled) {
    recommendations.push("studio.audio.recommendation.voiceWins");
    recommendations.push("studio.audio.recommendation.duckingUnderNarration");
  }
  if (musicEnabled) {
    recommendations.push("studio.audio.recommendation.followMusicArc");
  }
  if (soundEnabled) {
    recommendations.push("studio.audio.recommendation.balanceAmbience");
  }
  if (priorityStrategy === "cinematic") {
    recommendations.push("studio.audio.recommendation.cinematicDynamics");
  }

  const sceneCues: SceneAudioProductionCue[] = [];

  for (const scene of scenes) {
    const arcEntry = arc.find((a) => a.sceneId === scene.id);
    const phase = arcEntry?.phase ?? "build_up";
    const musicCue = musicPlan.sceneCues.find((m) => m.sceneId === scene.id);
    const soundCue = soundPlan.sceneCues.find((s) => s.sceneId === scene.id);
    const hasNarration = sceneHasNarration({ sceneId: scene.id, voiceEnabled, voiceReport });

    const derivedFocus = inferAudioFocus({
      scene,
      hasNarration,
      musicCueType: musicCue?.cueType ?? "",
      musicEnergy: musicCue?.energyTarget ?? "medium",
      soundDensityScore: soundCue?.densityScore ?? 0,
      arcPhase: phase,
      sceneEnergy: scene.sceneEnergy,
    });

    const userFocus = scene.audioFocus?.trim();
    const audioFocus: AudioFocusType =
      userFocus && isAudioFocusType(userFocus) ? (userFocus as AudioFocusType) : derivedFocus;

    const mixRecommendation = mixForFocus(audioFocus, phase, styleProfile);

    if (musicCue) {
      const musicLevel = musicIntensityToLevel(musicCue.energyTarget);
      mixRecommendation.music = clampMixLevel(
        (mixRecommendation.music + musicLevel) / 2
      );
    }
    if (soundCue) {
      const sfxBoost = Math.min(30, soundCue.densityScore * 4);
      if (audioFocus === "sound") {
        mixRecommendation.sound = clampMixLevel(mixRecommendation.sound + sfxBoost);
      } else if (soundCue.dialoguePriority) {
        mixRecommendation.sound = clampMixLevel(mixRecommendation.sound - 15);
      }
    }
    if (priorityStrategy === "voice_first" && hasNarration) {
      mixRecommendation.voice = clampMixLevel(Math.max(mixRecommendation.voice, 90));
      mixRecommendation.music = clampMixLevel(Math.min(mixRecommendation.music, 40));
    }

    const parseOverride = (value: string | undefined): number | null => {
      const n = Number.parseInt((value ?? "").trim(), 10);
      return Number.isFinite(n) ? clampMixLevel(n) : null;
    };
    const voiceOverride = parseOverride(scene.voicePriority);
    const musicOverride = parseOverride(scene.musicPriority);
    const soundOverride = parseOverride(scene.soundPriority);
    if (voiceOverride !== null) {
      mixRecommendation.voice = voiceOverride;
    }
    if (musicOverride !== null) {
      mixRecommendation.music = musicOverride;
    }
    if (soundOverride !== null) {
      mixRecommendation.sound = soundOverride;
    }

    const ducking = duckingForScene({
      hasNarration,
      focus: audioFocus,
      musicDucking: Boolean(musicCue?.duckingRecommended),
      soundDucking: Boolean(soundCue?.duckingRecommended),
      soundDensityScore: soundCue?.densityScore ?? 0,
    });

    const userDucking = scene.duckingMode?.trim();
    const duckingMode: AudioDuckingMode =
      userDucking && isAudioDuckingMode(userDucking) ?
        (userDucking as AudioDuckingMode)
      : ducking.mode;

    const hasUserOverrides = Boolean(
      scene.audioFocus?.trim() ||
        scene.duckingMode?.trim() ||
        scene.voicePriority?.trim() ||
        scene.musicPriority?.trim() ||
        scene.soundPriority?.trim()
    );

    sceneCues.push({
      sceneId: scene.id,
      order: scene.order,
      title: scene.title,
      audioFocus,
      voicePriority: mixRecommendation.voice,
      musicPriority: mixRecommendation.music,
      soundPriority: mixRecommendation.sound,
      duckingMode,
      duckingRecommendations: ducking.rec,
      mixRecommendation,
      speakerPriority: resolveSpeakerPriority(scene, storyboard),
      arcPhase: phase,
      hasUserOverrides,
    });
  }

  const warnings = detectAudioConflicts({
    storyboard,
    voiceEnabled,
    musicPlan,
    soundPlan,
    sceneCues,
  });

  const audioFocusSummary =
    storyboard.audioNotes?.trim() || buildAudioFocusSummary(sceneCues);

  const audioScore = computeAudioScore({
    enabled,
    sceneCount: scenes.length,
    warnings,
    voiceScore: voiceReport.voiceScore,
    musicScore: musicPlan.musicScore,
    soundScore: soundPlan.soundScore,
  });

  return {
    enabled,
    style: styleId,
    priorityStrategy,
    audioFocusSummary,
    sceneCues,
    recommendations,
    warnings,
    audioScore,
    voiceEnabled,
    musicEnabled,
    soundEnabled,
  };
}

export function buildMotionAudioProductionHandoffPlan(
  storyboard: StudioStoryboardDetail
): MotionAudioProductionHandoffPlan {
  const plan = buildAudioProductionDirectorPlan(storyboard);
  return {
    enabled: plan.enabled,
    style: plan.style,
    priorityStrategy: plan.priorityStrategy,
    audioFocusSummary: plan.audioFocusSummary,
    sceneCues: plan.sceneCues,
    audioWarnings: plan.warnings,
    recommendations: plan.recommendations,
  };
}

export function isAudioProductionPlanReady(plan: AudioProductionPlan): boolean {
  return (
    plan.enabled &&
    plan.sceneCues.length > 0 &&
    plan.warnings.every(
      (w) =>
        w.severity !== "warning" ||
        w.code === "narration_loud_music" ||
        w.code === "too_many_ambience_layers" ||
        w.code === "simultaneous_high_priorities"
    )
  );
}
