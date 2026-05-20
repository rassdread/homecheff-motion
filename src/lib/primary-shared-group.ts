/**
 * PRIMARY_SHARED_GROUP — cinematic multi-character directing without chaotic motion.
 */

import type { CharacterRoleId, CharacterSceneRole } from "@/lib/character-role-engine";

export type SharedGroupTier =
  | "PRIMARY_SHARED"
  | "SECONDARY_SUPPORT"
  | "BACKGROUND_AMBIENT"
  | "STATIC_PRESERVE";

export type SharedGroupMember = {
  roleId: CharacterRoleId | "TYPOGRAPHY" | "LOGO" | "UI_PANEL";
  tier: SharedGroupTier;
  focusWeight: number;
  motionPriority: number;
  emotionalIntensity: number;
  gestureComplexity: number;
};

export type PrimarySharedGroupPlan = {
  version: 1;
  isMultiLead: boolean;
  members: SharedGroupMember[];
  focusCycle: CharacterRoleId[];
};

const TRIO_ROLES: CharacterRoleId[] = ["CHEF_HOST", "GARDEN_GUIDE", "DESIGN_CREATOR"];

function tierForRole(roleId: CharacterRoleId, isMultiLead: boolean): SharedGroupTier {
  if (roleId === "BACKGROUND_CROWD") {
    return "BACKGROUND_AMBIENT";
  }
  if (isMultiLead && TRIO_ROLES.includes(roleId)) {
    return "PRIMARY_SHARED";
  }
  if (TRIO_ROLES.includes(roleId)) {
    return "PRIMARY_SHARED";
  }
  if (roleId === "MARKETPLACE_VISITOR") {
    return "SECONDARY_SUPPORT";
  }
  return "PRIMARY_SHARED";
}

/** Build focus cycle for mascot trio — shifts attention over segment timeline. */
export function buildFocusCycleForSegment(params: {
  focusCycle: CharacterRoleId[];
  transitionOrder: number;
  transitionTotal: number;
  durationSec?: number;
}): { dominantRole: CharacterRoleId; phaseLabel: string } {
  const { focusCycle, transitionOrder, transitionTotal } = params;
  if (!focusCycle.length) {
    return { dominantRole: "CHEF_HOST", phaseLabel: "balanced ensemble" };
  }
  const t = transitionTotal <= 1 ? 0 : transitionOrder / Math.max(1, transitionTotal - 1);
  if (t < 0.35) {
    return {
      dominantRole: focusCycle[0] ?? "CHEF_HOST",
      phaseLabel: "opening focus — lead character slightly dominant",
    };
  }
  if (t < 0.7 && focusCycle.length > 1) {
    return {
      dominantRole: focusCycle[1] ?? focusCycle[0],
      phaseLabel: "mid-cycle — shift attention to co-lead naturally",
    };
  }
  return {
    dominantRole: focusCycle[focusCycle.length - 1] ?? focusCycle[0],
    phaseLabel: "closing beat — balanced shared energy across all leads",
  };
}

export function buildPrimarySharedGroupPlan(roles: CharacterSceneRole[]): PrimarySharedGroupPlan {
  const leadRoles = roles.filter((r) => TRIO_ROLES.includes(r.roleId as CharacterRoleId));
  const isMultiLead = leadRoles.length >= 2;
  const focusCycle =
    leadRoles.length >= 2
      ? leadRoles.map((r) => r.roleId as CharacterRoleId)
      : roles
          .filter((r) => r.roleId !== "BACKGROUND_CROWD")
          .map((r) => r.roleId as CharacterRoleId)
          .slice(0, 2);

  const members: SharedGroupMember[] = roles.map((r) => {
    const tier = tierForRole(r.roleId, isMultiLead);
    const isPrimary = tier === "PRIMARY_SHARED";
    return {
      roleId: r.roleId,
      tier,
      focusWeight: isPrimary ? (isMultiLead ? 0.85 : 1) : tier === "SECONDARY_SUPPORT" ? 0.5 : 0.2,
      motionPriority: isPrimary ? 100 : tier === "SECONDARY_SUPPORT" ? 60 : 25,
      emotionalIntensity: isPrimary ? 0.9 : 0.5,
      gestureComplexity: isPrimary ? 0.85 : 0.4,
    };
  });

  members.push({
    roleId: "TYPOGRAPHY",
    tier: "STATIC_PRESERVE",
    focusWeight: 0,
    motionPriority: 0,
    emotionalIntensity: 0,
    gestureComplexity: 0,
  });

  return {
    version: 1,
    isMultiLead,
    members,
    focusCycle: focusCycle.length ? focusCycle : ["CHEF_HOST"],
  };
}

export function buildPrimarySharedGroupPromptBlock(params: {
  plan: PrimarySharedGroupPlan;
  transitionOrder: number;
  transitionTotal: number;
}): string {
  const { plan, transitionOrder, transitionTotal } = params;
  if (!plan.isMultiLead && plan.members.filter((m) => m.tier === "PRIMARY_SHARED").length <= 1) {
    return "";
  }
  const { dominantRole, phaseLabel } = buildFocusCycleForSegment({
    focusCycle: plan.focusCycle,
    transitionOrder,
    transitionTotal,
  });
  const sharedRoles = plan.members
    .filter((m) => m.tier === "PRIMARY_SHARED")
    .map((m) => m.roleId)
    .join(", ");
  return `PRIMARY_SHARED_GROUP (cinematic multi-character directing):
- Co-lead characters (${sharedRoles}) are equally important — do NOT demote any mascot to background.
- ${phaseLabel}; this segment emphasizes ${dominantRole.replace(/_/g, " ")} slightly more motion focus.
- PRIMARY_SHARED: expressive faces, gesture detail, emotional energy.
- SECONDARY_SUPPORT: reactive softer motion only.
- BACKGROUND_AMBIENT: subtle environmental movement.
- STATIC_PRESERVE: typography, logos, UI — zero morphing.
- No hard cuts, no random simultaneous flailing, no chaotic equal looping on all characters.
- Direct attention like a professional animated promo — natural focus cycling.`;
}
