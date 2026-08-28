/**
 * Free Music kill switches — ALL default OFF.
 *
 * PUBLIC: STUDIO_FREE_MUSIC_CATALOG_ENABLED
 * PILOT:  STUDIO_FREE_MUSIC_PILOT_ENABLED + STUDIO_FREE_MUSIC_PILOT_USER_IDS
 *
 * Desired Production safety:
 *   public OFF + pilot ON + named allowlist
 * OR
 *   everything OFF
 */

function envBool(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return defaultValue;
  const v = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return defaultValue;
}

export function isStudioFreeMusicCatalogEnabled(): boolean {
  return envBool("STUDIO_FREE_MUSIC_CATALOG_ENABLED", false);
}

export function isStudioFreeMusicPilotEnabled(): boolean {
  return envBool("STUDIO_FREE_MUSIC_PILOT_ENABLED", false);
}

export function getStudioFreeMusicPilotUserIds(): string[] {
  const raw = process.env.STUDIO_FREE_MUSIC_PILOT_USER_IDS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Catalog visible to a user when:
 * - public flag ON, or
 * - pilot flag ON and userId is in the allowlist (allowlist required for pilot).
 */
export function isStudioFreeMusicCatalogEnabledForUser(userId: string | null | undefined): boolean {
  if (isStudioFreeMusicCatalogEnabled()) return true;
  if (!isStudioFreeMusicPilotEnabled()) return false;
  const pilot = getStudioFreeMusicPilotUserIds();
  if (pilot.length === 0 || !userId) return false;
  return pilot.includes(userId);
}

/** Alias used in Phase 3 docs. */
export function isStudioFreeMusicAvailableForUser(userId: string | null | undefined): boolean {
  return isStudioFreeMusicCatalogEnabledForUser(userId);
}
