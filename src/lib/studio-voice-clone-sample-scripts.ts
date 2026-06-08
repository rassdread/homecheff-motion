/**
 * Teleprompter scripts for voice clone recording — no AI, static copy via i18n keys.
 */

export type CloneSampleScriptLength = "quick" | "normal" | "professional";

export const CLONE_SAMPLE_SCRIPT_LENGTHS: CloneSampleScriptLength[] = [
  "quick",
  "normal",
  "professional",
];

export const CLONE_SAMPLE_SCRIPT_LABEL_KEYS: Record<CloneSampleScriptLength, string> = {
  quick: "studio.voiceClone.script.quick",
  normal: "studio.voiceClone.script.normal",
  professional: "studio.voiceClone.script.professional",
};

export const CLONE_SAMPLE_SCRIPT_DURATION_KEYS: Record<CloneSampleScriptLength, string> = {
  quick: "studio.voiceClone.script.quickDuration",
  normal: "studio.voiceClone.script.normalDuration",
  professional: "studio.voiceClone.script.professionalDuration",
};

export const CLONE_SAMPLE_SCRIPT_BODY_KEYS: Record<CloneSampleScriptLength, string> = {
  quick: "studio.voiceClone.script.quickBody",
  normal: "studio.voiceClone.script.normalBody",
  professional: "studio.voiceClone.script.professionalBody",
};
