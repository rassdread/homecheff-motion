/**
 * Cinematic directing intelligence — focus weighting and motion budget allocation.
 */

import type { AnimationStyleId } from "@/lib/animation-style-types";
import { getAnimationStyleIdentity } from "@/lib/animation-style-identity";
import type { CharacterRoleId } from "@/lib/character-role-engine";
import {
  buildFocusCycleForSegment,
  buildPrimarySharedGroupPlan,
  type PrimarySharedGroupPlan,
} from "@/lib/primary-shared-group";
import type { CharacterSceneRole } from "@/lib/character-role-engine";
import type { SceneFocusHint } from "@/lib/scene-intelligence";

const MOTION_BUDGET_BLOCK = `MOTION BUDGET ALLOCATION:
- PRIMARY subject: strongest acting — face, hands, gesture detail, emotional energy (70% motion emphasis).
- SECONDARY co-characters: supportive reactive motion only — softer, never competing with primary (25%).
- BACKGROUND: ambient environmental motion only — parallax, light drift, crowd sway (5%).
- STATIC_PRESERVE: typography, logos, UI — zero morphing or drift.`;

export function buildCinematicDirectingBlock(params: {
  animationStyleId: AnimationStyleId;
  roles: CharacterSceneRole[];
  focusHint?: SceneFocusHint;
  transitionOrder?: number;
  transitionTotal?: number;
  sharedPlan?: PrimarySharedGroupPlan;
}): string {
  const { animationStyleId, roles, focusHint, transitionOrder = 0, transitionTotal = 1 } = params;
  const identity = getAnimationStyleIdentity(animationStyleId);
  const plan = params.sharedPlan ?? buildPrimarySharedGroupPlan(roles);
  const parts: string[] = [
    `CINEMATIC DIRECTING (${identity.directing.focusStrategy.replace(/_/g, " ")}):`,
    identity.directing.promptBlock.split("\n").slice(0, 2).join("\n"),
    MOTION_BUDGET_BLOCK,
  ];

  if (identity.directing.typographyPriority === "maximum") {
    parts.push("Typography priority: maximum — text/logo regions are frozen; motion budget goes to foreground subjects only.");
  }

  if (plan.isMultiLead && plan.focusCycle.length >= 2) {
    const { dominantRole, phaseLabel } = buildFocusCycleForSegment({
      focusCycle: plan.focusCycle,
      transitionOrder,
      transitionTotal,
    });
    parts.push(
      `DYNAMIC FOCUS WEIGHTING (segment ${transitionOrder + 1}/${transitionTotal}):
- ${phaseLabel}
- Dominant motion emphasis: ${dominantRole.replace(/_/g, " ")} — co-leads react subtly, not equally loud.
- Attention cycling example: chef → garden → balanced trio — never chaotic simultaneous flailing.`
    );
  } else if (focusHint === "product_hero") {
    parts.push(
      "Product-led directing: hero product receives subtle premium motion; presenter supports; background ambient only."
    );
  } else if (focusHint === "human_presenter") {
    parts.push("Presenter-led: face and hands receive primary motion budget; authentic creator framing.");
  }

  const primaryMembers = plan.members.filter((m) => m.tier === "PRIMARY_SHARED");
  if (primaryMembers.length) {
    parts.push(
      `Focus weights: ${primaryMembers.map((m) => `${String(m.roleId)} (${m.focusWeight})`).join(", ")}.`
    );
  }

  return parts.join("\n\n");
}

export function resolveDominantRoleForSegment(
  focusCycle: CharacterRoleId[],
  transitionOrder: number,
  transitionTotal: number
): CharacterRoleId {
  return buildFocusCycleForSegment({ focusCycle, transitionOrder, transitionTotal }).dominantRole;
}
