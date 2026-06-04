/**
 * Studio V28 — AI Voice Director orchestrator.
 */

import { buildVoiceRequest, estimateVoiceCredits, validateVoiceSettings } from "@/lib/elevenlabs-voice";
import {
  getVoiceProfilePreset,
  normalizeStudioNarrationMode,
  normalizeStudioVoiceProfileId,
  profileIdForNarrationMode,
  voiceStyleFromProfile,
} from "@/lib/studio-voice-profiles";
import {
  applyVoiceProfileToneHints,
  buildVoiceScriptBundle,
  type VoiceScriptBundle,
} from "@/lib/studio-voice-script-builder";
import { averageSceneFitScore, planVoiceTiming, type VoiceTimingReport } from "@/lib/studio-voice-timing";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export type VoiceDirectorReport = {
  enabled: boolean;
  voiceLanguage: string;
  voiceStyle: string;
  voiceProfile: string;
  narrationMode: string;
  presetLabelKey: string;
  script: VoiceScriptBundle;
  timing: VoiceTimingReport;
  voiceScore: number;
  elevenLabsRequest: ReturnType<typeof buildVoiceRequest> | null;
  estimatedCredits: number;
  settingsValid: boolean;
  settingsErrorCode: string | null;
};

export function computeVoiceScore(params: {
  enabled: boolean;
  script: VoiceScriptBundle;
  timing: VoiceTimingReport;
  settingsValid: boolean;
}): number {
  if (!params.enabled) {
    return 0;
  }
  if (!params.settingsValid) {
    return 15;
  }
  const wordCount = params.timing.totalWords;
  if (wordCount < 8) {
    return 20;
  }
  const fit = averageSceneFitScore(params.timing.sceneTimings);
  const warningPenalty = Math.min(40, params.timing.warnings.length * 8);
  const base = Math.min(100, fit);
  return Math.max(0, Math.min(100, base - warningPenalty + (wordCount > 40 ? 10 : 0)));
}

export function analyzeVoiceDirector(storyboard: StudioStoryboardDetail): VoiceDirectorReport {
  const enabled = storyboard.voiceEnabled ?? false;
  const voiceLanguage = (storyboard.voiceLanguage ?? "en").trim().toLowerCase().slice(0, 2) || "en";
  const narrationMode = normalizeStudioNarrationMode(storyboard.narrationMode);
  const voiceProfile = normalizeStudioVoiceProfileId(
    storyboard.voiceProfile || profileIdForNarrationMode(narrationMode)
  );
  const voiceStyle = storyboard.voiceStyle?.trim() || voiceStyleFromProfile(voiceProfile);
  const preset = getVoiceProfilePreset(voiceProfile);

  const rawScript = buildVoiceScriptBundle({
    storyboard,
    narrationMode,
    aiDirectorPrompt: storyboard.aiDirectorPrompt,
    language: voiceLanguage,
  });

  const savedScript = storyboard.voiceNarrationScript?.trim();
  const script = applyVoiceProfileToneHints(
    savedScript
      ? { ...rawScript, fullNarration: savedScript, shortNarration: savedScript.slice(0, 400) }
      : rawScript,
    preset
  );

  const timing = planVoiceTiming({ storyboard, script, profile: preset });

  const validation = validateVoiceSettings({
    voiceEnabled: enabled,
    voiceLanguage,
    voiceProfile,
    narrationMode,
    script: script.fullNarration,
  });

  const settingsValid = validation.ok;
  const settingsErrorCode = validation.ok ? null : validation.code;

  const voiceScore = computeVoiceScore({ enabled, script, timing, settingsValid });

  const elevenLabsRequest =
    enabled && settingsValid
      ? buildVoiceRequest({
          script: script.fullNarration,
          voiceProfile,
          voiceLanguage,
          narrationMode,
          preset,
        })
      : null;

  const credits = estimateVoiceCredits(script.fullNarration.length);

  return {
    enabled,
    voiceLanguage,
    voiceStyle,
    voiceProfile,
    narrationMode,
    presetLabelKey: preset.labelKey,
    script,
    timing,
    voiceScore,
    elevenLabsRequest,
    estimatedCredits: credits.estimatedCredits,
    settingsValid,
    settingsErrorCode,
  };
}
