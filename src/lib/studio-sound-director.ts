/**
 * Studio V36 — Sound Effects Director planning (no audio generation).
 */

import { isStudioLocationCategory } from "@/lib/studio-location-categories";
import { isStudioPropCategory } from "@/lib/studio-prop-categories";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import { buildMusicDirectorPlan } from "@/lib/studio-music-director";
import { storyboardToFlowInput } from "@/lib/studio-movie-director-quality";
import { buildStoryArc, type StoryArcPhase } from "@/lib/studio-story-arc";
import { analyzeVoiceDirector } from "@/lib/studio-voice-director";
import {
  ACTION_SOUND_HINTS,
  LOCATION_AMBIENT_SOUNDS,
  LOCATION_ENVIRONMENT_SOUNDS,
  PROP_OBJECT_SOUNDS,
  parseSoundIdList,
} from "@/lib/studio-sound-categories";
import {
  getStudioSoundProfile,
  normalizeSoundDensity,
  normalizeStudioSoundProfileId,
  resolveSoundProfileForDirector,
  type StudioSoundProfileId,
} from "@/lib/studio-sound-profiles";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";
import type {
  MotionSoundHandoffPlan,
  SceneSoundCue,
  SoundAmbientId,
  SoundCharacterId,
  SoundDirectorPlan,
  SoundDirectorWarning,
  SoundEnvironmentId,
  SoundObjectId,
  SoundTransitionId,
} from "@/types/studio-sound-director";
import {
  SOUND_AMBIENT_IDS,
  SOUND_CHARACTER_IDS,
  SOUND_ENVIRONMENT_IDS,
  SOUND_OBJECT_IDS,
  SOUND_TRANSITION_IDS,
} from "@/types/studio-sound-director";

const MAX_SOUND_LAYERS = 6;

type EmotionModifier = {
  densityMultiplier: number;
  preferMovement: boolean;
  preferSharpTransitions: boolean;
};

