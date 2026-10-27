import { isCentralSsoLive, isLegacyStudioLoginEnabled, isStudioPreviewLocalLoginEnabled } from "@/lib/identity/flags";
import { verifyPassword } from "@/server/auth/session";

/** Trusted Vercel project id for HomeCheff Studio. Not a client header. */
export const AUTHORIZED_STUDIO_PREVIEW_PROJECT_ID = "prj_29omEPF5Hmob1eGlRjoJNb9t3m2f";

export const PREVIEW_LOCAL_INVALID_CREDENTIALS = {
  error: "Invalid credentials.",
  code: "INVALID_CREDENTIALS",
} as const;

export type PreviewLocalUser = {
  id: string;
  email: string;
  passwordHash: string | null;
  isActive: boolean | null;
};

export type PreviewLocalCredentialDecision =
  | { kind: "invalid_input" }
  | { kind: "invalid_credentials" }
  | { kind: "inactive" }
  | { kind: "session"; userId: string; email: string };

/**
 * Platform-injected deployment identity. Request headers are intentionally unused.
 * Missing or non-preview values fail closed.
 */
export function isAuthorizedStudioPreviewDeployment(): boolean {
  const env = process.env.VERCEL_ENV?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  if (env !== "preview" || !projectId) return false;
  if (projectId === AUTHORIZED_STUDIO_PREVIEW_PROJECT_ID) return true;
  const isolated = process.env.STUDIO_ISOLATED_PREVIEW_PROJECT_ID?.trim();
  return Boolean(isolated) && isolated === projectId;
}

export function canUsePreviewLocalPasswordLogin(): boolean {
  return (
    isStudioPreviewLocalLoginEnabled() &&
    isAuthorizedStudioPreviewDeployment() &&
    !isCentralSsoLive() &&
    isLegacyStudioLoginEnabled()
  );
}

function trustedHttpsOrigin(rawHost: string | undefined): string | null {
  const host = rawHost?.trim().replace(/^https?:\/\//, "").replace(/\/$/, "") ?? "";
  if (!host || host.includes("/") || host.includes(" ") || host.includes("@")) {
    return null;
  }
  try {
    const url = new URL(`https://${host}`);
    if (url.origin !== `https://${url.host}`) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Deployment origins published by Vercel. Forwarded host headers are not consulted. */
export function trustedPreviewLoginOrigins(): string[] {
  const origins = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
    .map((host) => trustedHttpsOrigin(host))
    .filter((origin): origin is string => Boolean(origin));
  return [...new Set(origins)];
}

export function isTrustedPreviewLoginOrigin(originHeader: string | null): boolean {
  const trusted = trustedPreviewLoginOrigins();
  if (trusted.length === 0 || !originHeader?.trim()) {
    return false;
  }
  let presented: string;
  try {
    const url = new URL(originHeader.trim());
    if (url.username || url.password || url.search || url.hash) return false;
    if (url.pathname !== "/" && url.pathname !== "") return false;
    if (url.protocol !== "https:") return false;
    presented = url.origin;
  } catch {
    return false;
  }
  return trusted.includes(presented);
}

/**
 * Unknown accounts and wrong passwords share one result.
 * Inactive is reported only after the password matches.
 */
export function decidePreviewLocalCredentials(input: {
  email: string;
  password: string;
  user: PreviewLocalUser | null;
}): PreviewLocalCredentialDecision {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  if (!email || !password) {
    return { kind: "invalid_input" };
  }
  const user = input.user;
  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return { kind: "invalid_credentials" };
  }
  if (user.isActive === false) {
    return { kind: "inactive" };
  }
  return { kind: "session", userId: user.id, email: user.email };
}

export function resolveStudioLogoutScope(requestedEcosystem: boolean): "studio_only" | "ecosystem" {
  if (canUsePreviewLocalPasswordLogin()) {
    return "studio_only";
  }
  return requestedEcosystem ? "ecosystem" : "studio_only";
}

export function studioLogoutResponse(
  scope: "studio_only" | "ecosystem",
  identityOrigin: string,
): { ok: true; scope: "studio_only" | "ecosystem"; idpLogoutUrl?: string } {
  if (scope === "studio_only") {
    return { ok: true, scope: "studio_only" };
  }
  return {
    ok: true,
    scope: "ecosystem",
    idpLogoutUrl: `${identityOrigin.replace(/\/$/, "")}/api/auth/ecosystem-logout`,
  };
}
