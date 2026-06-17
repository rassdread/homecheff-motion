/** Canonical public Studio origin (no trailing slash). */
export const OFFICIAL_STUDIO_ORIGIN = "https://studio.homecheff.eu";

/** Legacy Motion hostname — kept for CORS during domain transition. */
export const LEGACY_MOTION_ORIGIN = "https://motion.homecheff.eu";

export function resolvePublicOriginFromEnv(): string | null {
  for (const key of [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_STUDIO_URL",
    "PUBLIC_BASE_URL",
  ] as const) {
    const value = process.env[key]?.trim().replace(/\/$/, "");
    if (value) {
      return value;
    }
  }
  return null;
}

/** Public site origin for invite links, checkout return URLs, and SEO (no trailing slash). */
export function getPublicOrigin(): string {
  const fromEnv = resolvePublicOriginFromEnv();
  if (fromEnv) {
    return fromEnv;
  }
  const vercel = process.env.VERCEL_URL?.trim().replace(/\/$/, "");
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }
  return "http://localhost:3000";
}

/** Production canonical origin when env is unset (sitemap, metadata fallbacks). */
export function getCanonicalStudioOrigin(): string {
  return resolvePublicOriginFromEnv() ?? OFFICIAL_STUDIO_ORIGIN;
}

export function studioOriginHostname(): string {
  return new URL(OFFICIAL_STUDIO_ORIGIN).hostname;
}
