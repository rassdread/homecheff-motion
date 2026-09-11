/**
 * Studio primary home (exact `/studio`) — hide competing Copilot side panel.
 * Nested Studio routes keep Help/Copilot.
 */

import { normalizeAssistantRoutePathname } from "@/lib/homecheff-assistant-flag";

/** True when the pathname is the AI-first Studio home only. */
export function isStudioPrimaryHomePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return normalizeAssistantRoutePathname(pathname) === "/studio";
}
