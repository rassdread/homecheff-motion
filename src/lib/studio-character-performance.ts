import {
  DEFAULT_STUDIO_SCENE_ENERGY,
  normalizeStudioSceneEnergy,
  type StudioSceneEnergy,
} from "@/lib/studio-scene-director";
import {
  analyzeVoiceSegmentAmplitude,
  dominantMouthStateFromSamples,
  mouthStateToIntensity,
} from "@/lib/voice-amplitude-analyzer";
import type { StudioCharacterListItem, StudioStoryboardDetail } from "@/types/studio-api";
import type { MotionVoiceSegmentHandoff } from "@/types/studio-voice-execution";
import type {
  CharacterPerformanceAssignment,
  CharacterPerformanceProfile,
  CharacterPerformanceState,
  CharacterPerformanceWarning,
  IdleAnimationStyle,
  PerformanceEmotionModifier,
  PerformanceEnergyModifier,
  PerformanceLevel,
} from "@/types/studio-character-performance";
import { matchCharacterBySpeakerName } from "@/lib/studio-character-voice";

export const STUDIO_PERFORMANCE_LEVELS = ["low", "medium", "high"] as const;
export const STUDIO_IDLE_ANIMATION_STYLES = ["subtle", "natural", "lively"] as const;

export const SCENE_ENERGY_MULTIPLIERS: Record<StudioSceneEnergy, number> = {
  calm: 0.5,
  neutral: 1,
  dynamic: 1.5,
  intense: 2,
};

const EMOTION_MODIFIERS: Record<string, PerformanceEmotionModifier> = {
  happy: {
    smileMultiplier: 1.15,
    blinkMultiplier: 1.1,
    mouthMultiplier: 1.1,
    headMultiplier: 1.05,
    mouthSpeedMultiplier: 1.05,
  },
  joyful: {
    smileMultiplier: 1.2,
    blinkMultiplier: 1.15,
    mouthMultiplier: 1.15,
    headMultiplier: 1.1,
    mouthSpeedMultiplier: 1.1,
  },
  sad: {
    smileMultiplier: 0.7,
    blinkMultiplier: 0.85,
    mouthMultiplier: 0.85,
    headMultiplier: 0.8,
    mouthSpeedMultiplier: 0.85,
  },
  excited: {
    smileMultiplier: 1.1,
    blinkMultiplier: 1.15,
    mouthMultiplier: 1.25,
    headMultiplier: 1.2,
    mouthSpeedMultiplier: 1.25,
  },
  calm: {
    smileMultiplier: 0.95,
    blinkMultiplier: 0.9,
    mouthMultiplier: 0.9,
    headMultiplier: 0.85,
    mouthSpeedMultiplier: 0.9,
  },
  angry: {
    smileMultiplier: 0.75,
    blinkMultiplier: 1.05,
    mouthMultiplier: 1.2,
    headMultiplier: 1.15,
    mouthSpeedMultiplier: 1.15,
  },
  neutral: {
    smileMultiplier: 1,
    blinkMultiplier: 1,
    mouthMultiplier: 1,
    headMultiplier: 1,
    mouthSpeedMultiplier: 1,
  },
};

const DEFAULT_EMOTION_MODIFIER: PerformanceEmotionModifier = EMOTION_MODIFIERS.neutral;

export function normalizePerformanceLevel(value: string | undefined | null): PerformanceLevel {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "low" || v === "high") {
    return v;
  }
  return "medium";
}

export function normalizeIdleAnimationStyle(
  value: string | undefined | null
): IdleAnimationStyle {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "natural" || v === "lively") {
    return v;
  }
  return "subtle";
}

