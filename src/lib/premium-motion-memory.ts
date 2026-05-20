/**
 * Motion memory layer — cross-segment continuity without pipeline changes.
 */

import type { AnimationStyleId } from "@/lib/animation-style-types";
import { getAnimationStyleIdentity } from "@/lib/animation-style-identity";
import type { CharacterRoleId, CharacterSceneRole } from "@/lib/character-role-engine";
import { buildFocusCycleForSegment } from "@/lib/primary-shared-group";
import type { EmotionalActingPresetId } from "@/lib/premium-emotional-presets";
import type { MotionEnergy } from "@/lib/premium-motion-engine";
import type { SceneFocusHint } from "@/lib/scene-intelligence";
import { resolveMotionVariationPhase, type MotionVariationSegmentPhase } from "@/lib/premium-motion-variation";

export type GestureBeatId =
  | "open_palm_present"
  | "point_emphasis"
  | "invite_wave"
  | "product_reveal"
  | "subtle_sway"
  | "head_tilt_beat"
  | "conversational_hands"
  | "closing_nod";

export type MotionMemoryState = {
  version: 1;
  animationStyleId: AnimationStyleId;
  motionEnergy: MotionEnergy;
  emotionalTone?: EmotionalActingPresetId;
  focusHint?: SceneFocusHint;
  dominantRole?: CharacterRoleId;
  segmentPhase: MotionVariationSegmentPhase;
  activeGestureBeat: GestureBeatId;
  priorGestureBeats: GestureBeatId[];
  cameraDirection: "stable" | "drift_in" | "drift_out" | "punch_emphasis" | "parallax_depth";
  mascotEnergy: "low" | "medium" | "high";
  bodyOrientation: "center" | "left" | "right";
  emotionalContinuity: string;
};

const GESTURE_CYCLE: GestureBeatId[] = [
  "open_palm_present",
  "point_emphasis",
  "invite_wave",
  "subtle_sway",
  "head_tilt_beat",
  "conversational_hands",
  "product_reveal",
  "closing_nod",
];

function gestureForSegmentIndex(index: number, avoid: GestureBeatId[]): GestureBeatId {
  for (let i = 0; i < GESTURE_CYCLE.length; i++) {
    const beat = GESTURE_CYCLE[(index + i) % GESTURE_CYCLE.length]!;
    if (!avoid.includes(beat)) {
      return beat;
    }
  }
  return GESTURE_CYCLE[index % GESTURE_CYCLE.length]!;
}

function cameraDirectionForPhase(
  phase: MotionVariationSegmentPhase,
  styleId: AnimationStyleId
): MotionMemoryState["cameraDirection"] {
  const identity = getAnimationStyleIdentity(styleId);
  if (identity.cameraPreset === "punch_in") {
    return phase === "mid" ? "punch_emphasis" : "drift_in";
  }
  if (identity.cameraPreset === "parallax") {
    return "parallax_depth";
  }
  if (identity.cameraPreset === "dramatic_reveal") {
    return phase === "opening" ? "drift_in" : "stable";
  }
  if (identity.cameraPreset === "none") {
    return "stable";
  }
  return phase === "closing" ? "drift_out" : "drift_in";
}

function mascotEnergyFromMotion(motionEnergy: MotionEnergy): MotionMemoryState["mascotEnergy"] {
  if (motionEnergy === "viral" || motionEnergy === "energetic") {
    return "high";
  }
  if (motionEnergy === "calm") {
    return "low";
  }
  return "medium";
}

export function deriveMotionMemoryState(params: {
  animationStyleId: AnimationStyleId;
  motionEnergy: MotionEnergy;
  transitionOrder: number;
  transitionTotal: number;
  roles?: CharacterSceneRole[];
  focusHint?: SceneFocusHint;
  emotionalActingPreset?: EmotionalActingPresetId;
  focusCycle?: CharacterRoleId[];
}): MotionMemoryState {
  const {
    animationStyleId,
    motionEnergy,
    transitionOrder,
    transitionTotal,
    roles = [],
    focusHint,
    emotionalActingPreset,
    focusCycle = [],
  } = params;

  const segmentPhase = resolveMotionVariationPhase(transitionOrder, transitionTotal);
  const priorGestureBeats = Array.from({ length: transitionOrder }, (_, i) =>
    gestureForSegmentIndex(i, [])
  );
  const activeGestureBeat = gestureForSegmentIndex(transitionOrder, priorGestureBeats);

  const cycle =
    focusCycle.length ?
      buildFocusCycleForSegment({ focusCycle, transitionOrder, transitionTotal })
    : null;
  const dominantRole = cycle?.dominantRole ?? roles[0]?.roleId;

  const emotionalContinuity =
    emotionalActingPreset ?
      `Maintain ${emotionalActingPreset.replace(/_/g, " ")} emotional tone from prior segments.`
    : "Preserve emotional arc — no expression reset between segments.";

  return {
    version: 1,
    animationStyleId,
    motionEnergy,
    emotionalTone: emotionalActingPreset,
    focusHint,
    dominantRole,
    segmentPhase,
    activeGestureBeat,
    priorGestureBeats,
    cameraDirection: cameraDirectionForPhase(segmentPhase, animationStyleId),
    mascotEnergy: mascotEnergyFromMotion(motionEnergy),
    bodyOrientation: transitionOrder % 2 === 0 ? "center" : (transitionOrder % 3 === 0 ? "left" : "right"),
    emotionalContinuity,
  };
}

export function buildMotionMemoryPromptBlock(state: MotionMemoryState): string {
  const dominant = state.dominantRole?.replace(/_/g, " ") ?? "lead subject";
  return `MOTION MEMORY (segment continuity A→B→C):
- Active gesture beat: ${state.activeGestureBeat.replace(/_/g, " ")} — do not repeat: ${state.priorGestureBeats.map((b) => b.replace(/_/g, " ")).join(", ") || "none yet"}.
- ${state.emotionalContinuity}
- Camera momentum: ${state.cameraDirection.replace(/_/g, " ")} — directional consistency, no random zoom or shake spam.
- Mascot energy level: ${state.mascotEnergy}; body orientation bias: ${state.bodyOrientation}.
- Motion emphasis on: ${dominant}; background receives ambient motion only.
- Scene momentum: carry gesture and expression forward — no pose lottery between segments.`;
}
