/**
 * DeeVid-style compact orchestration, negative safety, and pre-render quality gates.
 */

import { VIDU_PROMPT_MAX_CHARS } from "@/lib/vidu-prompt-budget";
import type { FrameContinuityMode } from "@/lib/exact-frame-continuity";
import type { SegmentJoinPlan } from "@/lib/exact-frame-continuity";

/** Compact orchestration (priority 1/2) — one continuous comic world. */
export const DEEVID_ORCHESTRATION_LINE =
  "One continuous comic world: same camera momentum across shared keyframes; characters stay emotionally alive; text/UI locked and readable; no generated extra text; no fresh-shot reset at shared keyframes.";

/** Provider-safe negative line — blocks invented typography between frames. */
export const VIDU_NEGATIVE_TEXT_SAFETY_LINE =
  "Do not create new readable text, fake words, extra headlines, random captions, or language-like typography.";

export type PremiumQualityGateSummary = {
  promptWithinBudget: boolean;
  promptChars: number;
  promptMaxChars: number;
  hardTextLockSatisfied: boolean;
  sharedKeyframeContinuity: boolean;
  imageUrlsValid: boolean;
  segmentImagesComplete: boolean;
  rolesDetected: boolean;
  allPassed: boolean;
  failedChecks: string[];
};

export function buildPremiumQualityGateSummary(params: {
  promptChars: number;
  promptOk: boolean;
  textLockBlock: boolean;
  textLockMode: string;
  urlInvalid: boolean;
  imageCount: number;
  transitionTotal: number;
  detectedRoles: string[];
  segmentJoins: SegmentJoinPlan[];
}): PremiumQualityGateSummary {
  const failedChecks: string[] = [];
  const promptWithinBudget = params.promptOk && params.promptChars <= VIDU_PROMPT_MAX_CHARS;
  if (!promptWithinBudget) {
    failedChecks.push("prompt_length");
  }
  const hardTextLockSatisfied = !(params.textLockBlock && params.textLockMode === "auto_hard_lock");
  if (!hardTextLockSatisfied) {
    failedChecks.push("text_lock");
  }
  if (params.urlInvalid) {
    failedChecks.push("image_url");
  }
  const segmentImagesComplete = params.imageCount >= 2 && params.transitionTotal > 0;
  if (!segmentImagesComplete) {
    failedChecks.push("segment_images");
  }
  const sharedKeyframeContinuity = params.segmentJoins.some((j) => j.mode === "continuation");
  const rolesDetected = params.detectedRoles.length > 0;
  const imageUrlsValid = !params.urlInvalid;

  return {
    promptWithinBudget,
    promptChars: params.promptChars,
    promptMaxChars: VIDU_PROMPT_MAX_CHARS,
    hardTextLockSatisfied,
    sharedKeyframeContinuity,
    imageUrlsValid,
    segmentImagesComplete,
    rolesDetected,
    allPassed:
      failedChecks.length === 0 &&
      promptWithinBudget &&
      hardTextLockSatisfied &&
      imageUrlsValid &&
      segmentImagesComplete,
    failedChecks,
  };
}

export function primaryContinuityModeFromJoins(
  joins: SegmentJoinPlan[]
): FrameContinuityMode {
  if (joins.some((j) => j.mode === "continuation")) {
    return "continuation";
  }
  return "normal";
}
