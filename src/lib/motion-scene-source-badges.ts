import type { PersistedWizardSceneSlot } from "@/lib/instant-premium-wizard-storage";

export type MotionSceneSourceBadge =
  | "studio"
  | "manual_text"
  | "manual_image"
  | "text_protected";

export function sceneHasManualTextOverride(slot: PersistedWizardSceneSlot): boolean {
  if (!slot.studioContext?.studioTextBeats) {
    return false;
  }
  const beats = slot.studioContext.studioTextBeats;
  const text = slot.text;
  if (
    beats.heroText?.trim() &&
    text.heroText?.trim() &&
    text.heroText.trim() !== beats.heroText.trim()
  ) {
    return true;
  }
  const studioTitle = beats.titleBeats?.[0]?.trim() ?? "";
  if (studioTitle && text.title?.trim() && text.title.trim() !== studioTitle) {
    return true;
  }
  const studioSubtitle = beats.subtitleBeats?.[0]?.trim() ?? "";
  if (studioSubtitle && text.subtitle?.trim() && text.subtitle.trim() !== studioSubtitle) {
    return true;
  }
  return false;
}

export function resolveMotionSceneSourceBadges(
  slot: PersistedWizardSceneSlot,
  options?: { syncTextsProtected?: boolean }
): MotionSceneSourceBadge[] {
  const badges: MotionSceneSourceBadge[] = [];
  if (slot.studioContext) {
    badges.push("studio");
  }
  if (slot.image?.imageSource === "manual") {
    badges.push("manual_image");
  }
  if (sceneHasManualTextOverride(slot)) {
    badges.push("manual_text");
    badges.push("text_protected");
  }
  return badges;
}

export const MOTION_SCENE_BADGE_I18N: Record<MotionSceneSourceBadge, string> = {
  studio: "motion.sceneBadge.studio",
  manual_text: "motion.sceneBadge.manualText",
  manual_image: "motion.sceneBadge.manualImage",
  text_protected: "motion.sceneBadge.textProtected",
};