export function clampSmileStrength(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function levelToNumeric(level: PerformanceLevel): number {
  switch (level) {
    case "low":
      return 0.6;
    case "high":
      return 1.4;
    default:
      return 1;
  }
}

export function numericToPerformanceLevel(value: number): PerformanceLevel {
  if (value < 0.85) {
    return "low";
  }
  if (value > 1.15) {
    return "high";
  }
  return "medium";
}

export function normalizeSceneEmotion(emotion: string | undefined | null): string {
  const raw = (emotion ?? "").trim().toLowerCase();
  if (!raw) {
    return "neutral";
  }
  for (const key of Object.keys(EMOTION_MODIFIERS)) {
    if (raw.includes(key)) {
      return key;
    }
  }
  return raw.split(/\s+/)[0] ?? "neutral";
}

export function getPerformanceEmotionModifier(emotion: string): PerformanceEmotionModifier {
  const key = normalizeSceneEmotion(emotion);
  return EMOTION_MODIFIERS[key] ?? DEFAULT_EMOTION_MODIFIER;
}

export function getPerformanceEnergyModifiers(): PerformanceEnergyModifier[] {
  return (Object.keys(SCENE_ENERGY_MULTIPLIERS) as StudioSceneEnergy[]).map((energy) => ({
    energy,
    animationMultiplier: SCENE_ENERGY_MULTIPLIERS[energy],
  }));
}

/** Identity-aware style from role + personality text (no mascot-specific hardcoding). */
export function inferCharacterPerformanceStyleLabel(character: {
  role: string;
  personality: string;
  personalityMemory: string;
  performanceNotes: string;
}): string {
  const corpus = `${character.personality} ${character.personalityMemory} ${character.performanceNotes}`.toLowerCase();
  if (/\bcalm\b|\bpeaceful\b|\brelaxed\b|\bserene\b/.test(corpus)) {
    return "Calm";
  }
  if (/\bcreative\b|\bexpressive\b|\bartistic\b|\bdynamic\b/.test(corpus)) {
    return "Expressive";
  }
  if (/\bfriendly\b|\bwarm\b|\bwelcoming\b|\bcheerful\b/.test(corpus)) {
    return "Friendly";
  }
  if (/\bprofessional\b|\bconfident\b|\bauthoritative\b/.test(corpus)) {
    return "Professional";
  }
  if (character.role === "mascot") {
    return "Friendly";
  }
  if (character.role === "human") {
    return "Natural";
  }
  return "Balanced";
}

export function inferIdentityPerformanceBias(character: {
  role: string;
  personality: string;
  personalityMemory: string;
  performanceNotes: string;
}): { smileBias: number; blinkBias: number; headBias: number } {
  const label = inferCharacterPerformanceStyleLabel(character);
  switch (label) {
    case "Calm":
      return { smileBias: 0.95, blinkBias: 0.9, headBias: 0.85 };
    case "Expressive":
      return { smileBias: 1.05, blinkBias: 1.1, headBias: 1.2 };
    case "Professional":
      return { smileBias: 0.9, blinkBias: 0.95, headBias: 0.9 };
    case "Friendly":
      return { smileBias: 1.1, blinkBias: 1.05, headBias: 1 };
    default:
      return { smileBias: 1, blinkBias: 1, headBias: 1 };
  }
}

export function characterPerformanceProfileFromCharacter(
  character: StudioCharacterListItem
): CharacterPerformanceProfile {
  return {
    characterId: character.id,
    characterName: character.name,
    performanceEnabled: character.performanceEnabled ?? false,
    defaultSmileStrength: clampSmileStrength(character.defaultSmileStrength ?? 70),
    defaultBlinkRate: normalizePerformanceLevel(character.defaultBlinkRate),
    defaultHeadMovement: normalizePerformanceLevel(character.defaultHeadMovement),
    defaultMouthIntensity: normalizePerformanceLevel(character.defaultMouthIntensity),
    idleAnimationStyle: normalizeIdleAnimationStyle(character.idleAnimationStyle),
    performanceNotes: (character.performanceNotes ?? "").trim(),
    styleLabel: inferCharacterPerformanceStyleLabel(character),
  };
}

export function buildCharacterPerformanceAssignments(
  storyboard: StudioStoryboardDetail
): CharacterPerformanceAssignment[] {
  const seen = new Set<string>();
  const out: CharacterPerformanceAssignment[] = [];
  for (const scene of storyboard.scenes) {
    for (const ch of scene.characters ?? []) {
      if (seen.has(ch.id)) {
        continue;
      }
      seen.add(ch.id);
      out.push(characterPerformanceProfileFromCharacter(ch));
    }
  }
  return out;
}

export function buildCharacterPerformanceState(params: {
  character: StudioCharacterListItem;
  activeSpeaker: boolean;
  emotion: string;
  sceneEnergy: string;
  voiceSegment?: Pick<
    MotionVoiceSegmentHandoff,
    "text" | "startSeconds" | "endSeconds"
  > | null;
}): CharacterPerformanceState {
  const profile = characterPerformanceProfileFromCharacter(params.character);
  const emotionKey = normalizeSceneEmotion(params.emotion);
  const emotionMod = getPerformanceEmotionModifier(emotionKey);
  const energy = normalizeStudioSceneEnergy(params.sceneEnergy);
  const energyMult = SCENE_ENERGY_MULTIPLIERS[energy];
  const identityBias = inferIdentityPerformanceBias(params.character);

  let mouthState = dominantMouthStateFromSamples([]);
  let mouthSpeed = 1;

  if (params.voiceSegment && params.activeSpeaker) {
    const samples = analyzeVoiceSegmentAmplitude({
      text: params.voiceSegment.text,
      startSeconds: params.voiceSegment.startSeconds,
      endSeconds: params.voiceSegment.endSeconds,
    });
    mouthState = dominantMouthStateFromSamples(samples);
    const duration = Math.max(
      0.1,
      params.voiceSegment.endSeconds - params.voiceSegment.startSeconds
    );
    mouthSpeed =
      (params.voiceSegment.text.split(/\s+/).filter(Boolean).length / duration) *
      emotionMod.mouthSpeedMultiplier *
      energyMult;
  } else if (params.activeSpeaker) {
    mouthState = "small";
    mouthSpeed = 1 * emotionMod.mouthSpeedMultiplier * energyMult;
  }

  const baseSmile = profile.defaultSmileStrength;
  const smileStrength = clampSmileStrength(
    baseSmile *
      emotionMod.smileMultiplier *
      identityBias.smileBias *
      (params.activeSpeaker ? energyMult : 0.85)
  );

  const blinkNumeric =
    levelToNumeric(profile.defaultBlinkRate) *
    emotionMod.blinkMultiplier *
    identityBias.blinkBias *
    energyMult;
  const headNumeric =
    levelToNumeric(profile.defaultHeadMovement) *
    emotionMod.headMultiplier *
    identityBias.headBias *
    energyMult;

  const mouthBase = levelToNumeric(profile.defaultMouthIntensity);
  const mouthIntensity =
    mouthBase *
    emotionMod.mouthMultiplier *
    (params.activeSpeaker ? mouthStateToIntensity(mouthState) : 0.2);

  if (!params.activeSpeaker) {
    mouthState = "closed";
    mouthSpeed = 0.3 * energyMult;
  }

  return {
    characterId: profile.characterId,
    characterName: profile.characterName,
    activeSpeaker: params.activeSpeaker,
    emotion: emotionKey,
    energy,
    mouthSpeed: Math.round(mouthSpeed * 100) / 100,
    smileStrength,
    blinkRate: numericToPerformanceLevel(blinkNumeric),
    headMovement: numericToPerformanceLevel(headNumeric),
    idleMovement: profile.idleAnimationStyle,
    mouthState: params.activeSpeaker ? mouthState : "closed",
  };
}

export function resolveActiveSpeakerCharacterForScene(
  scene: {
    characters?: StudioCharacterListItem[];
    emotion?: string;
    sceneEnergy?: string;
  },
  voiceSegment: MotionVoiceSegmentHandoff | null | undefined,
): CharacterPerformanceState | null {
  const characters = scene.characters ?? [];
  if (characters.length === 0) {
    return null;
  }

  let activeChar: StudioCharacterListItem | null = null;
  if (voiceSegment?.speaker?.trim()) {
    activeChar =
      matchCharacterBySpeakerName(String(voiceSegment.speaker), characters) ?? null;
  }
  if (!activeChar) {
    activeChar = characters[0] ?? null;
  }
  if (!activeChar) {
    return null;
  }

  const sceneEnergy = scene.sceneEnergy ?? DEFAULT_STUDIO_SCENE_ENERGY;

  return buildCharacterPerformanceState({
    character: activeChar,
    activeSpeaker: true,
    emotion: scene.emotion ?? "",
    sceneEnergy,
    voiceSegment: voiceSegment ?? null,
  });
}

export function buildPerformanceStatesForHandoff(params: {
  storyboard: StudioStoryboardDetail;
  voiceSegments: MotionVoiceSegmentHandoff[];
}): CharacterPerformanceState[] {
  const segmentByScene = new Map(params.voiceSegments.map((s) => [s.sceneId, s]));
  const states: CharacterPerformanceState[] = [];

  for (const scene of params.storyboard.scenes) {
    const segment = segmentByScene.get(scene.id);
    const speakerName =
      typeof segment?.speaker === "string" ? segment.speaker.trim() : "";
    for (const ch of scene.characters ?? []) {
      const isActive =
        speakerName ?
          matchCharacterBySpeakerName(speakerName, scene.characters ?? [])?.id === ch.id
        : scene.characters?.[0]?.id === ch.id && Boolean(segment);
      states.push(
        buildCharacterPerformanceState({
          character: ch,
          activeSpeaker: isActive,
          emotion: scene.emotion ?? "",
          sceneEnergy: scene.sceneEnergy ?? DEFAULT_STUDIO_SCENE_ENERGY,
          voiceSegment: isActive ? segment ?? null : null,
        })
      );
    }
  }

  return states;
}

export function validateCharacterPerformanceConsistency(params: {
  storyboard: StudioStoryboardDetail;
  performanceStates: CharacterPerformanceState[];
}): CharacterPerformanceWarning[] {
  const warnings: CharacterPerformanceWarning[] = [];
  const assignments = buildCharacterPerformanceAssignments(params.storyboard);
  const stateByChar = new Map(
    params.performanceStates.map((s) => [s.characterId, s])
  );

  for (const profile of assignments) {
    if (!profile.performanceEnabled) {
      warnings.push({
        code: "performance_disabled",
        severity: "low",
        message: `${profile.characterName} performance is disabled.`,
        characterId: profile.characterId,
        characterName: profile.characterName,
      });
      continue;
    }
    if (profile.defaultSmileStrength >= 98 || profile.defaultSmileStrength <= 2) {
      warnings.push({
        code: "performance_extreme_values",
        severity: "medium",
        message: `${profile.characterName} smile strength is at an extreme (${profile.defaultSmileStrength}%).`,
        characterId: profile.characterId,
        characterName: profile.characterName,
      });
    }
    const state = stateByChar.get(profile.characterId);
    if (!state) {
      warnings.push({
        code: "performance_profile_missing",
        severity: "medium",
        message: `${profile.characterName} has no performance state for this storyboard.`,
        characterId: profile.characterId,
        characterName: profile.characterName,
      });
    }
  }

  for (const scene of params.storyboard.scenes) {
    const sceneStates = params.performanceStates.filter((s) =>
      scene.characters?.some((c) => c.id === s.characterId)
    );
    const hasActive = sceneStates.some((s) => s.activeSpeaker);
    const hasEnabledCast = scene.characters?.some((c) =>
      assignments.find((a) => a.characterId === c.id && a.performanceEnabled)
    );
    if (hasEnabledCast && sceneStates.length > 0 && !hasActive) {
      warnings.push({
        code: "speaker_without_performance_state",
        severity: "medium",
        message: `Scene "${scene.title}" has no active speaker performance state.`,
        sceneId: scene.id,
      });
    }
  }

  return warnings;
}

export function simulateScenePerformancePreview(params: {
  character: StudioCharacterListItem;
  emotion: string;
  sceneEnergy: string;
  activeSpeaker?: boolean;
}): CharacterPerformanceState {
  return buildCharacterPerformanceState({
    character: params.character,
    activeSpeaker: params.activeSpeaker ?? true,
    emotion: params.emotion,
    sceneEnergy: params.sceneEnergy,
    voiceSegment: {
      text: `Hello, I am ${params.character.name}.`,
      startSeconds: 0,
      endSeconds: 2.5,
    },
  });
}
