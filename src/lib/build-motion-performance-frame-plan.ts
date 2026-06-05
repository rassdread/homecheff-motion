import {
  advancePerformanceRuntimeFrame,
  pickPerformanceStateForCharacter,
} from "@/lib/motion-character-performance-runtime";
import { mouthOpenAmountFromMouthState } from "@/lib/mouth-open-amount";
import {
  normalizeSceneEmotion,
  SCENE_ENERGY_MULTIPLIERS,
} from "@/lib/studio-character-performance";
import { normalizeStudioSceneEnergy } from "@/lib/studio-scene-director";
import { validateMotionPerformanceExport } from "@/lib/studio-performance-export-validation";
import {
  analyzeVoiceSegmentAmplitude,
  dominantMouthStateFromSamples,
} from "@/lib/voice-amplitude-analyzer";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { MotionHandoffPayload, MotionHandoffScene } from "@/types/motion-handoff-payload";
import type {
  MotionCharacterPerformanceFrame,
  MotionPerformanceExportWarning,
  MotionPerformanceFramePlan,
} from "@/types/motion-character-performance-export";
import type {
  CharacterPerformanceProfile,
  CharacterPerformanceState,
} from "@/types/studio-character-performance";
import type { CharacterSnapshot } from "@/types/studio-character-snapshot";
import type { MotionVoiceSegmentHandoff } from "@/types/studio-voice-execution";

const DEFAULT_SAMPLE_INTERVAL = 0.25;

export function mouthStateAtSegmentTime(
  segment: Pick<MotionVoiceSegmentHandoff, "text" | "startSeconds" | "endSeconds">,
  absoluteTimeSeconds: number
): ReturnType<typeof dominantMouthStateFromSamples> {
  const samples = analyzeVoiceSegmentAmplitude(segment);
  const offset = Math.max(0, absoluteTimeSeconds - segment.startSeconds);
  let best = samples[0];
  let bestDist = Infinity;
  for (const sample of samples) {
    const dist = Math.abs(sample.offsetSeconds - absoluteTimeSeconds);
    if (dist < bestDist) {
      bestDist = dist;
      best = sample;
    } else if (sample.offsetSeconds - segment.startSeconds > offset + 0.5) {
      break;
    }
  }
  return best?.mouthState ?? dominantMouthStateFromSamples(samples);
}

function sceneIndexForTime(
  scenes: MotionHandoffScene[],
  timeSeconds: number,
  voiceSegments: MotionVoiceSegmentHandoff[],
  videoDurationSeconds: number
): number {
  const seg = voiceSegments.find(
    (s) => timeSeconds >= s.startSeconds && timeSeconds < s.endSeconds
  );
  if (seg) {
    const idx = scenes.findIndex((sc) => sc.sceneId === seg.sceneId);
    if (idx >= 0) {
      return idx;
    }
  }
  if (scenes.length === 0) {
    return 0;
  }
  const slot = videoDurationSeconds / Math.max(1, scenes.length);
  return Math.min(scenes.length - 1, Math.floor(timeSeconds / Math.max(0.1, slot)));
}

function matchSnapshotBySpeaker(
  speaker: string,
  characters: CharacterSnapshot[]
): CharacterSnapshot | null {
  const norm = speaker.trim().toLowerCase();
  if (!norm) {
    return null;
  }
  return characters.find((c) => c.name.trim().toLowerCase() === norm) ?? null;
}

function sceneContextAtTime(
  scenes: MotionHandoffScene[],
  sceneIndex: number,
  voiceSegments: MotionVoiceSegmentHandoff[]
): {
  scene: MotionHandoffScene | null;
  segment: MotionVoiceSegmentHandoff | null;
  emotion: string;
  sceneEnergy: string;
} {
  const scene = scenes[sceneIndex] ?? scenes[0] ?? null;
  const segment =
    scene ?
      voiceSegments.find((s) => s.sceneId === scene.sceneId) ?? scene.voiceSegment ?? null
    : null;
  return {
    scene,
    segment: segment ?? null,
    emotion: scene?.emotion ?? "neutral",
    sceneEnergy: scene?.sceneEnergy ?? "neutral",
  };
}

function resolveBasePerformanceState(params: {
  handoffStates: CharacterPerformanceState[];
  profile: CharacterPerformanceProfile;
  activeSpeaker: boolean;
  scene: MotionHandoffScene | null;
}): CharacterPerformanceState {
  const picked = pickPerformanceStateForCharacter(
    params.handoffStates,
    params.profile.characterId,
    params.activeSpeaker
  );
  if (picked) {
    return { ...picked, activeSpeaker: params.activeSpeaker };
  }
  if (
    params.activeSpeaker &&
    params.scene?.speakerPerformance?.characterId === params.profile.characterId
  ) {
    return { ...params.scene.speakerPerformance, activeSpeaker: true };
  }
  return {
    characterId: params.profile.characterId,
    characterName: params.profile.characterName,
    activeSpeaker: params.activeSpeaker,
    emotion: normalizeSceneEmotion(params.scene?.emotion),
    energy: normalizeStudioSceneEnergy(params.scene?.sceneEnergy),
    mouthSpeed: params.activeSpeaker ? 1 : 0.3,
    smileStrength: params.profile.defaultSmileStrength,
    blinkRate: params.profile.defaultBlinkRate,
    headMovement: params.profile.defaultHeadMovement,
    idleMovement: params.profile.idleAnimationStyle,
    mouthState: params.activeSpeaker ? "small" : "closed",
  };
}

