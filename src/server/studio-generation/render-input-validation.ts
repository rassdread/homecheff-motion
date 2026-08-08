/**
 * SERVER_ONLY — Fail before expensive render when required Studio inputs are missing (S.4F).
 */

export type StudioRenderPrerequisiteInput = {
  hasScenes: boolean;
  hasSceneImages: boolean;
  voiceRequired: boolean;
  hasVoiceAudio: boolean;
  subtitlesRequired: boolean;
  hasSubtitles: boolean;
};

export type StudioRenderPrerequisiteResult =
  | { ok: true }
  | { ok: false; code: "MISSING_RENDER_INPUTS"; missing: string[]; safeMessage: string };

export function validateStudioRenderPrerequisites(
  input: StudioRenderPrerequisiteInput
): StudioRenderPrerequisiteResult {
  const missing: string[] = [];
  if (!input.hasScenes) missing.push("scenes");
  if (!input.hasSceneImages) missing.push("scene_images");
  if (input.voiceRequired && !input.hasVoiceAudio) missing.push("voice_audio");
  if (input.subtitlesRequired && !input.hasSubtitles) missing.push("subtitles");

  if (missing.length === 0) {
    return { ok: true };
  }
  return {
    ok: false,
    code: "MISSING_RENDER_INPUTS",
    missing,
    safeMessage: `Cannot start render — missing required inputs: ${missing.join(", ")}.`,
  };
}
