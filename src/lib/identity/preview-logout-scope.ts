/** Client-safe logout scope check. Does not read environment variables. */
export function isStudioOnlyLogoutScope(scope: unknown): boolean {
  return scope === "studio_only";
}

/** Production identity logout. Used only when the server says this deployment is not Preview-isolated. */
export const PRODUCTION_IDENTITY_LOGOUT_URL = "https://homecheff.eu/api/auth/ecosystem-logout";

export type ClientLogoutAttempt = {
  outcome: "network_failure" | "http_failure" | "success";
  scope?: unknown;
  idpLogoutUrl?: unknown;
};

/**
 * Whether the browser may call the production identity logout.
 * `previewLogoutIsolated` is computed on the server from deployment configuration.
 * A failed Studio logout must not fall through to production when that value is true.
 */
export function resolveClientIdentityLogout(input: {
  previewLogoutIsolated: boolean;
  attempt: ClientLogoutAttempt;
}): { callProduction: false; url: null } | { callProduction: true; url: string } {
  if (input.previewLogoutIsolated) {
    return { callProduction: false, url: null };
  }
  if (input.attempt.outcome !== "network_failure" && isStudioOnlyLogoutScope(input.attempt.scope)) {
    return { callProduction: false, url: null };
  }
  const idp = input.attempt.idpLogoutUrl;
  const url =
    input.attempt.outcome !== "network_failure" &&
    typeof idp === "string" &&
    idp.startsWith("https://")
      ? idp
      : PRODUCTION_IDENTITY_LOGOUT_URL;
  return { callProduction: true, url };
}
