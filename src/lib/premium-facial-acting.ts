/**
 * Facial performance system — expressive micro-acting for Vidu prompts.
 */

import type { CharacterRoleId, CharacterSceneRole } from "@/lib/character-role-engine";
import { getCharacterRoleProfile } from "@/lib/character-role-engine";
import type { EmotionalActingPresetId } from "@/lib/premium-emotional-presets";
import type { MotionEnergy } from "@/lib/premium-motion-engine";

const FACIAL_CORE_BLOCK = `FACIAL PERFORMANCE SYSTEM:
- Active blink cycles (not frozen eyes); natural eyelid timing with occasional double-blink on emphasis beats.
- Eye direction: subtle gaze shifts toward product, audience, or co-character — never dead-center stare-lock.
- Expression variation: micro-smile changes, eyebrow lifts, gentle head tilt — evolve within one emotional arc.
- Prevent: frozen faces, dead-eye look, static expressions, emotion snapping between frames, uncanny smile lock.`;

/** Compact line for budgeted Vidu motion stack (priority 1). */
export const COMPACT_FACIAL_PRIORITY_LINE =
  "Prioritize living faces: blinking eyes, smile changes, eyebrow motion, subtle mouth movement and emotional reactions; avoid frozen mascot faces and hand-only loops.";

const ROLE_FACIAL_HINTS: Partial<Record<CharacterRoleId, string>> = {
  CHEF_HOST: "Chef mascot: big friendly smile, presenter reactions, welcoming eyes.",
  GARDEN_GUIDE: "Garden guide: warm curious expression, soft attentive eyes.",
  DESIGN_CREATOR: "Design creator: creative proud expression, focused inspired eyes.",
};

const EMOTIONAL_FACIAL_HINTS: Partial<Record<EmotionalActingPresetId, string>> = {
  playful_mascot: "Playful facial beats: brighter eyes, quick eyebrow pops, charming smile variation.",
  excited_seller: "Sales energy: confident smile, alert eyes, enthusiastic eyebrow emphasis on product beats.",
  confident_presenter: "Assured presenter face: steady warm smile, controlled blinks, professional eye contact.",
  energetic_creator: "Creator energy: expressive brows, engaging eye line, authentic micro-expressions.",
  luxury_showcase: "Luxury showcase: refined subtle expression, confident eyes, elegant micro-smiles.",
  dramatic_comic_reveal: "Comic reveal: expressive brows, animated smile beats, presentation pop on key frame.",
};

export function buildFacialActingForRole(roleId: CharacterRoleId): string {
  const p = getCharacterRoleProfile(roleId);
  return `${roleId.replace(/_/g, " ")}: ${p.facialEnergy}; blinks: ${p.blinkIntensity}; emotional: ${p.emotionalActing}.`;
}

export function buildRoleFacialActingHint(roles: CharacterSceneRole[]): string {
  if (!roles.length) {
    return "";
  }
  const lead = roles[0]?.roleId;
  if (!lead) {
    return "";
  }
  return ROLE_FACIAL_HINTS[lead] ?? "";
}

/** Single combined facial line for compact motion stack. */
export function buildCompactFacialActingLine(roles: CharacterSceneRole[]): string {
  const roleHint = buildRoleFacialActingHint(roles);
  if (!roleHint) {
    return COMPACT_FACIAL_PRIORITY_LINE;
  }
  return `${COMPACT_FACIAL_PRIORITY_LINE} ${roleHint}`;
}

/** Verbose block — deprecated for Vidu; kept for automation tests / legacy paths. */
export function buildFacialActingPromptBlock(params: {
  roles: CharacterSceneRole[];
  emotionalActingPreset?: EmotionalActingPresetId;
  motionEnergy?: MotionEnergy;
  segmentPhase?: "opening" | "mid" | "closing";
}): string {
  const { roles, emotionalActingPreset, motionEnergy, segmentPhase } = params;
  const parts: string[] = [FACIAL_CORE_BLOCK];

  if (emotionalActingPreset && EMOTIONAL_FACIAL_HINTS[emotionalActingPreset]) {
    parts.push(`EMOTIONAL FACE (${emotionalActingPreset}): ${EMOTIONAL_FACIAL_HINTS[emotionalActingPreset]}`);
  }

  if (motionEnergy === "viral" || motionEnergy === "energetic") {
    parts.push(
      "Social-native facial timing: slightly faster expression shifts on hook beats — still smooth, never snap-cut faces."
    );
  } else if (motionEnergy === "calm") {
    parts.push("Calm facial pacing: minimal expression drift, slow blinks, preserve design readability.");
  }

  const leadRoles = roles.filter((r) => r.roleId !== "BACKGROUND_CROWD").slice(0, 3);
  if (leadRoles.length) {
    parts.push(
      `ROLE FACIAL DIRECTION:\n${leadRoles.map((r) => `- ${buildFacialActingForRole(r.roleId)}`).join("\n")}`
    );
  }

  if (segmentPhase === "opening") {
    parts.push("Opening facial beat: establish expression and eye line — fresh, not mid-gesture frozen.");
  } else if (segmentPhase === "closing") {
    parts.push("Closing facial beat: resolve expression naturally — hold continuity from prior segment emotion.");
  } else if (segmentPhase === "mid") {
    parts.push("Mid-sequence facial beat: shift micro-expression and gaze — do not repeat prior segment's exact face pose.");
  }

  return parts.join("\n\n");
}
