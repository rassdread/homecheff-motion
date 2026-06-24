/** Typed Style DNA error codes — never return raw 502 for expected validation states. */
export const STYLE_DNA_ERROR_CODES = [
  "STYLE_DNA_ASSET_NOT_FOUND",
  "STYLE_DNA_IMAGE_MISSING",
  "STYLE_DNA_IMAGE_UNREADABLE",
  "STYLE_DNA_BILLING_REQUIRED",
  "STYLE_DNA_CONTRACT_REQUIRED",
  "STYLE_DNA_PROVIDER_FAILED",
  "STYLE_DNA_TIMEOUT",
  "STYLE_DNA_CACHE_MISS",
  "STYLE_DNA_UNSUPPORTED_IMAGE",
  "STYLE_DNA_INTERNAL_ERROR",
] as const;

export type StyleDnaErrorCode = (typeof STYLE_DNA_ERROR_CODES)[number];

export type StyleDnaBillingMode =
  /** Parent premium-credits session already reserved — no wallet gate on this route. */
  | "premium_session"
  /** Standalone wizard / asset derivation — bill via vision_analysis. */
  | "standalone"
  /** Covered by active Video Plan production transaction. */
  | "production_contract"
  /** Cached result reused — no provider call, no charge. */
  | "cache_hit";

export const STYLE_DNA_USER_MESSAGE_NL =
  "De analyse van je personage is niet gelukt. Probeer het opnieuw of kies een andere afbeelding.";

export function styleDnaUserMessage(code: StyleDnaErrorCode, adminDebug?: string): string {
  if (adminDebug?.trim()) {
    return adminDebug.trim();
  }
  switch (code) {
    case "STYLE_DNA_BILLING_REQUIRED":
    case "STYLE_DNA_CONTRACT_REQUIRED":
      return "Je hebt niet genoeg credits voor deze analyse.";
    case "STYLE_DNA_IMAGE_MISSING":
    case "STYLE_DNA_IMAGE_UNREADABLE":
    case "STYLE_DNA_UNSUPPORTED_IMAGE":
    case "STYLE_DNA_ASSET_NOT_FOUND":
      return STYLE_DNA_USER_MESSAGE_NL;
    case "STYLE_DNA_TIMEOUT":
      return "De analyse duurde te lang. Probeer het opnieuw.";
    default:
      return STYLE_DNA_USER_MESSAGE_NL;
  }
}

export function styleDnaHttpStatus(code: StyleDnaErrorCode): number {
  switch (code) {
    case "STYLE_DNA_IMAGE_MISSING":
    case "STYLE_DNA_UNSUPPORTED_IMAGE":
      return 400;
    case "STYLE_DNA_IMAGE_UNREADABLE":
    case "STYLE_DNA_ASSET_NOT_FOUND":
      return 400;
    case "STYLE_DNA_BILLING_REQUIRED":
      return 402;
    case "STYLE_DNA_CONTRACT_REQUIRED":
      return 403;
    case "STYLE_DNA_PROVIDER_FAILED":
      return 503;
    case "STYLE_DNA_TIMEOUT":
      return 504;
    case "STYLE_DNA_CACHE_MISS":
      return 404;
    default:
      return 500;
  }
}
