/** Client-visible debug panels (admin tools, playback traces). */
export function isPublicDebugUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_DEBUG_UI === "true";
}

export function shouldShowLanguageExportAdminDebug(
  isAdmin: boolean,
  adminDebugExpanded: boolean
): boolean {
  return isPublicDebugUiEnabled() || (isAdmin && adminDebugExpanded);
}
