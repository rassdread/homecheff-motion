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

export function studioSsoErrorMessage(code: StudioSsoErrorCode): string {
  switch (code) {
    case "SSO_DISABLED":
      return "HomeCheff sign-in is not available right now.";
    case "SSO_INVALID":
      return "We couldn't complete your Studio login.";
    case "SSO_EXPIRED":
      return "The sign-in request expired. Please try again.";
    case "SSO_USED":
      return "This sign-in link was already used.";
    case "SSO_STATE_REJECTED":
      return "The sign-in request was invalid or expired.";
    case "IDENTITY_NOT_LINKED":
      return "We couldn't find a Studio account linked to this HomeCheff account.";
    case "IDENTITY_MAPPING_CONFLICT":
      return "We couldn't complete your Studio login.";
    case "IDENTITY_EMAIL_COLLISION":
      return "This email is already used by another Studio account. Contact support to link HomeCheff.";
    case "CLAIM_UNAUTHORIZED":
      return "Sign in to your existing Studio account first, then link HomeCheff.";
    case "CLAIM_ALREADY_LINKED":
      return "This Studio account is already linked to a different HomeCheff identity.";
    case "CENTRAL_ACCOUNT_DISABLED":
      return "This HomeCheff account cannot sign in to Studio.";
    case "RETRY_LATER":
      return "Too many attempts. Please try again later.";
    case "CONFIG_ERROR":
      return "Sign-in is temporarily unavailable.";
    case "EXCHANGE_FAILED":
      return "We couldn't complete your Studio login.";
    default:
      return "We couldn't complete your Studio login.";
  }
}
