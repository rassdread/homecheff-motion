/**
 * Studio Director Panel V2 — enabled by default.
 * Set NEXT_PUBLIC_STUDIO_DIRECTOR_V2=false to roll back to the classic scene composer.
 */
export function isStudioDirectorV2Enabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_STUDIO_DIRECTOR_V2?.trim().toLowerCase();
  if (raw === "false" || raw === "0") {
    return false;
  }
  return true;
}
