/**
 * Preflight: ensure budgeted Vidu prompts stay under provider limits.
 */

import {
  buildInstantVideoPrompt,
  isInstantPremiumStylePreset,
  type BuildInstantVideoPromptInput,
  type InstantPremiumStylePreset,
} from "@/lib/instant-premium-prompt";
import { resolvePremiumPolishProfile } from "@/lib/premium-polish-settings";
import { premiumMotionProfileFromPosterSettings } from "@/lib/premium-motion-engine";
import { ANIMATION_STYLE_IDS, type AnimationStyleId } from "@/lib/animation-style-types";
import {
  buildBudgetedViduPrompt,
  validateViduPromptLength,
  type ViduPromptTooLongDebug,
} from "@/lib/vidu-prompt-budget";
import type { InstantPremiumCreatePayload } from "@/server/instant-premium/create-instant-premium-project";

export type ViduPromptPreflightResult =
  | { ok: true; chars: number }
  | { ok: false; code: "VIDU_PROMPT_TOO_LONG"; debug: ViduPromptTooLongDebug; animationStyleId?: AnimationStyleId };

function sampleBuildInput(
  styleId: AnimationStyleId,
  payload: InstantPremiumCreatePayload
): BuildInstantVideoPromptInput {
  const polishRaw = payload.posterMotionSettings ?? { version: 1, animationStyleId: styleId };
  const stylePreset: InstantPremiumStylePreset = isInstantPremiumStylePreset(payload.stylePreset)
    ? payload.stylePreset
    : "food_promo";
  return {
    stylePreset,
    duration: payload.duration === 15 ? 15 : 8,
    aspectRatio:
      payload.aspectRatio === "16:9" || payload.aspectRatio === "9:16" ? payload.aspectRatio : "9:16",
    userIntent: payload.userIntent ?? null,
    selectedChips: payload.selectedChips ?? [],
    continuityStrength: payload.continuityStrength ?? "balanced",
    lockedTextMode: payload.lockedTextMode !== false,
    bakedTextProtectionActive: false,
    hybridOverlayActive: false,
    posterMotionActive: true,
    textRenderMode: "poster_motion_preserve",
    motionProfile: premiumMotionProfileFromPosterSettings(polishRaw),
    polishSettingsRaw: { ...polishRaw, animationStyleId: styleId },
    transitionOrder: 1,
    transitionTotal: 3,
  };
}

export function buildSampleBudgetedViduPromptForStyle(
  styleId: AnimationStyleId,
  payload: InstantPremiumCreatePayload
): string {
  const main = buildInstantVideoPrompt(sampleBuildInput(styleId, payload));
  const segmentHint = `Segment 2/3: continue motion from prior keyframe seamlessly.`;
  const { prompt } = buildBudgetedViduPrompt({
    storyBlock: main,
    motionBlock: "",
    segmentHint,
  });
  return prompt;
}

export function runViduPromptLengthPreflight(
  payload: InstantPremiumCreatePayload
): ViduPromptPreflightResult {
  for (const styleId of ANIMATION_STYLE_IDS) {
    const prompt = buildSampleBudgetedViduPromptForStyle(styleId, payload);
    const check = validateViduPromptLength(prompt);
    if (!check.ok) {
      return { ok: false, code: "VIDU_PROMPT_TOO_LONG", debug: check.debug, animationStyleId: styleId };
    }
  }

  const resolved = resolvePremiumPolishProfile(payload.posterMotionSettings);
  const activePrompt = buildSampleBudgetedViduPromptForStyle(resolved.animationStyleId, payload);
  const activeCheck = validateViduPromptLength(activePrompt);
  if (!activeCheck.ok) {
    return {
      ok: false,
      code: "VIDU_PROMPT_TOO_LONG",
      debug: activeCheck.debug,
      animationStyleId: resolved.animationStyleId,
    };
  }

  return { ok: true, chars: activeCheck.chars };
}

export function instantViduPromptPreflightHttpStatus(result: ViduPromptPreflightResult): number {
  if (result.ok) {
    return 200;
  }
  return result.code === "VIDU_PROMPT_TOO_LONG" ? 400 : 400;
}
