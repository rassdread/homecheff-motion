/**
 * P0 cookie containment — Studio product cookie is unique and host-only.
 * Never write `hc_session` with Domain=.homecheff.eu again.
 */
export const AUTH_COOKIE_NAMES = {
  studio: "studio_session",
  /** Legacy shared name (Growth JWT / Studio HMAC). Dual-read Studio HMAC only. */
  legacy: "hc_session",
} as const;

export const LEGACY_SHARED_COOKIE_DOMAIN = ".homecheff.eu";
