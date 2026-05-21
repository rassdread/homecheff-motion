/**
 * Global HomeCheff mascot animation behavior — injected into Vidu motion prompts when mascots are detected.
 */

import type { CharacterRoleId, CharacterSceneRole } from "@/lib/character-role-engine";
import type { SceneIntelligenceSnapshot } from "@/lib/scene-intelligence";

export const GLOBAL_MASCOT_ANIMATION_BLOCK_ID = "global_mascot_animation";

/** Canonical HomeCheff mascot character roles (extend here for future variants). */
export const HOME_CHEFF_MASCOT_ROLE_IDS: readonly CharacterRoleId[] = [
  "CHEF_HOST",
  "GARDEN_GUIDE",
  "DESIGN_CREATOR",
] as const;

const MASCOT_CORPUS_RE =
  /\bmascot\b|\bhomecheff\s+character\b|\bchef\s+mascot\b|\bgarden\s+mascot\b|\bdesign\s+mascot\b|\bmascotte\b/i;

const ROLE_VARIANT_HINTS: Partial<Record<CharacterRoleId, string>> = {
  CHEF_HOST: "Chef mascot: warm presenter presence, inviting micro-gestures.",
  GARDEN_GUIDE: "Garden mascot: calm nurturing energy, organic gentle pacing.",
  DESIGN_CREATOR: "Design mascot: creative showcase poise, subtle proud focus.",
};

/** Compact block for budgeted Vidu prompts (single injection, all mascot variants). */
export const COMPACT_GLOBAL_MASCOT_ANIMATION_LINE = `GLOBAL MASCOT (HomeCheff): living character in a real cinematic world — never a static logo/sticker. Natural blinks and subtle eye/eyebrow motion; mouth mostly closed with occasional soft smile or tiny speaking/reacting moves (subtle, realistic — no rubber mouth or wide cartoon talk). Calm, warm, premium energy; gentle head/body breathing and smooth gestures. Preserve exact face structure, proportions, colors, and outfit — no morphing, deformation, or hyperactive cartoon loops.`;

const FULL_GLOBAL_MASCOT_SECTIONS = [
  "GLOBAL MASCOT ANIMATION (HomeCheff — all chef/garden/design and future mascot variants):",
  "CHARACTER RULE: mascots are living characters inside the real world, not static logos or stickers. Warm, friendly, calm, emotionally aware, cinematic premium energy.",
  "FACE: natural blink cycles; subtle eye movement; occasional eyebrow motion; mouth stays closed most of the time; soft natural smile at times; rare subtle mouth movement as if softly speaking, explaining, reacting, or greeting — always subtle and realistic.",
  "AVOID FACE: exaggerated talking animation, wide cartoon smiles, exaggerated expressions, hyperactive cartoon behavior, rubber-mouth animation, random teeth, face deformation.",
  "BODY: gentle head movement, subtle body sway, natural breathing, smooth gestures, realistic timing, cinematic pacing — semi-alive, not fully cartoon-animated.",
  "PRESERVE: exact mascot identity, facial structure, proportions, colors, outfit details; integrated real-world lighting and shadows.",
  "AVOID MOTION: morphing, Disney-style chaos, stiff mannequin freeze, repeated identical gesture loops.",
] as const;

export function isHomeCheffMascotRole(roleId: CharacterRoleId): boolean {
  return (HOME_CHEFF_MASCOT_ROLE_IDS as readonly string[]).includes(roleId);
}

export type MascotSceneDetectionInput = {
  roles?: CharacterSceneRole[];
  scene?: SceneIntelligenceSnapshot | null;
  userIntent?: string | null;
  /** When explicitly false, skip mascot preset (e.g. typography-only mode). */
  animateMascot?: boolean;
};

/**
 * True when the scene includes any HomeCheff mascot entity (chef, garden, design, or future variants).
 */
export function sceneContainsHomeCheffMascot(input: MascotSceneDetectionInput): boolean {
  if (input.animateMascot === false) {
    return false;
  }

  const roles = input.roles ?? input.scene?.detectedRoles ?? [];
  const mascotRoles = roles.filter((r) => isHomeCheffMascotRole(r.roleId));
  if (mascotRoles.length > 0) {
    return true;
  }

  if (input.scene?.mascotCount && input.scene.mascotCount > 0) {
    return true;
  }

  const focus = input.scene?.focusHint;
  if (focus === "mascot_trio" || focus === "single_mascot") {
    return true;
  }

  const corpus = [input.userIntent, ...(input.scene?.keywords ?? [])].filter(Boolean).join(" ");
  if (corpus && MASCOT_CORPUS_RE.test(corpus)) {
    return true;
  }

  return false;
}

function buildMascotVariantHintLine(roles: CharacterSceneRole[]): string {
  const seen = new Set<CharacterRoleId>();
  const hints: string[] = [];
  for (const role of roles) {
    if (!isHomeCheffMascotRole(role.roleId) || seen.has(role.roleId)) {
      continue;
    }
    seen.add(role.roleId);
    const hint = ROLE_VARIANT_HINTS[role.roleId];
    if (hint) {
      hints.push(hint);
    }
  }
  return hints.join(" ");
}

/**
 * Global mascot behavior block — omit when no mascot detected; never duplicate per mascot count.
 */
export function buildGlobalMascotAnimationPromptBlock(params: {
  roles?: CharacterSceneRole[];
  scene?: SceneIntelligenceSnapshot | null;
  userIntent?: string | null;
  animateMascot?: boolean;
  compact?: boolean;
}): string {
  if (
    !sceneContainsHomeCheffMascot({
      roles: params.roles,
      scene: params.scene,
      userIntent: params.userIntent,
      animateMascot: params.animateMascot,
    })
  ) {
    return "";
  }

  const roles = params.roles ?? params.scene?.detectedRoles ?? [];
  const variantHint = buildMascotVariantHintLine(roles);

  if (params.compact !== false) {
    return variantHint
      ? `${COMPACT_GLOBAL_MASCOT_ANIMATION_LINE} ${variantHint}`
      : COMPACT_GLOBAL_MASCOT_ANIMATION_LINE;
  }

  const parts: string[] = [...FULL_GLOBAL_MASCOT_SECTIONS];
  if (variantHint) {
    parts.push(`VARIANT ENERGY: ${variantHint}`);
  }
  return parts.join("\n");
}
