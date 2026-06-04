import { mouthStateToIntensity } from "@/lib/voice-amplitude-analyzer";
import type { CharacterPerformanceState, MouthMovementState } from "@/types/studio-character-performance";

export type MotionPerformanceRuntimeFrame = {
  characterId: string;
  timestampSeconds: number;
  mouthState: MouthMovementState;
  mouthOpenness: number;
  smileStrength: number;
  blinkPhase: number;
  headTilt: number;
  idleOffset: number;
};

/**
 * Lightweight Motion-side animation tick — no facial reconstruction.
 * Foundation for future visemes / advanced lip sync.
 */
export function advancePerformanceRuntimeFrame(
  state: CharacterPerformanceState,
  timestampSeconds: number,
  options?: { fps?: number }
): MotionPerformanceRuntimeFrame {
  const fps = options?.fps ?? 24;
  const t = timestampSeconds;
  const energyScale = state.activeSpeaker ? state.mouthSpeed : 0.4;
  const blinkHz =
    state.blinkRate === "high" ? 0.35
    : state.blinkRate === "low" ? 0.12
    : 0.22;
  const headHz = state.headMovement === "high" ? 0.15 : state.headMovement === "low" ? 0.06 : 0.1;
  const idleHz =
    state.idleMovement === "lively" ? 0.08
    : state.idleMovement === "natural" ? 0.05
    : 0.03;

  const mouthPulse =
    state.activeSpeaker ?
      Math.abs(Math.sin(t * Math.PI * 2 * energyScale * (fps / 24)))
    : 0.05;
  const mouthState = state.mouthState;
  const mouthOpenness =
    state.activeSpeaker ?
      mouthStateToIntensity(mouthState) * mouthPulse
    : 0.05;

  return {
    characterId: state.characterId,
    timestampSeconds: t,
    mouthState,
    mouthOpenness: Math.round(mouthOpenness * 100) / 100,
    smileStrength: state.smileStrength,
    blinkPhase: (Math.sin(t * Math.PI * 2 * blinkHz) + 1) / 2,
    headTilt: Math.sin(t * Math.PI * 2 * headHz) * (state.headMovement === "high" ? 4 : 2),
    idleOffset: Math.sin(t * Math.PI * 2 * idleHz),
  };
}

export function pickPerformanceStateForCharacter(
  states: CharacterPerformanceState[],
  characterId: string,
  preferActiveSpeaker = true
): CharacterPerformanceState | null {
  const matches = states.filter((s) => s.characterId === characterId);
  if (matches.length === 0) {
    return null;
  }
  if (preferActiveSpeaker) {
    return matches.find((s) => s.activeSpeaker) ?? matches[0]!;
  }
  return matches[0]!;
}
