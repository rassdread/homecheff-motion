/**
 * Canonical Studio home is both `/` and `/studio`.
 * Nested routes keep the project assistant.
 */

import { normalizeAssistantRoutePathname } from "@/lib/homecheff-assistant-flag";

/** True on the shared AI-first Studio homepage, not inside a project or editor. */
export function isStudioCanonicalHomePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = normalizeAssistantRoutePathname(pathname);
  return path === "/" || path === "/studio";
}

/** True when the pathname is the AI-first Studio home only. */
export function isStudioPrimaryHomePath(pathname: string | null | undefined): boolean {
  return isStudioCanonicalHomePath(pathname);
}
