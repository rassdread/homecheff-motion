/**
 * Studio central HC spend gate — fail-closed.
 * When OFF, legacy Studio Credits remain authoritative (no destructive cutover).
 */
export function isStudioCentralHcSpendEnabled(): boolean {
  const flag = process.env.STUDIO_CENTRAL_HC_SPEND_ENABLED?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "on";
}

/** Map Studio action types to Growth HC catalog actions. */
export function studioActionToCentralHcAction(actionType: string): string | null {
  const key = actionType.trim().toLowerCase();
  if (
    key === "motion_render" ||
    key === "motion_render_5s_720p_turbo" ||
    key.includes("vidu") ||
    key.includes("motion")
  ) {
    return "motion_render_5s_720p_turbo";
  }
  if (key === "premium_vision_analysis" || key.includes("vision")) {
    return "premium_vision_analysis";
  }
  return null;
}
