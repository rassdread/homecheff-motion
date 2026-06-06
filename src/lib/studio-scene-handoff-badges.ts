import type { StudioSceneDetail } from "@/types/studio-api";

export type StudioHandoffBadge =
  | "studio_source"
  | "text_beats"
  | "voice_plan"
  | "music_plan"
  | "sound_plan"
  | "motion_instructions";

export function resolveStudioSceneHandoffBadges(scene: StudioSceneDetail): StudioHandoffBadge[] {
  const badges: StudioHandoffBadge[] = ["studio_source"];
  if (scene.title?.trim() || scene.description?.trim() || scene.action?.trim()) {
    badges.push("text_beats");
  }
  if (scene.characters.some((c) => c.voiceEnabled)) {
    badges.push("voice_plan");
  }
  if (scene.musicCueType?.trim() || scene.musicEnergyTarget?.trim()) {
    badges.push("music_plan");
  }
  if (
    scene.soundEnvironmentOverride?.trim() ||
    scene.soundPropOverride?.trim() ||
    scene.soundAmbientOverride?.trim()
  ) {
    badges.push("sound_plan");
  }
  if (scene.shotType?.trim() || scene.cameraMovement?.trim() || scene.action?.trim()) {
    badges.push("motion_instructions");
  }
  return badges;
}

export const STUDIO_HANDOFF_BADGE_I18N: Record<StudioHandoffBadge, string> = {
  studio_source: "studio.handoffBadge.studioSource",
  text_beats: "studio.handoffBadge.textBeats",
  voice_plan: "studio.handoffBadge.voicePlan",
  music_plan: "studio.handoffBadge.musicPlan",
  sound_plan: "studio.handoffBadge.soundPlan",
  motion_instructions: "studio.handoffBadge.motionInstructions",
};
