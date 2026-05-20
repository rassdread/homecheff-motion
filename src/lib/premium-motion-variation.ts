/**
 * Motion variation engine — gesture diversity and personality-based sequencing.
 */

import type { CharacterRoleId, CharacterSceneRole } from "@/lib/character-role-engine";
import { getCharacterRoleProfile } from "@/lib/character-role-engine";
import type { MotionEnergy } from "@/lib/premium-motion-engine";

const GESTURE_DIVERSITY_BLOCK = `GESTURE DIVERSITY:
- Never repeat identical arm arcs, sway cycles, or hand-wave loops within a clip or across segments.
- Alternate gesture families: open palm → point → present → rest → subtle shift — natural sequencing.
- Vary intensity: strong beat → medium → micro-gesture; avoid mechanical metronome timing.`;

const PERSONALITY_GESTURE_HINTS: Record<CharacterRoleId, string> = {
  CHEF_HOST: "Chef mascot: presenter energy — expressive hands toward food/audience, inviting open gestures, cooking-demo rhythm.",
  GARDEN_GUIDE: "Garden mascot: softer warm movement — nurturing points, gentle sway, organic pacing without sharp snaps.",
  DESIGN_CREATOR: "Design mascot: artistic showcase — reveal gestures, creative framing hands, design-forward poses.",
  HUMAN_PRESENTER: "Human creator: realistic UGC presenter — conversational hand talk, subtle shoulders, social-media authenticity.",
  AFFILIATE_SELLER: "Affiliate seller: product-forward gestures — confident point-to-product, open palm offers.",
  MARKETPLACE_VISITOR: "Marketplace visitor: curious browse energy — light discover gestures, approachable waves.",
  BACKGROUND_CROWD: "Background crowd: ambient sway only — no detailed gesture performance.",
};

export type MotionVariationSegmentPhase = "opening" | "mid" | "closing";

export function resolveMotionVariationPhase(
  transitionOrder: number,
  transitionTotal: number
): MotionVariationSegmentPhase {
  if (transitionTotal <= 1 || transitionOrder === 0) {
    return "opening";
  }
  if (transitionOrder >= transitionTotal - 1) {
    return "closing";
  }
  return "mid";
}

export function buildPersonalityMotionBlock(roles: CharacterSceneRole[]): string {
  const leads = roles.filter((r) => r.roleId !== "BACKGROUND_CROWD").slice(0, 3);
  if (!leads.length) {
    return "";
  }
  const lines = leads.map((r) => `- ${PERSONALITY_GESTURE_HINTS[r.roleId]}`);
  return `PERSONALITY-BASED MOTION:\n${lines.join("\n")}`;
}

export function buildMotionVariationEngineBlock(params: {
  roles: CharacterSceneRole[];
  motionEnergy: MotionEnergy;
  transitionOrder: number;
  transitionTotal: number;
  avoidGestureBeats?: string[];
}): string {
  const phase = resolveMotionVariationPhase(params.transitionOrder, params.transitionTotal);
  const parts: string[] = [GESTURE_DIVERSITY_BLOCK, buildPersonalityMotionBlock(params.roles)];

  const roleGestures = params.roles
    .slice(0, 3)
    .map((r) => getCharacterRoleProfile(r.roleId).gestureStyle)
    .join("; ");
  if (roleGestures) {
    parts.push(`GESTURE STYLE TARGET: ${roleGestures}`);
  }

  if (params.avoidGestureBeats?.length) {
    parts.push(
      `AVOID REPEATING PRIOR SEGMENT GESTURES: ${params.avoidGestureBeats.join(", ")} — use a different gesture family and timing.`
    );
  }

  const phaseLines: Record<MotionVariationSegmentPhase, string> = {
    opening:
      "OPENING SEQUENCE: establish presence with a fresh primary gesture and expression — not a recycled loop from later beats.",
    mid: "MID SEQUENCE: transition gestures naturally — change arm path, timing asymmetry, and facial emphasis vs prior segment.",
    closing:
      "CLOSING SEQUENCE: resolve with a distinct finishing gesture — presentation landing, not a repeat of opening or mid moves.",
  };
  parts.push(phaseLines[phase]);

  if (params.motionEnergy === "viral" || params.motionEnergy === "energetic") {
    parts.push("Energy accent: punchier gesture peaks on emphasis frames — still physically plausible.");
  }

  return parts.filter(Boolean).join("\n\n");
}

/** Richer per-segment hint for animation-jobs (replaces basic variation-only line). */
export function buildMotionVariationSegmentHint(params: {
  transitionOrder: number;
  transitionTotal: number;
  motionEnergy: MotionEnergy;
  avoidGestureBeats?: string[];
}): string {
  const phase = resolveMotionVariationPhase(params.transitionOrder, params.transitionTotal);
  const avoid =
    params.avoidGestureBeats?.length ?
      ` Avoid: ${params.avoidGestureBeats.join(", ")}.`
    : "";
  return `MOTION VARIATION ENGINE (segment ${params.transitionOrder + 1}/${params.transitionTotal}, ${phase}): fresh gesture sequencing and asymmetric timing.${avoid}`;
}
