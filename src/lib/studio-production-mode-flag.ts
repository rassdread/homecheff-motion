/**
 * Production Mode — simplified Motion Studio navigation and surfaces.
 * Set NEXT_PUBLIC_PRODUCTION_MODE=false to show all legacy/advanced links.
 */
export function isStudioProductionModeEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_PRODUCTION_MODE?.trim().toLowerCase();
  if (raw === "false" || raw === "0") {
    return false;
  }
  return true;
}
