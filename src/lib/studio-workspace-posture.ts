/**
 * Studio Adaptive Workspace postures (S.2 / ADR-006 + ADR-STUDIO-005).
 *
 * Prefer usable space over device labels. Orientation still matters for
 * mobile landscape vs portrait chrome (robot policy, tool rail placement).
 */

export type StudioWorkspacePosture = "full" | "compact" | "focused" | "mobile";

export type StudioOrientation = "portrait" | "landscape";

export type StudioWorkspaceLayoutPlan = {
  posture: StudioWorkspacePosture;
  orientation: StudioOrientation;
  /** Permanent left scene/source rail in the grid */
  showInlineLeftRail: boolean;
  /** Permanent right inspector rail in the grid */
  showInlineRightRail: boolean;
  /** Bottom tool strip (portrait / desktop). Landscape mobile uses side tool rail instead. */
  showBottomToolStrip: boolean;
  /** Compact vertical tool rail for mobile landscape */
  showSideToolRail: boolean;
  /** Permanent robot/mascot chrome — always false on mobile postures */
  showPermanentRobot: boolean;
  /** On-demand AI entry (sheet / toolbar) */
  showOnDemandAiEntry: boolean;
  /** Drop arbitrary max-width clamps that waste ultrawide space */
  unconstrainedWidth: boolean;
};

export const STUDIO_POSTURE_BREAKPOINTS = {
  /** FULL — ultrawide / large desktop */
  fullMinWidth: 1440,
  /** COMPACT — standard desktop / laptop */
  compactMinWidth: 1024,
  /** FOCUSED — tablet band */
  focusedMinWidth: 768,
} as const;

export function resolveStudioOrientation(width: number, height: number): StudioOrientation {
  return width >= height ? "landscape" : "portrait";
}

/**
 * Map viewport into a workspace posture.
 * Phone landscape (short height) stays `mobile` even when width enters the tablet band,
 * so robot policy and side tool-rail chrome still apply.
 */
export function resolveStudioWorkspacePosture(
  width: number,
  height: number
): StudioWorkspacePosture {
  const orientation = resolveStudioOrientation(width, height);
  const phoneLandscape = orientation === "landscape" && height < 500;
  if (phoneLandscape || width < STUDIO_POSTURE_BREAKPOINTS.focusedMinWidth) {
    return "mobile";
  }
  if (width < STUDIO_POSTURE_BREAKPOINTS.compactMinWidth) {
    return "focused";
  }
  if (width < STUDIO_POSTURE_BREAKPOINTS.fullMinWidth) {
    return "compact";
  }
  return "full";
}

export function planStudioWorkspaceLayout(
  width: number,
  height: number
): StudioWorkspaceLayoutPlan {
  const posture = resolveStudioWorkspacePosture(width, height);
  const orientation = resolveStudioOrientation(width, height);
  const isMobile = posture === "mobile";
  const isFocused = posture === "focused";
  const mobileLandscape = isMobile && orientation === "landscape";

  return {
    posture,
    orientation,
    showInlineLeftRail: posture === "full" || posture === "compact",
    showInlineRightRail: posture === "full" || posture === "compact",
    showBottomToolStrip: !mobileLandscape,
    showSideToolRail: mobileLandscape,
    showPermanentRobot: false, // no permanent robot chrome in S.2; desktop AI stays contextual rail/sheet
    showOnDemandAiEntry: isMobile || isFocused,
    unconstrainedWidth: posture === "full",
  };
}

/** Canonical robot / mascot permanent-render gate (S.2 release gate). */
export function shouldRenderPermanentStudioRobot(plan: StudioWorkspaceLayoutPlan): boolean {
  if (plan.posture === "mobile") {
    return false;
  }
  return plan.showPermanentRobot;
}
