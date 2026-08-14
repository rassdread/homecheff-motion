export const STUDIO_SSO_ERROR_CODES = [
  "SSO_DISABLED",
  "SSO_INVALID",
  "SSO_EXPIRED",
  "SSO_USED",
  "SSO_STATE_REJECTED",
  "IDENTITY_NOT_LINKED",
  "IDENTITY_MAPPING_CONFLICT",
  "IDENTITY_EMAIL_COLLISION",
  "CLAIM_UNAUTHORIZED",
  "CLAIM_ALREADY_LINKED",
  "CENTRAL_ACCOUNT_DISABLED",
  "RETRY_LATER",
  "CONFIG_ERROR",
  "EXCHANGE_FAILED",
  "INTERNAL_ERROR",
] as const;
export type StudioSsoErrorCode = (typeof STUDIO_SSO_ERROR_CODES)[number];

export class StudioSsoError extends Error {
  readonly code: StudioSsoErrorCode;

  constructor(code: StudioSsoErrorCode, message?: string) {
    super(message ?? code);
    this.name = "StudioSsoError";
    this.code = code;
  }
}

export function mapHomeCheffExchangeError(code: string | undefined): StudioSsoErrorCode {
  switch (code) {
    case "INVALID_CODE":
    case "INVALID_REQUEST":
    case "AUDIENCE_MISMATCH":
    case "REDIRECT_MISMATCH":
    case "PKCE_FAILED":
      return "SSO_INVALID";
    case "EXPIRED_CODE":
      return "SSO_EXPIRED";
    case "USED_CODE":
      return "SSO_USED";
    case "ACCOUNT_DISABLED":
      return "CENTRAL_ACCOUNT_DISABLED";
    case "RATE_LIMITED":
      return "RETRY_LATER";
    case "UNAUTHORIZED_CLIENT":
    case "SSO_DISABLED":
      return "CONFIG_ERROR";
    default:
      return "EXCHANGE_FAILED";
  }
}

/**
 * SP.2B.8 — Map unexpected callback failures AFTER HomeCheff exchange succeeded.
 * Never collapse DB / provisioning errors into EXCHANGE_FAILED (that misleads operators
 * and shows a generic "sign-in problem" for authenticated new product users).
 */
export function mapUnknownStudioCallbackFailure(
  err: unknown,
  phase: "exchange" | "resolve" | "session" = "resolve",
): StudioSsoErrorCode {
  if (err instanceof StudioSsoError) return err.code;
  if (phase === "exchange") return "EXCHANGE_FAILED";

  const msg = err instanceof Error ? err.message : String(err ?? "");
  const lower = msg.toLowerCase();
  if (
    lower.includes("can't reach database") ||
    lower.includes("cannot reach database") ||
    lower.includes("connection") ||
    lower.includes("econnrefused") ||
    lower.includes("etimedout") ||
    lower.includes("p1001") ||
    lower.includes("timed out")
  ) {
    return "RETRY_LATER";
  }
  return "INTERNAL_ERROR";
}

/** English fallbacks (tests / non-i18n). Prefer `auth.sso.error.*` keys in UI. */
export function studioSsoErrorMessage(code: StudioSsoErrorCode): string {
  switch (code) {
    case "SSO_DISABLED":
      return "HomeCheff sign-in is not available right now.";
    case "SSO_INVALID":
      return "Inloggen bij Studio is niet gelukt.";
    case "SSO_EXPIRED":
      return "The sign-in request expired. Please try again.";
    case "SSO_USED":
      return "This sign-in link was already used.";
    case "SSO_STATE_REJECTED":
      return "The sign-in request was invalid or expired.";
    case "IDENTITY_NOT_LINKED":
      return "Er is nog geen Studio-profiel voor dit HomeCheff-account. Probeer opnieuw of neem contact op met support.";
    case "IDENTITY_MAPPING_CONFLICT":
      return "We hebben al een Studio-account gevonden dat nog niet aan dit HomeCheff-account is gekoppeld.";
    case "IDENTITY_EMAIL_COLLISION":
      return "We hebben al een Studio-account gevonden dat nog niet aan dit HomeCheff-account is gekoppeld.";
    case "CLAIM_UNAUTHORIZED":
      return "Sign in to your existing Studio account first, then link HomeCheff.";
    case "CLAIM_ALREADY_LINKED":
      return "This Studio account is already linked to a different HomeCheff identity.";
    case "CENTRAL_ACCOUNT_DISABLED":
      return "This HomeCheff account cannot sign in to Studio.";
    case "RETRY_LATER":
      return "Studio is even niet bereikbaar. Probeer het zo opnieuw.";
    case "CONFIG_ERROR":
      return "Sign-in is temporarily unavailable.";
    case "EXCHANGE_FAILED":
      return "Inloggen bij Studio is niet gelukt.";
    case "INTERNAL_ERROR":
      return "Inloggen bij Studio is niet gelukt.";
    default:
      return "Inloggen bij Studio is niet gelukt.";
  }
}
