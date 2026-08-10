/**
 * SP.2B.1 — HomeCheff Identity origin helpers (presentation / deep links only).
 * Does not own OAuth or credential validation.
 */

export function homecheffIdentityOriginFromEnv(): string {
  const o = process.env.HOMECHEFF_IDENTITY_ORIGIN?.trim();
  if (o) return o.replace(/\/$/, "");
  return "https://homecheff.eu";
}

export function studioPublicOriginFromEnv(): string {
  const o =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_STUDIO_URL?.trim() ||
    process.env.PUBLIC_BASE_URL?.trim();
  if (o) return o.replace(/\/$/, "");
  return "http://localhost:3000";
}

/** Absolute Studio SSO start URL (used as IdP callback after register). */
export function studioSsoStartAbsoluteHref(returnTo?: string): string {
  const url = new URL("/auth/sso/start", `${studioPublicOriginFromEnv()}/`);
  if (returnTo && returnTo !== "/") {
    url.searchParams.set("returnTo", returnTo);
  }
  return url.toString();
}

/** Forgot-password on the IdP (single password reset). */
export function homecheffForgotPasswordHref(returnToStudioLogin?: string): string {
  const base = `${homecheffIdentityOriginFromEnv()}/forgot-password`;
  // HC does not yet honor returnTo on forgot-password — link is IdP-canonical.
  void returnToStudioLogin;
  return base;
}

/** Register on the IdP, then resume SSO into Studio. */
export function homecheffRegisterHref(callbackToSsoStartAbsolute: string): string {
  const origin = homecheffIdentityOriginFromEnv();
  const url = new URL("/register", `${origin}/`);
  url.searchParams.set("callbackUrl", callbackToSsoStartAbsolute);
  return url.toString();
}

export function homecheffRegisterHrefForStudio(returnTo?: string): string {
  return homecheffRegisterHref(studioSsoStartAbsoluteHref(returnTo));
}
