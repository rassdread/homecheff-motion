/**
 * Studio V35 — Music Director planning (no audio generation).
 */

import { interpretAiDirectorPrompt } from "@/lib/studio-ai-director-interpreter";
import { buildEnergyCurve, energyLevelFromSceneEnergy } from "@/lib/studio-energy-curve";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import {
  getStudioMusicProfile,
  normalizeStudioMusicProfileId,
  resolveMusicProfileForDirector,
  type StudioMusicProfileId,
} from "@/lib/studio-music-profiles";
import { storyboardToFlowInput } from "@/lib/studio-movie-director-quality";
import { buildStoryArc, type StoryArcPhase } from "@/lib/studio-story-arc";
import { analyzeStoryIntelligence } from "@/lib/studio-story-intelligence";
import { normalizeStudioSceneEnergy } from "@/lib/studio-scene-director";
import { analyzeVoiceDirector } from "@/lib/studio-voice-director";
import type { StudioStoryboardDetail, StudioSceneDetail } from "@/types/studio-api";
import type {
  MusicCueType,
  MusicDirectorPlan,
  MusicDirectorWarning,
  MusicEndBehavior,
  MusicEnergyTarget,
  MusicNarrativeLabel,
  MusicNarrativePlanEntry,
  MusicStartBehavior,
  MusicTransitionType,
  MotionMusicHandoffPlan,
  SceneMusicCue,
} from "@/types/studio-music-director";
import {
  isMusicCueType,
  isMusicEnergyTarget,
  isMusicTransitionType,
  isMusicStartBehavior,
  isMusicEndBehavior,
} from "@/lib/studio-music-validation";

function arcPhaseToCueType(phase: StoryArcPhase): MusicCueType {
  switch (phase) {
    case "opening":
      return "intro";
    case "discovery":
    case "build_up":
      return "build";
    case "transition":
      return "transition";
    case "climax":
      return "climax";
    case "resolution":
    case "outro":
      return "resolution";
    default:
      return "build";
  }
}

function arcPhaseToNarrativeLabel(phase: StoryArcPhase): MusicNarrativeLabel {
  switch (phase) {
    case "opening":
      return "intro";
    case "discovery":
    case "build_up":
      return phase === "build_up" ? "momentum" : "build";
    case "transition":
      return "momentum";
    case "climax":
      return "peak";
    case "resolution":
    case "outro":
      return "resolution";
    default:
      return "build";
  }
}

function sceneEnergyToMusicTarget(sceneEnergy: string): MusicEnergyTarget {
  const energy = normalizeStudioSceneEnergy(sceneEnergy);
  if (energy === "calm") {
    return "low";
  }
  if (energy === "intense") {
    return "high";
  }
  if (energy === "dynamic") {
    return "high";
  }
  return "medium";
}

function inferTransitionType(params: {
  transitionToNext: string;
  cueType: MusicCueType;
  profileDefault: MusicTransitionType;
  nextCueType?: MusicCueType;
}): MusicTransitionType {
  const hint = params.transitionToNext.trim().toLowerCase();
  if (/fade|dissolve|cross/.test(hint)) {
    return "crossfade";
  }
  if (/rise|build|swell|crescendo/.test(hint)) {
    return "riser";
  }
  if (/ambient|bridge|pad|under/.test(hint)) {
    return "ambient_bridge";
  }
  if (/cut|snap|hard/.test(hint)) {
    return "hard_cut";
  }
  if (params.cueType === "climax" || params.nextCueType === "climax") {
    return "riser";
  }
  if (params.cueType === "intro" || params.cueType === "resolution") {
    return params.profileDefault;
  }
  return params.profileDefault;
}

function resolveCueBehaviors(
  profileId: StudioMusicProfileId,
  cueType: MusicCueType
): { start: MusicStartBehavior; end: MusicEndBehavior; transition: MusicTransitionType } {
  const profile = getStudioMusicProfile(profileId);
  const custom = profile.cueBehaviors[cueType];
  return {
    start: custom?.start ?? (cueType === "intro" ? "fade_in" : "ambient_pad"),
    end: custom?.end ?? (cueType === "resolution" ? "fade_out" : "tail"),
    transition: custom?.transition ?? profile.transitionStyle,
  };
}

function buildNarrativeSummary(entries: MusicNarrativePlanEntry[]): string {
  if (entries.length === 0) {
    return "";
  }
  return entries
    .map((e) => `${e.title || `Scene ${e.order + 1}`}: ${e.narrativeLabel}`)
    .join(" → ");
}