function emotionModifier(emotion: string): EmotionModifier {
  const e = emotion.trim().toLowerCase();
  if (/happy|excited|celebrat|proud|joy/.test(e)) {
    return { densityMultiplier: 1.2, preferMovement: true, preferSharpTransitions: false };
  }
  if (/calm|peace|serene|quiet/.test(e)) {
    return { densityMultiplier: 0.6, preferMovement: false, preferSharpTransitions: false };
  }
  if (/sad|melanch|somber|grief/.test(e)) {
    return { densityMultiplier: 0.5, preferMovement: false, preferSharpTransitions: false };
  }
  if (/angry|tense|fury|frustrat/.test(e)) {
    return { densityMultiplier: 0.9, preferMovement: true, preferSharpTransitions: true };
  }
  if (/serious|focused|determin/.test(e)) {
    return { densityMultiplier: 0.75, preferMovement: false, preferSharpTransitions: false };
  }
  if (/curious|wonder/.test(e)) {
    return { densityMultiplier: 1, preferMovement: true, preferSharpTransitions: false };
  }
  return { densityMultiplier: 1, preferMovement: false, preferSharpTransitions: false };
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function matchActionHints(action: string, description: string): {
  character: SoundCharacterId[];
  object: SoundObjectId[];
} {
  const text = `${action} ${description}`.trim().toLowerCase();
  const character: SoundCharacterId[] = [];
  const object: SoundObjectId[] = [];
  for (const [key, hints] of Object.entries(ACTION_SOUND_HINTS)) {
    if (text.includes(key)) {
      character.push(...hints.character);
      object.push(...hints.object);
    }
  }
  if (/deliver|delivery|knock/.test(text)) {
    object.push("door_knock", "bag_movement");
  }
  if (/walk|stroll|enter/.test(text)) {
    character.push("footsteps");
  }
  if (/cook|kitchen|chef|sizzle/.test(text)) {
    object.push("cooking", "sizzling", "cutting");
  }
  if (/drive|car|van|truck/.test(text)) {
    object.push("vehicle", "engine", "road_noise");
  }
  if (/talk|speak|conversation|dialogue/.test(text)) {
    character.push("crowd_presence");
  }
  return { character: unique(character), object: unique(object) };
}

function detectEnvironmentSounds(scene: StudioSceneDetail): SoundEnvironmentId[] {
  const sounds: SoundEnvironmentId[] = [];
  const loc = scene.location;
  if (loc) {
    const cat = loc.category?.trim().toLowerCase() ?? "";
    if (isStudioLocationCategory(cat)) {
      sounds.push(...LOCATION_ENVIRONMENT_SOUNDS[cat]);
    }
    const keywords = `${loc.environmentKeywords} ${loc.description} ${loc.name}`.toLowerCase();
    if (/rain|storm|wet/.test(keywords)) {
      sounds.push("rain");
    }
    if (/wind|breeze/.test(keywords)) {
      sounds.push("wind");
    }
    if (/bird|garden|park/.test(keywords)) {
      sounds.push("birds", "garden");
    }
    if (/market|bazaar|stall/.test(keywords)) {
      sounds.push("market", "crowd");
    }
    if (/restaurant|kitchen|dining|cafe/.test(keywords)) {
      sounds.push("restaurant", "kitchen_ambience", "plates");
    }
    if (/office|corporate|desk/.test(keywords)) {
      sounds.push("office");
    }
    if (/city|urban|downtown/.test(keywords)) {
      sounds.push("city");
    }
    if (/street|sidewalk/.test(keywords)) {
      sounds.push("street");
    }
    if (/nature|forest|trail/.test(keywords)) {
      sounds.push("nature");
    }
  }
  const sceneText = `${scene.description} ${scene.title}`.toLowerCase();
  if (/rain/.test(sceneText)) {
    sounds.push("rain");
  }
  if (/wind/.test(sceneText)) {
    sounds.push("wind");
  }
  return unique(sounds);
}

function detectPropSounds(scene: StudioSceneDetail): SoundObjectId[] {
  const sounds: SoundObjectId[] = [];
  for (const prop of scene.props) {
    const cat = prop.category?.trim().toLowerCase() ?? "";
    if (isStudioPropCategory(cat)) {
      sounds.push(...(PROP_OBJECT_SOUNDS[cat] ?? []));
    }
    const text = `${prop.name} ${prop.description} ${prop.appearanceMemory}`.toLowerCase();
    if (/phone|mobile|notification/.test(text)) {
      sounds.push("phone", "notification");
    }
    if (/package|box|delivery|cardboard/.test(text)) {
      sounds.push("package", "paper", "cardboard");
    }
    if (/vehicle|car|van|bike/.test(text)) {
      sounds.push("vehicle", "engine");
    }
    if (/door/.test(text)) {
      sounds.push("door");
    }
  }
  return unique(sounds);
}

function detectCharacterSounds(
  scene: StudioSceneDetail,
  modifier: EmotionModifier
): SoundCharacterId[] {
  const hints = matchActionHints(scene.action, scene.description);
  const sounds = [...hints.character];
  if (scene.characters.length > 1) {
    sounds.push("crowd_presence");
  }
  if (scene.characters.length > 0 && modifier.preferMovement) {
    sounds.push("clothing_movement");
  }
  if (/applause|cheer/.test(`${scene.action} ${scene.description}`.toLowerCase())) {
    sounds.push("applause");
  }
  if (/laugh|funny|humor/.test(`${scene.action} ${scene.description} ${scene.emotion}`.toLowerCase())) {
    sounds.push("laughter");
  }
  return unique(sounds);
}

function inferTransitionSounds(params: {
  transitionToNext: string;
  arcPhase: StoryArcPhase;
  isLastScene: boolean;
  profileTransitionBias: "subtle" | "cinematic" | "punchy";
  preferSharp: boolean;
  musicTransition?: string;
}): SoundTransitionId[] {
  const hint = params.transitionToNext.trim().toLowerCase();
  if (params.isLastScene) {
    return ["soft_fade"];
  }
  if (/whoosh|swoosh|swipe/.test(hint)) {
    return ["whoosh"];
  }
  if (/rise|reveal|build|swell|crescendo/.test(hint)) {
    return ["riser"];
  }
  if (/impact|hit|slam|punch|cut|snap|hard/.test(hint) || params.preferSharp) {
    return ["impact"];
  }
  if (/fade|dissolve|soft/.test(hint)) {
    return ["soft_fade"];
  }
  if (/sweep|slide/.test(hint)) {
    return ["sweep"];
  }
  if (params.arcPhase === "climax") {
    return params.profileTransitionBias === "cinematic" ? ["riser", "impact"] : ["riser"];
  }
  if (params.arcPhase === "resolution" || params.arcPhase === "outro") {
    return ["soft_fade"];
  }
  if (params.musicTransition === "riser") {
    return ["riser"];
  }
  if (params.musicTransition === "hard_cut") {
    return params.profileTransitionBias === "punchy" ? ["impact"] : ["whoosh"];
  }
  if (params.profileTransitionBias === "cinematic") {
    return ["whoosh"];
  }
  if (params.profileTransitionBias === "punchy") {
    return ["sweep"];
  }
  return ["none"];
}

function detectAmbientSounds(
  scene: StudioSceneDetail,
  profileAmbientBias: "low" | "medium" | "high",
  modifier: EmotionModifier
): SoundAmbientId[] {
  if (profileAmbientBias === "low" && modifier.densityMultiplier < 0.8) {
    return [];
  }
  const sounds: SoundAmbientId[] = [];
  const loc = scene.location;
  if (loc) {
    const cat = loc.category?.trim().toLowerCase() ?? "";
    if (isStudioLocationCategory(cat)) {
      sounds.push(...(LOCATION_AMBIENT_SOUNDS[cat] ?? []));
    }
    const worldHints = `${loc.worldMemory} ${loc.visualIdentity} ${loc.worldProfile?.name ?? ""}`.toLowerCase();
    if (/documentary|realistic|authentic/.test(worldHints)) {
      sounds.push("subtle_room_tone");
    }
    if (/community|warm|human/.test(worldHints)) {
      sounds.push("marketplace_ambience");
    }
    if (/corporate|minimal|clean/.test(worldHints)) {
      return ["subtle_room_tone"];
    }
    if (/epic|cinematic|dramatic/.test(worldHints)) {
      sounds.push("distant_traffic");
    }
  }
  if (modifier.densityMultiplier >= 1.1) {
    sounds.push("subtle_room_tone");
  }
  if (profileAmbientBias === "high" && sounds.length === 0) {
    sounds.push("subtle_room_tone");
  }
  return unique(sounds).slice(0, profileAmbientBias === "low" ? 1 : 2);
}

function applyDensityCap<T>(items: T[], density: string, multiplier: number): T[] {
  const max =
    density === "minimal"
      ? Math.max(1, Math.floor(2 * multiplier))
      : density === "rich"
        ? Math.max(3, Math.floor(MAX_SOUND_LAYERS * multiplier))
        : Math.max(2, Math.floor(4 * multiplier));
  return items.slice(0, max);
}

function countLayers(cue: Omit<SceneSoundCue, "densityScore" | "hasUserOverrides">): number {
  return (
    cue.environmentSounds.length +
    cue.characterSounds.length +
    cue.propSounds.length +
    cue.transitionSounds.filter((t) => t !== "none").length +
    cue.ambientRecommendation.length
  );
}

function validateSoundPlan(params: {
  scenes: StudioSceneDetail[];
  profileId: StudioSoundProfileId;
  musicEnabled: boolean;
  musicIntensity: string;
  voiceEnabled: boolean;
  density: string;
  sceneCues: SceneSoundCue[];
}): SoundDirectorWarning[] {
  const warnings: SoundDirectorWarning[] = [];
  if (params.scenes.length === 0) {
    warnings.push({
      code: "no_scenes",
      severity: "warning",
      messageKey: "studio.sound.warning.noScenes",
    });
    return warnings;
  }

  const missingLocation = params.scenes.filter((s) => !s.locationId).length;
  if (missingLocation > 0) {
    warnings.push({
      code: "no_location",
      severity: missingLocation === params.scenes.length ? "warning" : "info",
      messageKey: "studio.sound.warning.noLocation",
      params: { count: missingLocation },
    });
  }

  const noProps = params.scenes.every((s) => s.props.length === 0);
  if (noProps) {
    warnings.push({
      code: "no_props",
      severity: "info",
      messageKey: "studio.sound.warning.noProps",
    });
  }

  const noEnvironment = params.sceneCues.every((c) => c.environmentSounds.length === 0);
  if (noEnvironment) {
    warnings.push({
      code: "no_environment",
      severity: "info",
      messageKey: "studio.sound.warning.noEnvironment",
    });
  }

  const heavyLayers = params.sceneCues.filter((c) => countLayers(c) > MAX_SOUND_LAYERS).length;
  if (heavyLayers > 0) {
    warnings.push({
      code: "too_many_layers",
      severity: "warning",
      messageKey: "studio.sound.warning.tooManyLayers",
      params: { count: heavyLayers },
    });
  }

  if (
    params.musicEnabled &&
    (params.musicIntensity === "bold" || params.density === "rich")
  ) {
    warnings.push({
      code: "music_conflict",
      severity: "warning",
      messageKey: "studio.sound.warning.musicConflict",
    });
  }

  if (params.voiceEnabled && params.density === "rich") {
    warnings.push({
      code: "voice_density_conflict",
      severity: "info",
      messageKey: "studio.sound.warning.voiceDensity",
    });
  }

  return warnings;
}

function computeSoundScore(params: {
  scenes: StudioSceneDetail[];
  warnings: SoundDirectorWarning[];
  enabled: boolean;
}): number {
  if (!params.enabled || params.scenes.length === 0) {
    return 0;
  }
  let score = 35;
  if (params.scenes.some((s) => s.locationId)) {
    score += 15;
  }
  if (params.scenes.some((s) => s.props.length > 0)) {
    score += 10;
  }
  if (params.scenes.some((s) => s.action.trim())) {
    score += 10;
  }
  if (params.scenes.length >= 2) {
    score += 10;
  }
  score -= params.warnings.filter((w) => w.severity === "warning").length * 8;
  return Math.max(0, Math.min(100, score));
}

export function buildSoundDirectorPlan(storyboard: StudioStoryboardDetail): SoundDirectorPlan {
  const scenes = [...(storyboard.scenes ?? [])].sort((a, b) => a.order - b.order);
  const directorProfile = normalizeStudioDirectorProfile(storyboard.directorProfile);
  const enabled = storyboard.soundEnabled ?? false;
  const profileId = normalizeStudioSoundProfileId(
    storyboard.soundStyle?.trim() || null,
    resolveSoundProfileForDirector(directorProfile).id
  );
  const profile = getStudioSoundProfile(profileId);
  const density = normalizeSoundDensity(storyboard.soundDensity || profile.defaultDensity);

  const flowInput = storyboardToFlowInput(storyboard);
  const arc = buildStoryArc(flowInput);
  const voiceReport = analyzeVoiceDirector(storyboard);
  const musicPlan = buildMusicDirectorPlan(storyboard);
  const voiceEnabled = Boolean(storyboard.voiceEnabled);
  const recommendations: string[] = [];

  if (voiceEnabled) {
    recommendations.push("studio.sound.recommendation.reduceDensityDuringNarration");
    recommendations.push("studio.sound.recommendation.dialoguePriority");
  }
  if (musicPlan.enabled) {
    recommendations.push("studio.sound.recommendation.balanceWithMusic");
    if (musicPlan.intensity === "bold" || musicPlan.intensity === "high") {
      recommendations.push("studio.sound.recommendation.reduceAmbientWithHighMusic");
    }
  }

  const sceneCues: SceneSoundCue[] = [];

  for (let i = 0; i < scenes.length; i += 1) {
    const scene = scenes[i]!;
    const arcEntry = arc.find((a) => a.sceneId === scene.id);
    const phase = arcEntry?.phase ?? "build_up";
    const musicCue = musicPlan.sceneCues.find((c) => c.sceneId === scene.id);
    const modifier = emotionModifier(scene.emotion);

    let densityMultiplier = modifier.densityMultiplier;
    if (voiceEnabled && voiceReport.script.fullNarration.trim().length > 20) {
      densityMultiplier *= 0.75;
    }
    if (musicPlan.enabled && musicPlan.intensity === "bold") {
      densityMultiplier *= 0.85;
    }

    const envOverride = parseSoundIdList(scene.soundEnvironmentOverride, SOUND_ENVIRONMENT_IDS);
    const charOverride = parseSoundIdList(scene.soundCharacterOverride, SOUND_CHARACTER_IDS);
    const propOverride = parseSoundIdList(scene.soundPropOverride, SOUND_OBJECT_IDS);
    const transOverride = parseSoundIdList(scene.soundTransitionOverride, SOUND_TRANSITION_IDS);
    const ambOverride = parseSoundIdList(scene.soundAmbientOverride, SOUND_AMBIENT_IDS);

    const environmentSounds = applyDensityCap(
      envOverride.length > 0 ? envOverride : detectEnvironmentSounds(scene),
      density,
      densityMultiplier
    );
    const characterSounds = applyDensityCap(
      charOverride.length > 0
        ? charOverride
        : detectCharacterSounds(scene, modifier),
      density,
      densityMultiplier
    );
    const propSounds = applyDensityCap(
      propOverride.length > 0
        ? propOverride
        : unique([...detectPropSounds(scene), ...matchActionHints(scene.action, scene.description).object]),
      density,
      densityMultiplier
    );
    const transitionSounds =
      transOverride.length > 0
        ? transOverride
        : inferTransitionSounds({
            transitionToNext: scene.transitionToNext,
            arcPhase: phase,
            isLastScene: i === scenes.length - 1,
            profileTransitionBias: profile.transitionBias,
            preferSharp: modifier.preferSharpTransitions,
            musicTransition: musicCue?.transitionType,
          });
    const ambientRecommendation = applyDensityCap(
      ambOverride.length > 0
        ? ambOverride
        : detectAmbientSounds(scene, profile.ambientBias, modifier),
      density,
      densityMultiplier
    );

    const duckingRecommended = voiceEnabled || Boolean(musicCue?.duckingRecommended);
    const dialoguePriority =
      voiceEnabled && voiceReport.script.fullNarration.trim().length > 20;

    const hasUserOverrides = Boolean(
      scene.soundEnvironmentOverride?.trim() ||
        scene.soundCharacterOverride?.trim() ||
        scene.soundPropOverride?.trim() ||
        scene.soundTransitionOverride?.trim() ||
        scene.soundAmbientOverride?.trim()
    );

    const cue: SceneSoundCue = {
      sceneId: scene.id,
      order: scene.order,
      title: scene.title,
      environmentSounds,
      characterSounds,
      propSounds,
      transitionSounds,
      ambientRecommendation,
      emotion: scene.emotion,
      sceneEnergy: scene.sceneEnergy,
      locationCategory: scene.location?.category ?? null,
      densityScore: countLayers({
        sceneId: scene.id,
        order: scene.order,
        title: scene.title,
        environmentSounds,
        characterSounds,
        propSounds,
        transitionSounds,
        ambientRecommendation,
        emotion: scene.emotion,
        sceneEnergy: scene.sceneEnergy,
        locationCategory: scene.location?.category ?? null,
        duckingRecommended,
        dialoguePriority,
      }),
      duckingRecommended,
      dialoguePriority,
      hasUserOverrides,
    };

    sceneCues.push(cue);
  }

  const warnings = validateSoundPlan({
    scenes,
    profileId,
    musicEnabled: musicPlan.enabled,
    musicIntensity: musicPlan.intensity,
    voiceEnabled,
    density,
    sceneCues,
  });

  const soundScore = computeSoundScore({ scenes, warnings, enabled });

  return {
    enabled,
    profileId,
    profileLabelKey: profile.labelKey,
    density,
    sceneCues,
    recommendations,
    warnings,
    soundScore,
    musicAware: musicPlan.enabled,
    voiceAware: voiceEnabled,
  };
}

export function buildMotionSoundHandoffPlan(
  storyboard: StudioStoryboardDetail
): MotionSoundHandoffPlan {
  const plan = buildSoundDirectorPlan(storyboard);
  return {
    enabled: plan.enabled,
    profileId: plan.profileId,
    profileLabelKey: plan.profileLabelKey,
    density: plan.density,
    sceneSoundCues: plan.sceneCues,
    soundWarnings: plan.warnings,
    recommendations: plan.recommendations,
    musicAware: plan.musicAware,
    voiceAware: plan.voiceAware,
  };
}

export function isSoundPlanReady(plan: SoundDirectorPlan): boolean {
  return (
    plan.enabled &&
    plan.sceneCues.length > 0 &&
    plan.warnings.every(
      (w) =>
        w.severity !== "warning" ||
        w.code === "music_conflict" ||
        w.code === "too_many_layers"
    )
  );
}
