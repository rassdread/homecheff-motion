/** Client-safe logout scope check. Does not read environment variables. */
export function isStudioOnlyLogoutScope(scope: unknown): boolean {
  return scope === "studio_only";
}