function validateMusicDirectorPlan(params: {
  storyboard: StudioStoryboardDetail;
  scenes: StudioSceneDetail[];
  profileId: StudioMusicProfileId;
  voiceEnabled: boolean;
  intensity: string;
}): MusicDirectorWarning[] {
  const warnings: MusicDirectorWarning[] = [];
  const scenes = params.scenes;

  if (scenes.length === 0) {
    warnings.push({
      code: "no_scenes",
      severity: "warning",
      messageKey: "studio.music.warning.noScenes",
    });
    return warnings;
  }

  const hasEmotion = scenes.some((s) => s.emotion.trim().length > 0);
  if (!hasEmotion) {
    warnings.push({
      code: "no_emotion_data",
      severity: "info",
      messageKey: "studio.music.warning.noEmotionData",
    });
  }

  const hasEnergy = scenes.some((s) => s.sceneEnergy && s.sceneEnergy !== "neutral");
  if (!hasEnergy) {
    warnings.push({
      code: "flat_energy_curve",
      severity: "info",
      messageKey: "studio.music.warning.noEnergyCurve",
    });
  }

  if (scenes.length < 2) {
    warnings.push({
      code: "no_story_arc",
      severity: "info",
      messageKey: "studio.music.warning.noStoryArc",
    });
  }

  if (!params.profileId) {
    warnings.push({
      code: "music_profile_missing",
      severity: "warning",
      messageKey: "studio.music.warning.profileMissing",
    });
  }

  if (
    params.voiceEnabled &&
    (params.intensity === "bold" || params.intensity === "high")
  ) {
    warnings.push({
      code: "narration_high_intensity",
      severity: "warning",
      messageKey: "studio.music.warning.narrationHighIntensity",
    });
  }

  return warnings;
}

function computeMusicScore(params: {
  scenes: StudioSceneDetail[];
  warnings: MusicDirectorWarning[];
  storyHealthScore: number;
  enabled: boolean;
}): number {
  if (!params.enabled || params.scenes.length === 0) {
    return 0;
  }
  let score = 40;
  if (params.scenes.length >= 2) {
    score += 15;
  }
  if (params.scenes.some((s) => s.emotion.trim())) {
    score += 10;
  }
  if (params.scenes.some((s) => s.sceneEnergy !== "neutral")) {
    score += 10;
  }
  score += Math.round(params.storyHealthScore * 0.25);
  score -= params.warnings.filter((w) => w.severity === "warning").length * 8;
  return Math.max(0, Math.min(100, score));
}

