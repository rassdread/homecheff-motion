/**
 * Facial performance system — expressive micro-acting for Vidu prompts.
 */

import type { CharacterRoleId, CharacterSceneRole } from "@/lib/character-role-engine";
import { getCharacterRoleProfile } from "@/lib/character-role-engine";
import { isHomeCheffMascotRole } from "@/lib/premium-mascot-animation-preset";
import type { EmotionalActingPresetId } from "@/lib/premium-emotional-presets";
import type { MotionEnergy } from "@/lib/premium-motion-engine";

const FACIAL_CORE_BLOCK = `FACIAL PERFORMANCE SYSTEM:
- Active blink cycles (not frozen eyes); natural eyelid timing with occasional double-blink on emphasis beats.
- Eye direction: subtle gaze shifts toward product, audience, or co-character — never dead-center stare-lock.
- Expression variation: micro-smile changes, eyebrow lifts, gentle head tilt — evolve within one emotional arc.
- Prevent: frozen faces, dead-eye look, static expressions, emotion snapping between frames, uncanny smile lock.`;

/** Compact line for budgeted Vidu motion stack (priority 1). */
export const COMPACT_FACIAL_PRIORITY_LINE =
  "Prioritize living faces: blinking eyes, smile changes, eyebrow motion, subtle mouth movement and emotional reactions.";

export const FACIAL_ANTI_PATTERN_LINE =
  "Avoid frozen faces, fixed smiles, dead eyes, repeated hand loops.";

export type MicroActingProfileId =
  | "chef_mascot"
  | "garden_mascot"
  | "design_mascot"
  | "human_presenter"
  | "generic_mascot";

const ROLE_MICRO_ACTING: Partial<Record<CharacterRoleId, string>> = {
  CHEF_HOST:
    "Chef mascot: warm presenter smile, eye contact, small eyebrow lift, subtle mouth movement, inviting gesture.",
  GARDEN_GUIDE:
    "Garden mascot: curious warm eyes, relaxed blink, gentle smile, calm reaction.",
  DESIGN_CREATOR:
    "Design mascot: proud creative smile, focused eyes, subtle nod, showcase gesture.",
  HUMAN_PRESENTER:
    "Human presenter: realistic eye movement, breathing, natural hand/finger motion, subtle reaction timing.",
  AFFILIATE_SELLER:
    "Seller: confident smile, alert eyes, product-forward gesture, subtle eyebrow emphasis.",
  MARKETPLACE_VISITOR:
    "Visitor: curious eyes, friendly blink, light discovering reaction.",
  BACKGROUND_CROWD: "Background: soft ambient reaction only — no hero face lock.",
};

const ROLE_TO_PROFILE: Partial<Record<CharacterRoleId, MicroActingProfileId>> = {
  CHEF_HOST: "chef_mascot",
  GARDEN_GUIDE: "garden_mascot",
  DESIGN_CREATOR: "design_mascot",
  HUMAN_PRESENTER: "human_presenter",
  AFFILIATE_SELLER: "human_presenter",
  MARKETPLACE_VISITOR: "generic_mascot",
  BACKGROUND_CROWD: "generic_mascot",
};

const EMOTIONAL_FACIAL_HINTS: Partial<Record<EmotionalActingPresetId, string>> = {
  playful_mascot: "Playful facial beats: brighter eyes, quick eyebrow pops, charming smile variation.",
  excited_seller: "Sales energy: confident smile, alert eyes, enthusiastic eyebrow emphasis on product beats.",
  confident_presenter: "Assured presenter face: steady warm smile, controlled blinks, professional eye contact.",
  energetic_creator: "Creator energy: expressive brows, engaging eye line, authentic micro-expressions.",
  luxury_showcase: "Luxury showcase: refined subtle expression, confident eyes, elegant micro-smiles.",
  dramatic_comic_reveal: "Comic reveal: expressive brows, animated smile beats, presentation pop on key frame.",
};

export function resolveMicroActingProfileId(roles: CharacterSceneRole[]): MicroActingProfileId {
  const lead = roles.find((r) => r.roleId !== "BACKGROUND_CROWD")?.roleId;
  if (!lead) {
    return "generic_mascot";
  }
  return ROLE_TO_PROFILE[lead] ?? "generic_mascot";
}

export function buildFacialActingForRole(roleId: CharacterRoleId): string {
  const p = getCharacterRoleProfile(roleId);
  return `${roleId.replace(/_/g, " ")}: ${p.facialEnergy}; blinks: ${p.blinkIntensity}; emotional: ${p.emotionalActing}.`;
}

export function buildRoleFacialActingHint(roles: CharacterSceneRole[]): string {
  if (!roles.length) {
    return "";
  }
  const lead = roles.find((r) => r.roleId !== "BACKGROUND_CROWD")?.roleId;
  if (!lead) {
    return "";
  }
  return ROLE_MICRO_ACTING[lead] ?? "";
}

/** Single combined facial line for compact motion stack (priority 1/2). */
export function buildCompactFacialActingLine(roles: CharacterSceneRole[]): string {
  const roleHint = buildRoleFacialActingHint(roles);
  const parts = [COMPACT_FACIAL_PRIORITY_LINE, roleHint, FACIAL_ANTI_PATTERN_LINE].filter(Boolean);
  return parts.join(" ");
}

/** Verbose block — deprecated for Vidu; kept for automation tests / legacy paths. */
export function buildFacialActingPromptBlock(params: {
  roles: CharacterSceneRole[];
  emotionalActingPreset?: EmotionalActingPresetId;
  motionEnergy?: MotionEnergy;
  segmentPhase?: "opening" | "mid" | "closing";
  /** When global mascot animation rules are already injected. */
  skipGlobalFacialCore?: boolean;
  /** Omit per-role facial lines for HomeCheff mascots (global preset covers them). */
  excludeMascotRolesFromRoleHints?: boolean;
}): string {
  const { roles, emotionalActingPreset, motionEnergy, segmentPhase } = params;
  const parts: string[] = [];
  if (!params.skipGlobalFacialCore) {
    parts.push(FACIAL_CORE_BLOCK);
  } else {
    parts.push("FACIAL SUPPLEMENT (mascot scene — global mascot animation rules already applied):");
  }

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

  const leadRoles = roles
    .filter((r) => r.roleId !== "BACKGROUND_CROWD")
    .filter((r) => !(params.excludeMascotRolesFromRoleHints && isHomeCheffMascotRole(r.roleId)))
    .slice(0, 3);
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
