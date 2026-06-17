import {
  LEGACY_MOTION_ORIGIN,
  OFFICIAL_STUDIO_ORIGIN,
  resolvePublicOriginFromEnv,
} from "@/lib/public-origin";

/** Origins allowed to call JSON API routes with cookies (CORS preflight). */
export function getAllowedApiOrigins(): string[] {
  const fromEnv = [
    resolvePublicOriginFromEnv(),
    process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL.replace(/^https?:\/\//, "")}`
      : null,
  ]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim().replace(/\/$/, ""));

  const defaults = [
    OFFICIAL_STUDIO_ORIGIN,
    LEGACY_MOTION_ORIGIN,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];

  return [...new Set([...defaults, ...fromEnv])];
}

export function isAllowedApiOrigin(origin: string | null): origin is string {
  if (!origin) {
    return false;
  }
  const normalized = origin.replace(/\/$/, "");
  return getAllowedApiOrigins().some((allowed) => allowed === normalized);
}
