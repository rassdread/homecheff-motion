/**
 * SHARED_PURE — Studio generation error taxonomy (S.4).
 */

export const STUDIO_GENERATION_ERROR_CODES = [
  "INSUFFICIENT_CREDITS",
  "INVALID_INPUT",
  "PROVIDER_UNAVAILABLE",
  "PROVIDER_REJECTED",
  "RATE_LIMITED",
  "TIMEOUT",
  "CANCELLED",
  "RESULT_INVALID",
  "STORAGE_FAILED",
  "ATTACHMENT_FAILED",
  "UNAUTHORIZED",
  "CONFLICT",
  "INTERNAL_ERROR",
] as const;

export type StudioGenerationErrorCode = (typeof STUDIO_GENERATION_ERROR_CODES)[number];

export function safeStudioGenerationErrorMessage(code: StudioGenerationErrorCode): string {
  switch (code) {
    case "INSUFFICIENT_CREDITS":
      return "Not enough credits for this generation.";
    case "INVALID_INPUT":
      return "The generation request is invalid.";
    case "PROVIDER_UNAVAILABLE":
      return "The generation service is temporarily unavailable.";
    case "PROVIDER_REJECTED":
      return "The generation request was rejected.";
    case "RATE_LIMITED":
      return "Too many generation requests. Try again shortly.";
    case "TIMEOUT":
      return "Generation timed out.";
    case "CANCELLED":
      return "Generation was cancelled.";
    case "RESULT_INVALID":
      return "The generation result could not be validated.";
    case "STORAGE_FAILED":
      return "Generation succeeded but saving the result failed. Credits were not recharged.";
    case "ATTACHMENT_FAILED":
      return "Generation succeeded but attaching the result failed. Credits were not recharged.";
    case "UNAUTHORIZED":
      return "You cannot access this generation job.";
    case "CONFLICT":
      return "A generation with this request is already in progress.";
    default:
      return "Generation failed. You can retry if credits were not charged.";
  }
}