export function buildMusicDirectorPlan(storyboard: StudioStoryboardDetail): MusicDirectorPlan {
  const scenes = [...(storyboard.scenes ?? [])].sort((a, b) => a.order - b.order);
  const directorProfile = normalizeStudioDirectorProfile(storyboard.directorProfile);
  const enabled = storyboard.musicEnabled ?? false;
  const profileId = normalizeStudioMusicProfileId(
    storyboard.musicStyle?.trim() || null,
    resolveMusicProfileForDirector(directorProfile).id
  );
  const profile = getStudioMusicProfile(profileId);
  const intensity =
    storyboard.musicIntensity?.trim() ||
    profile.defaultIntensity;
  const narrativeRole = storyboard.musicNarrativeRole?.trim() || "support_narrative";

  const flowInput = storyboardToFlowInput(storyboard);
  const intelligence = analyzeStoryIntelligence(flowInput, directorProfile);
  const arc = buildStoryArc(flowInput);
  const energyCurve = buildEnergyCurve(flowInput, intelligence.plan);
  const voiceReport = analyzeVoiceDirector(storyboard);
  const voiceEnabled = Boolean(storyboard.voiceEnabled);
  const aiStyle = interpretAiDirectorPrompt(
    storyboard.aiDirectorPrompt?.trim() || storyboard.directorProfile
  );

  const narrativePlan: MusicNarrativePlanEntry[] = [];
  const sceneCues: SceneMusicCue[] = [];
  const recommendations: string[] = [];

  if (voiceEnabled) {
    recommendations.push("studio.music.recommendation.ducking");
    recommendations.push("studio.music.recommendation.dialoguePriority");
    if (voiceReport.timing.estimatedSeconds > 0) {
      recommendations.push("studio.music.recommendation.avoidExcessEnergyDuringSpeech");
    }
  }

  for (let i = 0; i < scenes.length; i += 1) {
    const scene = scenes[i]!;
    const arcEntry = arc.find((a) => a.sceneId === scene.id);
    const phase = arcEntry?.phase ?? "build_up";
    const energyPoint = energyCurve.find((p) => p.sceneId === scene.id);

    const derivedCue = arcPhaseToCueType(phase);
    const derivedNarrative = arcPhaseToNarrativeLabel(phase);
    const derivedEnergy =
      energyPoint ? energyLevelFromSceneEnergy(energyPoint.sceneEnergy) : null;
    const energyTarget: MusicEnergyTarget =
      isMusicEnergyTarget(scene.musicEnergyTarget)
        ? scene.musicEnergyTarget
        : derivedEnergy === "high"
          ? "high"
          : derivedEnergy === "low"
            ? "low"
            : sceneEnergyToMusicTarget(scene.sceneEnergy);

    const cueType: MusicCueType =
      isMusicCueType(scene.musicCueType) ? scene.musicCueType : derivedCue;
    const narrativeLabel: MusicNarrativeLabel = derivedNarrative;

    const nextScene = scenes[i + 1];
    const nextCue = nextScene
      ? isMusicCueType(nextScene.musicCueType)
        ? nextScene.musicCueType
        : arcPhaseToCueType(arc.find((a) => a.sceneId === nextScene.id)?.phase ?? "build_up")
      : undefined;

    const behaviors = resolveCueBehaviors(profileId, cueType);
    const transitionType: MusicTransitionType =
      isMusicTransitionType(scene.musicTransitionType)
        ? scene.musicTransitionType
        : inferTransitionType({
            transitionToNext: scene.transitionToNext,
            cueType,
            profileDefault: behaviors.transition,
            nextCueType: nextCue,
          });

    const startBehavior: MusicStartBehavior =
      isMusicStartBehavior(scene.musicStartBehavior)
        ? scene.musicStartBehavior
        : behaviors.start;
    const endBehavior: MusicEndBehavior =
      isMusicEndBehavior(scene.musicEndBehavior) ? scene.musicEndBehavior : behaviors.end;

    const hasUserOverrides = Boolean(
      scene.musicCueType?.trim() ||
        scene.musicEnergyTarget?.trim() ||
        scene.musicTransitionType?.trim() ||
        scene.musicStartBehavior?.trim() ||
        scene.musicEndBehavior?.trim()
    );

    const duckingRecommended = voiceEnabled;
    const dialoguePriority = voiceEnabled && voiceReport.script.fullNarration.trim().length > 20;

    narrativePlan.push({
      sceneId: scene.id,
      order: scene.order,
      title: scene.title,
      narrativeLabel,
      cueType,
      arcPhase: phase,
    });

    sceneCues.push({
      sceneId: scene.id,
      order: scene.order,
      title: scene.title,
      cueType,
      narrativeLabel,
      energyTarget:
        voiceEnabled && dialoguePriority && energyTarget === "high" ? "medium" : energyTarget,
      transitionType,
      startBehavior,
      endBehavior,
      arcPhase: phase,
      emotion: scene.emotion,
      sceneEnergy: scene.sceneEnergy,
      durationSeconds: scene.durationSeconds,
      duckingRecommended,
      dialoguePriority,
      hasUserOverrides,
    });
  }

  const warnings = validateMusicDirectorPlan({
    storyboard,
    scenes,
    profileId,
    voiceEnabled,
    intensity,
  });

  if (intelligence.energyWarnings.length > 0) {
    warnings.push({
      code: "story_energy_warnings",
      severity: "info",
      messageKey: "studio.music.warning.storyEnergyWarnings",
      params: { count: intelligence.energyWarnings.length },
    });
  }

  const narrativeSummary =
    storyboard.musicNotes?.trim() ||
    buildNarrativeSummary(narrativePlan) ||
    aiStyle.moodKeywords.join(", ");

  const musicScore = computeMusicScore({
    scenes,
    warnings,
    storyHealthScore: intelligence.storyHealthScore,
    enabled,
  });

  return {
    enabled,
    profileId,
    profileLabelKey: profile.labelKey,
    style: profile.instrumentStyle,
    intensity,
    narrativeRole,
    narrativeSummary,
    narrativePlan,
    sceneCues,
    recommendations,
    warnings,
    tempoRange: profile.tempoRange,
    voiceAware: voiceEnabled,
    musicScore,
  };
}

export function buildMotionMusicHandoffPlan(
  storyboard: StudioStoryboardDetail
): MotionMusicHandoffPlan {
  const plan = buildMusicDirectorPlan(storyboard);
  return {
    enabled: plan.enabled,
    profileId: plan.profileId,
    profileLabelKey: plan.profileLabelKey,
    style: plan.style,
    intensity: plan.intensity,
    narrativeRole: plan.narrativeRole,
    narrativeSummary: plan.narrativeSummary,
    sceneMusicCues: plan.sceneCues,
    musicNarrativeSummary: plan.narrativeSummary,
    musicWarnings: plan.warnings,
    recommendations: plan.recommendations,
    tempoRange: plan.tempoRange,
    voiceAware: plan.voiceAware,
  };
}

export function isMusicPlanReady(plan: MusicDirectorPlan): boolean {
  return (
    plan.enabled &&
    plan.sceneCues.length > 0 &&
    plan.warnings.every((w) => w.severity !== "warning" || w.code === "narration_high_intensity")
  );
}