function buildFrameForCharacter(params: {
  time: number;
  sceneIndex: number;
  profile: CharacterPerformanceProfile;
  activeSpeaker: boolean;
  emotion: string;
  sceneEnergy: string;
  segment: MotionVoiceSegmentHandoff | null;
  scene: MotionHandoffScene | null;
  handoffStates: CharacterPerformanceState[];
}): MotionCharacterPerformanceFrame {
  const energyKey = (params.sceneEnergy ?? "neutral").trim().toLowerCase();
  const energyMultiplier =
    SCENE_ENERGY_MULTIPLIERS[energyKey as keyof typeof SCENE_ENERGY_MULTIPLIERS] ?? 1;
  const emotionModifier = normalizeSceneEmotion(params.emotion);

  const baseState = resolveBasePerformanceState({
    handoffStates: params.handoffStates,
    profile: params.profile,
    activeSpeaker: params.activeSpeaker,
    scene: params.scene,
  });

  let mouthState = baseState.mouthState;
  if (params.activeSpeaker && params.segment) {
    mouthState = mouthStateAtSegmentTime(params.segment, params.time);
  } else if (!params.activeSpeaker) {
    mouthState = "closed";
  }

  const runtime = advancePerformanceRuntimeFrame(
    { ...baseState, mouthState, activeSpeaker: params.activeSpeaker },
    params.time
  );

  const blinkState = runtime.blinkPhase >= 0.55 ? "open" : "closed";
  const headOffsetX = Math.round(runtime.headTilt * 10) / 10;
  const headOffsetY = Math.round(Math.cos(params.time * 0.7) * runtime.headTilt * 0.3 * 10) / 10;
  const idleOffsetX = Math.round(runtime.idleOffset * 12 * 10) / 10;
  const idleOffsetY = Math.round(Math.sin(params.time * 0.9) * runtime.idleOffset * 8 * 10) / 10;

  return {
    time: Math.round(params.time * 100) / 100,
    sceneIndex: params.sceneIndex,
    characterId: params.profile.characterId,
    characterName: params.profile.characterName,
    activeSpeaker: params.activeSpeaker,
    mouthState,
    mouthOpenAmount: mouthOpenAmountFromMouthState(mouthState),
    smileStrength: runtime.smileStrength,
    blinkState,
    headOffsetX,
    headOffsetY,
    idleOffsetX,
    idleOffsetY,
    energyMultiplier,
    emotionModifier,
  };
}

export function buildMotionPerformanceFramePlan(params: {
  handoff: MotionHandoffPayload | null;
  videoDurationSeconds: number;
  sampleIntervalSeconds?: number;
}): MotionPerformanceFramePlan {
  const warnings: MotionPerformanceExportWarning[] = [];
  const handoff = params.handoff;

  if (!handoff || handoff.version < MOTION_HANDOFF_PAYLOAD_VERSION) {
    return { frames: [], warnings: [], enabledCharacterCount: 0 };
  }

  const profiles = (handoff.characterPerformanceProfiles ?? []).filter(
    (p) => p.performanceEnabled
  );
  if (profiles.length === 0) {
    return { frames: [], warnings: [], enabledCharacterCount: 0 };
  }

  warnings.push(
    ...validateMotionPerformanceExport({ handoff, profiles }).map((w) => ({
      code: w.code,
      message: w.message,
    }))
  );

  const duration = Math.max(0.5, params.videoDurationSeconds);
  const interval = params.sampleIntervalSeconds ?? DEFAULT_SAMPLE_INTERVAL;
  const scenes = handoff.scenes ?? [];
  const voiceSegments = handoff.voiceSegments ?? [];
  const handoffStates = handoff.performanceStates ?? [];
  const frames: MotionCharacterPerformanceFrame[] = [];
  const steps = Math.max(1, Math.ceil(duration / interval));

  for (let i = 0; i <= steps; i++) {
    const time = Math.min(duration, i * interval);
    const sceneIndex = sceneIndexForTime(scenes, time, voiceSegments, duration);
    const ctx = sceneContextAtTime(scenes, sceneIndex, voiceSegments);

    const activeProfileId =
      ctx.segment?.speaker?.trim() ?
        matchSnapshotBySpeaker(String(ctx.segment.speaker), ctx.scene?.characters ?? [])?.id ??
        null
      : null;

    for (const profile of profiles) {
      const activeSpeaker = activeProfileId ? profile.characterId === activeProfileId : false;

      frames.push(
        buildFrameForCharacter({
          time,
          sceneIndex,
          profile,
          activeSpeaker,
          emotion: ctx.emotion,
          sceneEnergy: ctx.sceneEnergy,
          segment: ctx.segment,
          scene: ctx.scene,
          handoffStates,
        })
      );
    }
  }

  return {
    frames,
    warnings,
    enabledCharacterCount: profiles.length,
  };
}
